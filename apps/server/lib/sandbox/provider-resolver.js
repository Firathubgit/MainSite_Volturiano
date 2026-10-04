import { sandboxManager } from './sandbox-manager.js';

export const SANDBOX_RESOLUTION_CODES = Object.freeze({
  MISSING: 'SANDBOX_MISSING',
  NOT_READY: 'SANDBOX_NOT_READY',
  ID_MISMATCH: 'SANDBOX_ID_MISMATCH'
});

export class SandboxResolutionError extends Error {
  constructor(code, message, metadata = {}) {
    super(message);
    this.name = 'SandboxResolutionError';
    this.code = code;
    this.statusCode = metadata.statusCode || 409;
    this.metadata = metadata;
  }
}

export function getProviderCapabilities(provider = null) {
  const declared = typeof provider?.getCapabilities === 'function'
    ? provider.getCapabilities()
    : {};

  return {
    fileRead: declared.fileRead ?? typeof provider?.readFile === 'function',
    fileWrite: declared.fileWrite ?? typeof provider?.writeFile === 'function',
    command: declared.command ?? typeof provider?.runCommand === 'function',
    packageInstall: declared.packageInstall ?? typeof provider?.installPackages === 'function',
    appReset: declared.appReset ?? typeof provider?.setupViteApp === 'function',
    viteRestart: declared.viteRestart ?? typeof provider?.restartViteServer === 'function',
    deleteFile: declared.deleteFile ?? typeof provider?.deleteFile === 'function',
    pathSafetyCheck: declared.pathSafetyCheck ?? typeof provider?.assertPathWithinRoot === 'function'
  };
}

function safeSandboxInfo(provider) {
  try {
    return typeof provider?.getSandboxInfo === 'function' ? provider.getSandboxInfo() : null;
  } catch {
    return null;
  }
}

function providerLooksAlive(provider) {
  if (!provider) return false;
  if (typeof provider.isAlive !== 'function') return true;
  try {
    return Boolean(provider.isAlive());
  } catch {
    return false;
  }
}

function globalProviderMatches(sandboxId) {
  if (!sandboxId) return null;
  return global.sandboxData?.sandboxId === sandboxId ? global.activeSandboxProvider : null;
}

/**
 * Agentic builder sandbox identity gate.
 *
 * Every website-building turn must resolve to exactly one sandbox before tools
 * are exposed. If a caller supplies a sandboxId, this deliberately refuses to
 * fall back to an unrelated global sandbox; that keeps previews, undo state,
 * tool events, and generated files bound to the same project workspace.
 */
export async function resolveSandboxProvider({
  sandboxId = null,
  allowGlobalFallback = true,
  allowReconnect = true,
  requireAlive = true
} = {}) {
  const requestedSandboxId = typeof sandboxId === 'string' && sandboxId.trim()
    ? sandboxId.trim()
    : null;

  let provider = null;
  let resolvedBy = 'none';

  if (requestedSandboxId) {
    provider = sandboxManager.getProvider(requestedSandboxId);
    resolvedBy = provider ? 'manager' : 'none';

    if (!provider && allowReconnect) {
      provider = await sandboxManager.getOrCreateProvider(requestedSandboxId);
      resolvedBy = provider ? 'reconnect' : 'none';
    }

    if (!provider) {
      provider = globalProviderMatches(requestedSandboxId);
      resolvedBy = provider ? 'matching-global' : 'none';
    }
  } else if (allowGlobalFallback) {
    provider = sandboxManager.getActiveProvider() || global.activeSandboxProvider;
    resolvedBy = provider ? 'active' : 'none';
  }

  if (!provider) {
    return {
      ok: false,
      code: SANDBOX_RESOLUTION_CODES.MISSING,
      statusCode: 404,
      sandboxId: requestedSandboxId,
      message: requestedSandboxId
        ? `Sandbox "${requestedSandboxId}" is not available.`
        : 'No active sandbox is available.'
    };
  }

  const info = safeSandboxInfo(provider);
  const resolvedSandboxId = info?.sandboxId
    || (resolvedBy === 'matching-global' ? global.sandboxData?.sandboxId : null)
    || (!requestedSandboxId ? global.sandboxData?.sandboxId : null);

  if (requestedSandboxId && resolvedSandboxId && requestedSandboxId !== resolvedSandboxId) {
    return {
      ok: false,
      code: SANDBOX_RESOLUTION_CODES.ID_MISMATCH,
      statusCode: 409,
      sandboxId: requestedSandboxId,
      resolvedSandboxId,
      message: `Requested sandbox "${requestedSandboxId}" resolved to "${resolvedSandboxId}".`
    };
  }

  if (requireAlive && !providerLooksAlive(provider)) {
    return {
      ok: false,
      code: SANDBOX_RESOLUTION_CODES.NOT_READY,
      statusCode: 409,
      sandboxId: requestedSandboxId || resolvedSandboxId,
      message: 'Sandbox exists but is not ready for agent tool execution.'
    };
  }

  return {
    ok: true,
    provider,
    sandboxId: requestedSandboxId || resolvedSandboxId,
    info,
    resolvedBy,
    capabilities: getProviderCapabilities(provider)
  };
}

export async function requireSandboxProvider(options = {}) {
  const resolution = await resolveSandboxProvider(options);
  if (resolution.ok) return resolution;

  throw new SandboxResolutionError(
    resolution.code,
    resolution.message,
    {
      statusCode: resolution.statusCode,
      sandboxId: resolution.sandboxId,
      resolvedSandboxId: resolution.resolvedSandboxId
    }
  );
}
