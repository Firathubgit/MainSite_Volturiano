import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
export const webRoot = path.resolve(path.dirname(__filename), '..', '..');
export const workspaceRoot = path.resolve(webRoot, '..');

export function readWeb(relativePath: string) {
  return fs.readFileSync(path.join(webRoot, relativePath), 'utf8');
}

export function readWorkspace(relativePath: string) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

export function expectContains(source: string, needle: string, label = needle) {
  expect(source, `missing ${label}`).toContain(needle);
}

export function expectNotContains(source: string, needle: string, label = needle) {
  expect(source, `unexpected ${label}`).not.toContain(needle);
}

export function expectMatches(source: string, pattern: RegExp, label = pattern.toString()) {
  expect(pattern.test(source), `missing pattern ${label}`).toBe(true);
}
