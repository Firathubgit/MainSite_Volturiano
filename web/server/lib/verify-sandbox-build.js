import { sandboxManager } from './sandbox/sandbox-manager.js';

const MAX_LOG_CHARS = 15000;
const PREVIEW_HEALTH_URL = 'http://127.0.0.1:5173';

/**
 * Verifies the build in the sandbox through a staged pipeline.
 *
 * Public compatibility is intentionally preserved:
 * callers can keep relying on { success, logs, exitCode } exactly as before.
 * Richer stage details are added for the agent harness, memory, and debug UI.
 *
 * @param {string} sandboxId - The ID of the sandbox to verify.
 * @returns {Promise<{success: boolean, logs: string, exitCode: number, stages: Array}>}
 */
export async function verifySandboxBuild(sandboxId) {
  console.log(`[verify-build] Checking build for sandbox ${sandboxId}...`);

  const stages = [];
  let provider = null;

  try {
    provider = await resolveProvider(sandboxId, stages);
    if (!provider) {
      return buildVerificationResult({
        stages,
        success: false,
        exitCode: -1,
        summary: 'Sandbox provider unavailable.'
      });
    }

    await runCommandStage(stages, provider, {
      name: 'prepare_workspace',
      label: 'Prepare workspace permissions',
      command: 'sudo chown -R user:user /home/user/app || true',
      required: false
    });

    await runCommandStage(stages, provider, {
      name: 'dependency_probe',
      label: 'Probe project dependencies',
      command: `node -e "const fs=require('fs'); console.log(JSON.stringify({packageJson:fs.existsSync('package.json'),nodeModules:fs.existsSync('node_modules'),src:fs.existsSync('src')}))"`,
      required: false
    });

    console.log('[verify-build] Starting Vite build...');
    const buildStage = await runCommandStage(stages, provider, {
      name: 'vite_build',
      label: 'Run Vite production build',
      command: 'npx vite build --base=./',
      required: true
    });

    if (!buildStage.success) {
      console.warn('[verify-build] Build failed. Running diagnostics...');
      await runCommandStage(stages, provider, {
        name: 'diagnostics_files',
        label: 'Collect file diagnostics',
        command: 'ls -la',
        required: false
      });
      await runCommandStage(stages, provider, {
        name: 'diagnostics_dependencies',
        label: 'Collect dependency diagnostics',
        command: 'npm list --depth=0',
        required: false
      });
    } else {
      await runPreviewHealthStage(stages, provider);
    }

    console.log(`[verify-build] Build finished with exit code: ${buildStage.exitCode}`);

    return buildVerificationResult({
      stages,
      success: buildStage.success,
      exitCode: buildStage.exitCode,
      summary: buildStage.success ? 'Vite build passed.' : 'Vite build failed.'
    });
  } catch (error) {
    console.error('[verify-build] Execution error in provider:', error);
    stages.push(makeStage({
      name: 'verification_error',
      label: 'Verification runtime error',
      success: false,
      error: error.message || String(error)
    }));

    return buildVerificationResult({
      stages,
      success: false,
      exitCode: 1,
      summary: `Execution error: ${error.message || String(error)}`
    });
  }
}

async function resolveProvider(sandboxId, stages) {
  const startedAt = Date.now();
  let provider = sandboxId ? sandboxManager.getProvider(sandboxId) : sandboxManager.getActiveProvider();
  let reconnected = false;

  if (!provider && sandboxId) {
    try {
      provider = await sandboxManager.getOrCreateProvider(sandboxId);
      reconnected = Boolean(provider?.sandbox);
    } catch (error) {
      stages.push(makeStage({
        name: 'resolve_provider',
        label: 'Resolve sandbox provider',
        success: false,
        durationMs: Date.now() - startedAt,
        error: error.message || String(error)
      }));
      return null;
    }
  }

  const success = Boolean(provider);
  stages.push(makeStage({
    name: 'resolve_provider',
    label: 'Resolve sandbox provider',
    success,
    durationMs: Date.now() - startedAt,
    details: {
      sandboxId: sandboxId || null,
      reconnected
    },
    error: success ? null : `Sandbox session for ${sandboxId} not found in manager. Reconnection may be required.`
  }));

  return provider;
}

