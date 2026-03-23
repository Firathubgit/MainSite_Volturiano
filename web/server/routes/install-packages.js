import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';

export default async function installPackages(req, res) {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const { packages, sandboxId } = req.body;
    if (!packages?.length) {
      send({ type: 'error', message: 'No packages specified' });
      return res.end();
    }

    const provider = sandboxId
      ? (sandboxManager.getProvider(sandboxId) || global.activeSandboxProvider)
      : (sandboxManager.getActiveProvider() || global.activeSandboxProvider);

    if (!provider) {
      send({ type: 'error', message: 'No active sandbox' });
      return res.end();
    }

    send({ type: 'start', message: `Installing ${packages.length} packages...` });
    send({ type: 'status', message: `Installing: ${packages.join(', ')}` });

    const result = await provider.installPackages(packages);

    if (result.success) {
      send({ type: 'success', message: 'Packages installed successfully', installedPackages: packages });
    } else {
      send({ type: 'error', message: `Installation failed: ${result.stderr}` });
    }

    send({ type: 'complete' });
    res.end();
  } catch (error) {
    console.error('[install-packages] Error:', error);
    send({ type: 'error', message: error.message });
    res.end();
  }
}
