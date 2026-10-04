import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLocalDb } from '../lib/store/local-db.js';
import { createProjectAccessGuards } from '../lib/security/project-access.js';

let dir;
let assertProjectOwner;

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'va-access-'));
  const db = createLocalDb(dir);
  await db.from('projects').insert([
    { id: 'mine', user_id: 'user-a', name: 'Mine' },
    { id: 'theirs', user_id: 'user-b', name: 'Theirs' },
  ]);
  ({ assertProjectOwner } = createProjectAccessGuards(db));
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('project access guard', () => {
  it('returns the project for its owner', async () => {
    await expect(assertProjectOwner('mine', 'user-a')).resolves.toMatchObject({ id: 'mine', name: 'Mine' });
  });

  it('blocks a project owned by someone else', async () => {
    await expect(assertProjectOwner('theirs', 'user-a')).rejects.toMatchObject({ status: 403, code: 'PROJECT_ACCESS_DENIED' });
  });

  it('answers 404 for an unknown project', async () => {
    await expect(assertProjectOwner('missing', 'user-a')).rejects.toMatchObject({ status: 404 });
  });

  it('requires a user and a project id', async () => {
    await expect(assertProjectOwner('mine', null)).rejects.toMatchObject({ status: 401 });
    await expect(assertProjectOwner('', 'user-a')).rejects.toMatchObject({ status: 400 });
  });
});