async function runCommandStage(stages, provider, { name, label, command, required = true }) {
  const startedAt = Date.now();
  try {
    const rawResult = await provider.runCommand(command);
    const result = normalizeCommandResult(rawResult);
    const stage = makeStage({
      name,
      label,
      success: result.success,
      required,
      command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: Date.now() - startedAt
    });
    stages.push(stage);
    return stage;
  } catch (error) {
    const stage = makeStage({
      name,
      label,
      success: false,
      required,
      command,
      exitCode: 1,
      stderr: error.message || String(error),
      durationMs: Date.now() - startedAt,
      error: error.message || String(error)
    });
    stages.push(stage);
    return stage;
  }
}

async function runPreviewHealthStage(stages, provider) {
  const healthScript = [
    'node -e "',
    `const url='${PREVIEW_HEALTH_URL}';`,
    'const timeout=AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined;',
    'fetch(url,{signal:timeout}).then(async r=>{',
    'const text=await r.text();',
    'console.log(JSON.stringify({url,status:r.status,ok:r.ok,bytes:text.length}));',
    'process.exit(r.ok?0:1);',
    '}).catch(e=>{console.error(e.message); process.exit(1);});',
    '"'
  ].join('');

  return runCommandStage(stages, provider, {
    name: 'preview_health',
    label: 'Check local preview health',
    command: healthScript,
    required: false
  });
}

function normalizeCommandResult(result = {}) {
  const exitCode = Number.isInteger(result.exitCode) ? result.exitCode : (result.success === false ? 1 : 0);
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode,
    success: typeof result.success === 'boolean' ? result.success : exitCode === 0
  };
}

function makeStage({
  name,
  label,
  success,
  required = true,
  skipped = false,
  command = null,
  exitCode = null,
  stdout = '',
  stderr = '',
  durationMs = null,
  details = null,
  error = null
}) {
  return {
    name,
    label,
    success: Boolean(success),
    required: Boolean(required),
    skipped: Boolean(skipped),
    command,
    exitCode,
    stdout: truncate(stdout, 4000),
    stderr: truncate(stderr, 4000),
    durationMs,
    details,
    error
  };
}

function buildVerificationResult({ stages, success, exitCode, summary }) {
  const logs = buildLogs(stages, summary);
  const previewStage = stages.find((stage) => stage.name === 'preview_health');
  const buildStage = stages.find((stage) => stage.name === 'vite_build');

  return {
    success: Boolean(success),
    logs: truncate(logs, MAX_LOG_CHARS),
    exitCode: Number.isInteger(exitCode) ? exitCode : (success ? 0 : 1),
    summary,
    buildPassed: Boolean(buildStage?.success),
    previewHealthy: previewStage ? Boolean(previewStage.success) : null,
    stages: stages.map(toPublicStage),
    verifiedAt: new Date().toISOString()
  };
}

function buildLogs(stages, summary) {
  const parts = [
    summary,
    '',
    '--- VERIFICATION STAGES ---'
  ];

  for (const stage of stages) {
    parts.push(`[${stage.success ? 'PASS' : stage.required ? 'FAIL' : 'WARN'}] ${stage.name}${stage.exitCode !== null ? ` (exit ${stage.exitCode})` : ''}`);
    if (stage.error) parts.push(`ERROR:\n${stage.error}`);
    if (stage.stdout) parts.push(`STDOUT:\n${stage.stdout}`);
    if (stage.stderr) parts.push(`STDERR:\n${stage.stderr}`);
  }

  return parts.filter((part) => part !== null && part !== undefined).join('\n');
}

function toPublicStage(stage) {
  return {
    name: stage.name,
    label: stage.label,
    success: stage.success,
    required: stage.required,
    skipped: stage.skipped,
    exitCode: stage.exitCode,
    durationMs: stage.durationMs,
    details: stage.details,
    error: stage.error,
    stdout: truncate(stage.stdout, 1000),
    stderr: truncate(stage.stderr, 1000)
  };
}

function truncate(value = '', maxLength = 1000) {
  const text = String(value || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 15))}\n...[truncated]`;
}
