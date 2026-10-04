import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocalDb } from '../lib/store/local-db.js';

let dir;
let db;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'va-db-'));
  db = createLocalDb(dir);
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('local store', () => {
  it('inserts rows with an id and timestamps', async () => {
    const { data, error } = await db.from('projects').insert({ name: 'Bakery' }).select('*').single();

    expect(error).toBeNull();
    expect(data.name).toBe('Bakery');
    expect(data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(data.created_at).getTime()).not.toBeNaN();
  });

  it('keeps a caller-provided id', async () => {
    const { data } = await db.from('projects').insert({ id: 'build-1', name: 'A' }).select('id').single();
    expect(data).toEqual({ id: 'build-1' });
  });

  it('returns nothing from a write unless select is chained', async () => {
    const { data, error } = await db.from('projects').insert({ id: 'p1' });
    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('filters, orders and limits', async () => {
    await db.from('turns').insert([
      { id: 'a', session_id: 's1', status: 'completed', created_at: '2026-01-01T00:00:00Z' },
      { id: 'b', session_id: 's1', status: 'failed', created_at: '2026-01-02T00:00:00Z' },
      { id: 'c', session_id: 's1', status: 'running', created_at: '2026-01-03T00:00:00Z' },
      { id: 'd', session_id: 's2', status: 'completed', created_at: '2026-01-04T00:00:00Z' },
    ]);

    const { data } = await db
      .from('turns')
      .select('id')
      .eq('session_id', 's1')
      .in('status', ['completed', 'failed'])
      .neq('id', 'x')
      .order('created_at', { ascending: false })
      .limit(5);

    expect(data.map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('supports range for paging past a cap', async () => {
    await db.from('undo').insert([1, 2, 3, 4, 5].map((n) => ({ id: `u${n}`, n })));
    const { data } = await db.from('undo').select('id').order('n', { ascending: false }).range(2, 10);
    expect(data.map((row) => row.id)).toEqual(['u3', 'u2', 'u1']);
  });

  it('single fails on zero rows and maybeSingle returns null', async () => {
    const strict = await db.from('projects').select('*').eq('id', 'missing').single();
    expect(strict.data).toBeNull();
    expect(strict.error.code).toBe('ROW_COUNT_MISMATCH');

    const relaxed = await db.from('projects').select('*').eq('id', 'missing').maybeSingle();
    expect(relaxed).toEqual({ data: null, error: null });
  });

  it('updates only matching rows', async () => {
    await db.from('projects').insert([{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }]);
    const { data } = await db.from('projects').update({ name: 'Renamed' }).eq('id', 'p2').select('id, name');

    expect(data).toEqual([{ id: 'p2', name: 'Renamed' }]);
    const { data: untouched } = await db.from('projects').select('name').eq('id', 'p1').single();
    expect(untouched.name).toBe('One');
  });

  it('upserts on a conflict column', async () => {
    await db.from('sessions').upsert({ session_key: 'k', model: 'a' }, { onConflict: 'session_key' });
    const { data } = await db
      .from('sessions')
      .upsert({ session_key: 'k', model: 'b' }, { onConflict: 'session_key' })
      .select('*')
      .single();

    expect(data.model).toBe('b');
    const { data: all } = await db.from('sessions').select('*');
    expect(all).toHaveLength(1);
  });

  it('deletes matching rows', async () => {
    await db.from('snapshots').insert([{ id: 's1', project_id: 'p1' }, { id: 's2', project_id: 'p2' }]);
    await db.from('snapshots').delete().eq('project_id', 'p1');
    const { data } = await db.from('snapshots').select('id');
    expect(data).toEqual([{ id: 's2' }]);
  });

  it('hands out copies, so callers cannot change stored rows by accident', async () => {
    await db.from('projects').insert({ id: 'p1', meta: { tags: ['a'] } });
    const { data } = await db.from('projects').select('*').eq('id', 'p1').single();
    data.meta.tags.push('b');

    const { data: again } = await db.from('projects').select('*').eq('id', 'p1').single();
    expect(again.meta.tags).toEqual(['a']);
  });

  it('persists to disk and reloads', async () => {
    await db.from('projects').insert({ id: 'p1', name: 'Kept' });
    db.flush();

    expect(fs.existsSync(path.join(dir, 'projects.json'))).toBe(true);
    const reopened = createLocalDb(dir);
    const { data } = await reopened.from('projects').select('name').eq('id', 'p1').single();
    expect(data.name).toBe('Kept');
  });

  it('rejects table names that could escape the data folder', () => {
    expect(() => db.from('../secrets')).toThrow(/Invalid table name/);
  });
});
