/**
 * Boots the real server with no API keys and a throwaway data folder, then
 * exercises every route that needs neither a model nor a sandbox.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const serverEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.js');
const port = 3900 + Math.floor(Math.random() * 90);
const base = `http://127.0.0.1:${port}`;

let child;
let dataDir;

async function call(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json };
}

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'va-api-'));
  const env = { ...process.env, PORT: String(port), DATA_DIR: dataDir, REGISTRY_DIR: path.join(dataDir, 'registry') };
  // Point env loading at a file that does not exist so no real keys are read.
  env.DOTENV_CONFIG_PATH = path.join(dataDir, 'none.env');
  for (const key of ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'E2B_API_KEY', 'GITHUB_PUBLISH_CLIENT_ID', 'GITHUB_PUBLISH_CLIENT_SECRET']) {
    delete env[key];
  }

  child = spawn(process.execPath, [serverEntry], { env, stdio: 'ignore' });

  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch { /* not listening yet */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Server did not start');
}, 30000);

afterAll(async () => {
  child?.kill();
  await new Promise((resolve) => setTimeout(resolve, 200));
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('API without keys', () => {
  it('reports health', async () => {
    const res = await call('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.json.status).toBe('ok');
  });

  it('creates, updates, lists, renames and deletes a project', async () => {
    const id = 'api-test-project';

    let res = await call('POST', '/api/projects/init', { prompt: 'A bakery landing page', buildId: id });
    expect(res.json).toMatchObject({ success: true, projectId: id });

    res = await call('POST', '/api/projects/init', { prompt: 'second call', buildId: id });
    expect(res.json.message).toBe('Project already exists.');

    // A project is hidden from the list until its first build is saved.
    res = await call('GET', '/api/projects');
    expect(res.json.projects).toEqual([]);

    res = await call('POST', '/api/projects/update', {
      buildId: id,
      updates: { build_status: 'completed', is_committed: true, user_id: 'someone-else' },
    });
    expect(res.json.success).toBe(true);

    res = await call('GET', `/api/projects/get?projectId=${id}`);
    expect(res.json.project).toMatchObject({ build_status: 'completed', user_id: 'local-user' });

    res = await call('PATCH', `/api/projects/${id}`, { name: 'Bakery' });
    expect(res.json.success).toBe(true);

    res = await call('GET', '/api/projects');
    expect(res.json.projects).toHaveLength(1);
    expect(res.json.projects[0].name).toBe('Bakery');

    res = await call('DELETE', `/api/projects/${id}`);
    expect(res.json.success).toBe(true);

    res = await call('GET', `/api/projects/get?projectId=${id}`);
    expect(res.status).toBe(404);
  });

  it('stores snapshots and refuses empty ones', async () => {
    const id = 'api-test-snapshots';
    await call('POST', '/api/projects/init', { prompt: 'Snapshots', buildId: id });

    let res = await call('POST', '/api/snapshots', { projectId: id, chatIndex: 1, text: 'empty', files: {} });
    expect(res.json.skipped).toBe(true);

    res = await call('POST', '/api/snapshots', {
      projectId: id, chatIndex: 1, text: 'first build', files: { 'src/App.jsx': 'export default () => null' },
    });
    expect(res.json).toEqual({ success: true });

    res = await call('GET', `/api/snapshots?projectId=${id}`);
    expect(res.json.snapshots).toHaveLength(1);

    res = await call('GET', `/api/projects/get?projectId=${id}`);
    expect(res.json.latestSnapshot.files['src/App.jsx']).toContain('export default');

    res = await call('GET', '/api/snapshots?projectId=unknown-project');
    expect(res.status).toBe(404);
  });

  it('serves an empty registry without errors', async () => {
    let res = await call('GET', '/api/component-catalog');
    expect(res.status).toBe(200);
    expect(res.json.components).toEqual([]);

    res = await call('GET', '/api/build-template?list=true');
    expect(res.json).toMatchObject({ success: true, templates: [] });
  });

  it('answers agent session history for a project with no turns', async () => {
    const res = await call('GET', '/api/agent/session?projectId=api-test-snapshots&hydrate=1');
    expect(res.status).toBe(200);
  });

  it('validates imports', async () => {
    const res = await call('POST', '/api/validate-imports', {
      files: [{ path: 'src/App.jsx', content: "import Ghost from './Ghost'" }],
    });
    expect(res.json.valid).toBe(false);
    expect(res.json.issues[0].kind).toBe('missing_local_import');
  });

  it('says clearly when GitHub publishing is not configured', async () => {
    const res = await call('GET', '/api/integrations/github/status');
    expect(res.status).toBe(503);
  });

  it('fails a build request cleanly when there is no sandbox', async () => {
    const res = await call('POST', '/api/agent/message', { prompt: 'Make the hero blue', sandboxId: 'missing' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.json.success).toBe(false);
  });
});
