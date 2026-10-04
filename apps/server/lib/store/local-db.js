/**
 * A small JSON-file table store with a chainable query builder.
 *
 * Each table is one JSON file holding an array of rows. Rows are kept in
 * memory and written back shortly after a change. The query builder covers
 * the subset the server needs (filters, ordering, limits, insert, update,
 * upsert, delete) and resolves to `{ data, error }` so callers handle
 * failures without try/catch. That shape matches the Postgres client
 * libraries many projects use, which keeps a later swap to a real database
 * mostly mechanical.
 *
 * This is single-process storage for one local user. It is not a database:
 * there are no transactions and no concurrent writers.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const WRITE_DELAY_MS = 120;

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function pick(row, columns) {
  if (!columns || columns === '*') return clone(row);
  const out = {};
  for (const column of columns) out[column] = clone(row[column]);
  return out;
}

function parseColumns(columns) {
  if (!columns || typeof columns !== 'string') return '*';
  const trimmed = columns.trim();
  if (trimmed === '*' || trimmed.includes('(')) return '*';
  return trimmed.split(',').map((c) => c.trim()).filter(Boolean);
}

function compare(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  return a < b ? -1 : 1;
}

class Table {
  constructor(file) {
    this.file = file;
    this.rows = null;
    this.timer = null;
    this.dirty = false;
  }

  load() {
    if (this.rows) return this.rows;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.rows = [];
    }
    return this.rows;
  }

  touch() {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), WRITE_DELAY_MS);
    this.timer.unref?.();
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty || !this.rows) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.rows));
    fs.renameSync(tmp, this.file);
    this.dirty = false;
  }
}

class Query {
  constructor(table) {
    this.table = table;
    this.operation = 'select';
    this.columns = '*';
    this.filters = [];
    this.ordering = [];
    this.maxRows = null;
    this.offset = 0;
    this.payload = null;
    this.conflictColumn = 'id';
    this.returnRows = true;
    this.expect = 'many';
  }

  select(columns = '*') {
    this.columns = parseColumns(columns);
    this.returnRows = true;
    return this;
  }

  insert(rows) {
    this.operation = 'insert';
    this.payload = rows;
    this.returnRows = false;
    return this;
  }

  update(patch) {
    this.operation = 'update';
    this.payload = patch;
    this.returnRows = false;
    return this;
  }

  upsert(rows, { onConflict = 'id' } = {}) {
    this.operation = 'upsert';
    this.payload = rows;
    this.conflictColumn = onConflict;
    this.returnRows = false;
    return this;
  }

  delete() {
    this.operation = 'delete';
    this.returnRows = false;
    return this;
  }

  eq(column, value) { return this.where((row) => row[column] === value); }
  neq(column, value) { return this.where((row) => row[column] !== value); }
  in(column, values) {
    const set = new Set(values || []);
    return this.where((row) => set.has(row[column]));
  }
  is(column, value) { return this.where((row) => (row[column] ?? null) === value); }
  gt(column, value) { return this.where((row) => compare(row[column], value) > 0); }
  gte(column, value) { return this.where((row) => compare(row[column], value) >= 0); }
  lt(column, value) { return this.where((row) => compare(row[column], value) < 0); }
  lte(column, value) { return this.where((row) => compare(row[column], value) <= 0); }

  where(predicate) {
    this.filters.push(predicate);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.ordering.push({ column, ascending });
    return this;
  }

  limit(count) {
    this.maxRows = count;
    return this;
  }

  range(from, to) {
    this.offset = from;
    this.maxRows = to - from + 1;
    return this;
  }

  single() {
    this.expect = 'one';
    return this;
  }

  maybeSingle() {
    this.expect = 'maybe';
    return this;
  }

  then(resolve, reject) {
    let result;
    try {
      result = this.run();
    } catch (error) {
      result = { data: null, error: { message: error?.message || String(error), code: 'STORE_ERROR' } };
    }
    return Promise.resolve(result).then(resolve, reject);
  }

  matches(row) {
    return this.filters.every((predicate) => predicate(row));
  }

  run() {
    const rows = this.table.load();
    let affected;

    if (this.operation === 'insert') {
      affected = this.asArray(this.payload).map((input) => this.insertRow(rows, input));
      this.table.touch();
    } else if (this.operation === 'upsert') {
      affected = this.asArray(this.payload).map((input) => {
        const key = input?.[this.conflictColumn];
        const existing = key === undefined ? null : rows.find((row) => row[this.conflictColumn] === key);
        if (!existing) return this.insertRow(rows, input);
        Object.assign(existing, clone(input));
        return existing;
      });
      this.table.touch();
    } else if (this.operation === 'update') {
      affected = rows.filter((row) => this.matches(row));
      for (const row of affected) Object.assign(row, clone(this.payload));
      if (affected.length) this.table.touch();
    } else if (this.operation === 'delete') {
      affected = rows.filter((row) => this.matches(row));
      if (affected.length) {
        const doomed = new Set(affected);
        this.table.rows = rows.filter((row) => !doomed.has(row));
        this.table.touch();
      }
    } else {
      affected = rows.filter((row) => this.matches(row));
      for (const { column, ascending } of [...this.ordering].reverse()) {
        affected = affected
          .map((row, index) => ({ row, index }))
          .sort((a, b) => (compare(a.row[column], b.row[column]) * (ascending ? 1 : -1)) || a.index - b.index)
          .map((entry) => entry.row);
      }
      if (this.offset) affected = affected.slice(this.offset);
      if (this.maxRows !== null) affected = affected.slice(0, this.maxRows);
    }

    if (!this.returnRows) return { data: null, error: null };

    const data = affected.map((row) => pick(row, this.columns));
    if (this.expect === 'many') return { data, error: null };
    if (data.length === 1) return { data: data[0], error: null };
    if (data.length === 0 && this.expect === 'maybe') return { data: null, error: null };
    return {
      data: null,
      error: { message: `Expected one row, found ${data.length}`, code: 'ROW_COUNT_MISMATCH' },
    };
  }

  asArray(value) {
    return Array.isArray(value) ? value : [value];
  }

  insertRow(rows, input) {
    const now = new Date().toISOString();
    const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...clone(input) };
    if (row.id === undefined || row.id === null) row.id = crypto.randomUUID();
    rows.push(row);
    return row;
  }
}

/**
 * Open (or create) a store in `dir`. Tables are created on first use.
 */
export function createLocalDb(dir) {
  const tables = new Map();

  const tableFor = (name) => {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error(`Invalid table name: ${name}`);
    if (!tables.has(name)) tables.set(name, new Table(path.join(dir, `${name}.json`)));
    return tables.get(name);
  };

  const db = {
    from: (name) => new Query(tableFor(name)),
    /** Write every pending change to disk now. */
    flush: () => {
      for (const table of tables.values()) table.flush();
    },
  };

  process.once('exit', () => db.flush());
  return db;
}
