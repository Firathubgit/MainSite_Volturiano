import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';

export default async function getSandboxFiles(req, res) {
  try {
    const sandboxId = req.query.sandboxId;
    const provider = sandboxId
      ? (sandboxManager.getProvider(sandboxId) || global.activeSandboxProvider)
      : (sandboxManager.getActiveProvider() || global.activeSandboxProvider);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'No active sandbox' });
    }

    // List files
    const fileList = await provider.listFiles('/home/user/app');
    const relevantFiles = fileList.filter(f => {
      const ext = f.split('.').pop();
      // Expanded filter to include config files, docs, and environment files
      return ['jsx', 'js', 'tsx', 'ts', 'css', 'json', 'html', 'mjs', 'cjs', 'md', 'txt', 'xml', 'env'].includes(ext);
    });

    // Read file contents
    const files = {};
    for (const filePath of relevantFiles) {
      try {
        const content = await provider.readFile(filePath);
        files[filePath] = content;
      } catch (e) {
        console.warn(`[get-sandbox-files] Could not read ${filePath}:`, e.message);
      }
    }

    // Build structure string
    const structure = relevantFiles.map(f => `  ${f}`).join('\n');

    // Update cache
    if (global.sandboxState?.fileCache) {
      for (const [path, content] of Object.entries(files)) {
        global.sandboxState.fileCache.files[path] = { content, lastModified: Date.now() };
      }
    }

    res.json({
      success: true,
      files,
      structure,
      fileCount: Object.keys(files).length,
      manifest: { files: Object.keys(files).map(f => ({ path: f })) }
    });
  } catch (error) {
    console.error('[get-sandbox-files] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
