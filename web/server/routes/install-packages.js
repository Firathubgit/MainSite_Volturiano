import { resolveSandboxProvider } from '../lib/sandbox/provider-resolver.js';
import { validatePackageNames } from '../lib/agent/tool-runtime.js';

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

    let safePackages;
    try {
      safePackages = validatePackageNames(packages);
    } catch (error) {
      send({
        type: 'error',
        message: error.message || 'Invalid package name',
        code: error.code || 'INVALID_PACKAGES'
      });
      return res.end();
    }

    const resolution = await resolveSandboxProvider({
      sandboxId,
      allowGlobalFallback: !sandboxId,
      allowReconnect: true,
      requireAlive: true
    });

    if (!resolution.ok) {
      send({ type: 'error', message: resolution.message, code: resolution.code });
      return res.end();
    }

    const provider = resolution.provider;

    send({ type: 'start', message: `Installing ${safePackages.length} packages...` });
    send({ type: 'status', message: `Installing: ${safePackages.join(', ')}` });

    const result = await provider.installPackages(safePackages);

    if (result.success) {
      send({ type: 'success', message: 'Packages installed successfully', installedPackages: safePackages });
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
