import { resolveSandboxProvider } from '../lib/sandbox/provider-resolver.js';

export default async function sandboxKeepAlive(req, res) {
  try {
    const { sandboxId } = req.body;
    
    if (!sandboxId) {
      return res.status(400).json({ success: false, error: 'sandboxId is required' });
    }

    const resolution = await resolveSandboxProvider({
      sandboxId,
      allowGlobalFallback: false,
      allowReconnect: true,
      requireAlive: true
    });

    if (!resolution.ok) {
      return res.status(resolution.statusCode).json({
        success: false,
        error: resolution.message,
        code: resolution.code
      });
    }

    const provider = resolution.provider;
    
    if (provider && typeof provider.keepAlive === 'function') {
      await provider.keepAlive();
      return res.json({ success: true, message: 'Sandbox timeout reset.' });
    }

    return res.status(404).json({ success: false, error: 'Active sandbox not found.' });
  } catch (error) {
    console.error('[sandboxKeepAlive] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
