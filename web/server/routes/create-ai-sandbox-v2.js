import { SandboxFactory } from '../lib/sandbox/factory.js';
import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';

export default async function createAiSandboxV2(req, res) {
  try {
    console.log('[create-ai-sandbox-v2] Creating sandbox...');

    // Clean up existing sandboxes defensively
    try {
      if (sandboxManager && typeof sandboxManager.terminateAll === 'function') {
        await sandboxManager.terminateAll();
      }
    } catch (e) {
      console.error('[create-ai-sandbox-v2] Defensive cleanup failed (manager):', e.message);
    }

    if (global.activeSandboxProvider && typeof global.activeSandboxProvider.terminate === 'function') {
      try {
        await global.activeSandboxProvider.terminate();
      } catch (e) {
        console.error('[create-ai-sandbox-v2] Defensive cleanup failed (provider):', e.message);
      }
    }
    global.activeSandboxProvider = null;

    if (global.existingFiles) global.existingFiles.clear();
    else global.existingFiles = new Set();

    // Create new sandbox
    console.log('[create-ai-sandbox-v2] E2B API Key present:', !!(process.env.E2B_API_KEY));
    if (!process.env.E2B_API_KEY) {
      throw new Error('E2B_API_KEY is not set in environment variables');
    }

    const provider = SandboxFactory.create();
    if (!provider) throw new Error('Failed to create sandbox provider from factory');

    console.log('[create-ai-sandbox-v2] Calling provider.createSandbox()...');
    const sandboxInfo = await provider.createSandbox();
    if (!sandboxInfo || !sandboxInfo.sandboxId) throw new Error('Provider failed to return valid sandboxInfo');

    console.log('[create-ai-sandbox-v2] Setting up Vite React app...');
    await provider.setupViteApp();

    // Register
    sandboxManager.registerSandbox(sandboxInfo.sandboxId, provider);
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
    console.error('[create-ai-sandbox-v2] FATAL Error:', error.message);
    if (error.stack) console.error(error.stack);

    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: 'Check E2B_API_KEY and network connectivity.'
    });
  }
}
