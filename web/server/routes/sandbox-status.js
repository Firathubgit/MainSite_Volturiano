import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';

export default async function sandboxStatus(req, res) {
  try {
    const requestedSandboxId = typeof req.query.sandboxId === 'string' ? req.query.sandboxId : null;
    // BUILDER-SECURITY: A status request for one sandbox must not fall back to
    // some other globally-active sandbox. The global bridge only applies when it
    // is the same sandbox id, and exists only until all routes are manager-owned.
    const provider = requestedSandboxId
      ? (
          sandboxManager.getProvider(requestedSandboxId)
          || (global.sandboxData?.sandboxId === requestedSandboxId ? global.activeSandboxProvider : null)
        )
      : (sandboxManager.getActiveProvider() || global.activeSandboxProvider);
    const sandboxExists = !!provider;
    let sandboxHealthy = false;
    let sandboxInfo = null;

    if (sandboxExists && provider) {
      try {
        const providerInfo = provider.getSandboxInfo();
        sandboxHealthy = !!providerInfo;
        sandboxInfo = {
          sandboxId: providerInfo?.sandboxId || global.sandboxData?.sandboxId,
          url: providerInfo?.url || global.sandboxData?.url,
          lastHealthCheck: new Date().toISOString()
        };
      } catch (error) {
        console.error('[sandbox-status] Health check failed:', error);
        sandboxHealthy = false;
      }
    }

    res.json({
      success: true, active: sandboxExists, healthy: sandboxHealthy, sandboxData: sandboxInfo,
      message: sandboxHealthy ? 'Sandbox is active and healthy' : sandboxExists ? 'Sandbox exists but not responding' : 'No active sandbox'
    });
  } catch (error) {
    console.error('[sandbox-status] Error:', error);
    res.status(500).json({ success: false, active: false, error: error.message });
  }
}
