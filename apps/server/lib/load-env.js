/**
 * Load environment variables before anything else reads them.
 *
 * One `.env` at the repo root configures the whole project. A `.env` next to
 * the server is read as well. Variables already set in the shell win.
 * Set DOTENV_CONFIG_PATH to load one specific file instead.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const candidates = process.env.DOTENV_CONFIG_PATH
  ? [process.env.DOTENV_CONFIG_PATH]
  : [path.resolve(serverRoot, '../../.env'), path.resolve(serverRoot, '.env')];

for (const file of candidates) {
  dotenv.config({ path: file, quiet: true });
}
