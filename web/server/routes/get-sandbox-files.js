import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';

const EXCLUDED_PATH_SEGMENTS = new Set([
  'node_modules',
  '.git',
  '.vite'
]);

const TEXT_EXTENSIONS = new Set([
  'astro',
  'cjs',
  'css',
  'csv',
  'env',
  'gitignore',
  'glsl',
  'graphql',
  'html',
  'ini',
  'js',
  'json',
  'jsx',
  'less',
  'lock',
  'log',
  'md',
  'mjs',
  'scss',
  'svg',
  'toml',
  'ts',
  'tsx',
  'txt',
  'vue',
  'xml',
  'yaml',
  'yml'
]);

const TEXT_FILE_NAMES = new Set([
  '.env',
  '.env.example',
  '.env.local',
  '.gitignore',
  '.npmrc',
  '.prettierrc',
  'Dockerfile',
  'LICENSE',
  'README',
  'README.md'
]);

const MAX_TEXT_FILE_CHARS = 500000;

function normalizeSandboxPath(filePath = '') {
  return String(filePath)
    .replace(/\\/g, '/')
    .replace(/^\/home\/user\/app\//, '')
    .replace(/^\/+/, '');
}

function isProjectFile(filePath = '') {
  const normalized = normalizeSandboxPath(filePath);
  if (!normalized || normalized.endsWith('/')) return false;
  const parts = normalized.split('/');
  return !parts.some(part => EXCLUDED_PATH_SEGMENTS.has(part));
}

function getExtension(filePath = '') {
  const fileName = normalizeSandboxPath(filePath).split('/').pop() || '';
  if (fileName.startsWith('.') && !fileName.slice(1).includes('.')) {
    return fileName.slice(1).toLowerCase();
  }
  const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
  return ext.toLowerCase();
}

function isReadableTextFile(filePath = '') {
  const fileName = normalizeSandboxPath(filePath).split('/').pop() || '';
  return TEXT_FILE_NAMES.has(fileName) || TEXT_EXTENSIONS.has(getExtension(filePath));
}

export default async function getSandboxFiles(req, res) {
  try {
    const sandboxId = req.query.sandboxId;
    // BUILDER-SECURITY: This route returns source files from the live sandbox.
    // Keep it behind auth in index.js and never satisfy a requested sandbox id
    // with an unrelated global provider. The global fallback is compatibility
    // for the current manager/global bridge, not a cross-sandbox escape hatch.
    const provider = sandboxId
      ? (
          sandboxManager.getProvider(sandboxId)
          || (global.sandboxData?.sandboxId === sandboxId ? global.activeSandboxProvider : null)
        )
      : (sandboxManager.getActiveProvider() || global.activeSandboxProvider);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'No active sandbox' });
    }

    // List the full project tree. Keep dependency internals hidden so the explorer
    // feels real without flooding the UI with thousands of package files.
    const fileList = await provider.listFiles('/home/user/app');
    const projectFiles = fileList
      .map(normalizeSandboxPath)
      .filter(isProjectFile)
      .sort((a, b) => a.localeCompare(b));

    // Read safe text files. Binary/assets still appear in the manifest.
    const files = {};
    const manifestFiles = [];
    for (const filePath of projectFiles) {
      const readable = isReadableTextFile(filePath);
      const manifestEntry = {
        path: filePath,
        readable,
        binary: !readable,
        extension: getExtension(filePath)
      };

      manifestFiles.push(manifestEntry);
      if (!readable) continue;

      try {
        const rawContent = await provider.readFile(filePath);
        const content = String(rawContent ?? '');
        if (content.length > MAX_TEXT_FILE_CHARS) {
          files[filePath] = [
            content.slice(0, MAX_TEXT_FILE_CHARS),
            '',
            `/* File truncated in Code view after ${MAX_TEXT_FILE_CHARS.toLocaleString()} characters. Export/download contains the full file. */`
          ].join('\n');
          manifestEntry.truncated = true;
          manifestEntry.size = content.length;
        } else {
          files[filePath] = content;
          manifestEntry.size = content.length;
        }
      } catch (e) {
        console.warn(`[get-sandbox-files] Could not read ${filePath}:`, e.message);
        manifestEntry.readable = false;
        manifestEntry.readError = e.message;
      }
    }

    // Build structure string
    const structure = projectFiles.map(f => `  ${f}`).join('\n');

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
      fileCount: projectFiles.length,
      readableFileCount: Object.keys(files).length,
      manifest: { files: manifestFiles }
    });
  } catch (error) {
    console.error('[get-sandbox-files] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
