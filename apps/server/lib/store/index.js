/**
 * Local persistence for projects, snapshots, agent sessions and memory.
 *
 * Everything lives under one data directory (default `.data/` at the repo
 * root, override with DATA_DIR):
 *
 *   .data/db/<table>.json    rows, see local-db.js
 *   .data/files/<bucket>/    binary files (thumbnails, reference images)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalDb } from './local-db.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(serverRoot, '../../.data');
export const FILES_DIR = path.join(DATA_DIR, 'files');

/** The app has no login. Every row belongs to this one user. */
export const LOCAL_USER_ID = 'local-user';

export const db = createLocalDb(path.join(DATA_DIR, 'db'));

function resolveFilePath(bucket, name) {
  const target = path.resolve(FILES_DIR, bucket, name);
  if (!target.startsWith(path.resolve(FILES_DIR) + path.sep)) {
    throw new Error('File path escapes the data directory');
  }
  return target;
}

export const files = {
  /** Save a file and return the URL the web UI can load it from. */
  write(bucket, name, buffer) {
    const target = resolveFilePath(bucket, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    return `/api/files/${bucket}/${name.split(path.sep).join('/')}`;
  },

  read(bucket, name) {
    try {
      return fs.readFileSync(resolveFilePath(bucket, name));
    } catch {
      return null;
    }
  },

  /** Remove a file or a whole folder inside a bucket. */
  remove(bucket, name) {
    fs.rmSync(resolveFilePath(bucket, name), { recursive: true, force: true });
  },
};
