import { SandboxFactory } from '../lib/sandbox/factory.js';
import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';

/**
 * Sandbox creation has a real cold-start tax: the FIRST E2B call from a fresh
 * Node process pays TLS handshake, auth, and provider provisioning latency,
 * which makes a single-shot create() flaky (~20% reported failure on first try).
 * Subsequent calls in the same process are warm and reliable.
 *
 * Root-cause-aligned fix: keep the route deterministic, but transparently retry
 * a small number of times for transient errors, with bounded per-attempt time.
 */
const MAX_ATTEMPTS = 3;
const PER_ATTEMPT_TIMEOUT_MS = 60_000;
const RETRY_BACKOFF_MS = [1500, 3000];

const TRANSIENT_PATTERNS = [
  /timeout/i,
  /timed out/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ECONNREFUSED/i,
  /EAI_AGAIN/i,
  /network/i,
  /fetch failed/i,
  /sandbox.*not.*ready/i,
  /503/,
  /502/,
  /429/,
  /5\d\d/,
  /rate limit/i
];

function isTransientError(err) {
  const message = err?.message || String(err || '');
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(message));
}

function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function provisionOnce(attemptIndex) {
  console.log(`[create-ai-sandbox-v2] Attempt ${attemptIndex + 1}/${MAX_ATTEMPTS}: creating sandbox...`);

  const provider = SandboxFactory.create();
  if (!provider) throw new Error('Failed to create sandbox provider from factory');

  const sandboxInfo = await withTimeout(
    provider.createSandbox(),
    PER_ATTEMPT_TIMEOUT_MS,
    'createSandbox'
  );
  if (!sandboxInfo || !sandboxInfo.sandboxId) {
    throw new Error('Provider failed to return valid sandboxInfo');
  }

  console.log('[create-ai-sandbox-v2] Setting up Vite React app...');
  await withTimeout(provider.setupViteApp(), PER_ATTEMPT_TIMEOUT_MS, 'setupViteApp');

  return { provider, sandboxInfo };
}

async function safeTeardown(provider) {
  if (!provider) return;
  try {
    if (typeof provider.terminate === 'function') {
      await provider.terminate();
    }
  } catch (e) {
    console.warn('[create-ai-sandbox-v2] Best-effort teardown failed:', e?.message || e);
  }
}

export default async function createAiSandboxV2(req, res) {
  try {
    const projectId = req.body?.projectId || null;
    const userId = req.user?.id || null;
    console.log(`[create-ai-sandbox-v2] Creating sandbox... (project: ${projectId || 'none'})`);

    // Per-project lifecycle: only replace a previous sandbox for the SAME project.
    // Never terminate other projects' sandboxes (multiple tabs/projects must coexist).
    if (projectId) {
      const previousId = sandboxManager.getSandboxIdForProject(projectId);
      if (previousId) {
        console.log(`[create-ai-sandbox-v2] Replacing previous sandbox ${previousId} for project ${projectId}`);
        try {
          await sandboxManager.terminateSandbox(previousId);
        } catch (e) {
          console.warn('[create-ai-sandbox-v2] Previous sandbox cleanup failed:', e?.message || e);
        }
        if (global.sandboxData?.sandboxId === previousId) {
          global.activeSandboxProvider = null;
          global.sandboxData = null;
        }
      }
    }

    if (global.existingFiles) global.existingFiles.clear();
    else global.existingFiles = new Set();

    if (!process.env.E2B_API_KEY) {
      throw new Error('E2B_API_KEY is not set in environment variables');
    }

    let lastError = null;
    let success = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        success = await provisionOnce(attempt);
        break;
      } catch (err) {
        lastError = err;
        const transient = isTransientError(err);
        console.error(
          `[create-ai-sandbox-v2] Attempt ${attempt + 1} failed${transient ? ' (transient)' : ''}:`,
          err?.message || err
        );

        // Best-effort cleanup of any half-provisioned sandbox before retrying.
        await safeTeardown(success?.provider);
        success = null;

        if (!transient || attempt === MAX_ATTEMPTS - 1) {
          throw err;
        }
        const wait = RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
        console.log(`[create-ai-sandbox-v2] Retrying in ${wait}ms...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }

    if (!success) throw lastError || new Error('Failed to provision sandbox');

    const { provider, sandboxInfo } = success;

    sandboxManager.registerSandbox(sandboxInfo.sandboxId, provider, { projectId, userId });
    try {
      await sandboxManager.enforceUserCap(userId, 3);
    } catch (e) {
      console.warn('[create-ai-sandbox-v2] User cap enforcement failed:', e?.message || e);
    }
    global.activeSandboxProvider = provider;
    global.sandboxData = { sandboxId: sandboxInfo.sandboxId, url: sandboxInfo.url };

    global.sandboxState = {
      fileCache: { files: {}, lastSync: Date.now(), sandboxId: sandboxInfo.sandboxId },
      sandbox: provider,
      sandboxData: { sandboxId: sandboxInfo.sandboxId, url: sandboxInfo.url }
    };

    console.log('[create-ai-sandbox-v2] Sandbox ready at:', sandboxInfo.url);

    res.json({
      success: true,
      sandboxId: sandboxInfo.sandboxId,
      url: sandboxInfo.url,
      provider: sandboxInfo.provider,
      message: 'Sandbox created and Vite React app initialized'
    });
  } catch (error) {
    console.error('[create-ai-sandbox-v2] FATAL Error:', error?.message || error);
    if (error?.stack) console.error(error.stack);

    res.status(500).json({
      success: false,
      error: error?.message || 'Sandbox provisioning failed',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      hint: 'Sandbox provisioning is retried automatically. Try once more — the next attempt is usually faster as the connection is warm.'
    });
  }
}
