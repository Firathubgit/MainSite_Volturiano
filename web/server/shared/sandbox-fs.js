/**
 * Sandbox Filesystem Abstraction Layer
 * 
 * Provides safe, validated file operations against the E2B sandbox provider.
 * All operations enforce workspace boundaries, detect binary files, and return
 * structured patch metadata for undo/diff display.
 * 
 * Adapted from Claude Code's file_ops.rs patterns:
 * - Exact string replacement edits (not line-number based)
 * - Workspace boundary validation on every operation
 * - Structured patch output for every mutation
 * - Binary file detection to prevent text ops on non-text files
 */

const SANDBOX_ROOT = '/home/user/app';
const MAX_READ_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_WRITE_SIZE = 10 * 1024 * 1024; // 10 MB

// File extensions we consider text-editable
const TEXT_EXTENSIONS = new Set([
  'jsx', 'js', 'tsx', 'ts', 'css', 'json', 'html', 'mjs', 'cjs',
  'md', 'txt', 'xml', 'svg', 'yaml', 'yml', 'toml', 'env', 'gitignore'
]);

// Files that should never be edited by the agent
const PROTECTED_FILES = new Set([
  'vite.config.js', 'postcss.config.js',
  'package.json', 'package-lock.json', 'tsconfig.json',
  'main.jsx' // main.jsx is the entry point, agent shouldn't touch it
]);

// ─── Path Validation ─────────────────────────────────────────

/**
 * Normalize a relative or absolute path to an absolute sandbox path.
 * Validates the path stays within the sandbox root.
 */
function normalizePath(inputPath) {
  // Strip leading slashes if it's a relative path
  let cleaned = inputPath.trim();
  
  // If already absolute and within sandbox root, use as-is
  if (cleaned.startsWith(SANDBOX_ROOT + '/')) {
    return cleaned;
  }

  // If absolute but outside sandbox root, reject
  if (cleaned.startsWith('/')) {
    throw new SandboxFsError(
      'BOUNDARY_VIOLATION',
      `Path "${cleaned}" is outside the sandbox root "${SANDBOX_ROOT}"`
    );
  }

  // Relative path — resolve against sandbox root
  // But first check for directory traversal
  if (cleaned.includes('..')) {
    throw new SandboxFsError(
      'BOUNDARY_VIOLATION',
      `Path "${cleaned}" contains directory traversal (..)`
    );
  }

  return `${SANDBOX_ROOT}/${cleaned}`;
}

/**
 * Convert absolute sandbox path back to relative for display/storage.
 */
function toRelativePath(absolutePath) {
  if (absolutePath.startsWith(SANDBOX_ROOT + '/')) {
    return absolutePath.slice(SANDBOX_ROOT.length + 1);
  }
  return absolutePath;
}

/**
 * Check if a filename is a protected system file.
 */
function isProtectedFile(filePath) {
  const fileName = filePath.split('/').pop();
  return PROTECTED_FILES.has(fileName);
}

/**
 * Check if a file extension indicates text content.
 */
function isTextFile(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

// ─── Error Types ─────────────────────────────────────────────

class SandboxFsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SandboxFsError';
    this.code = code;
  }
}

// ─── Structured Patch Output ─────────────────────────────────

/**
 * Generate a simple structured patch (unified diff representation).
 */
function makePatch(originalContent, updatedContent, filePath) {
  const oldLines = (originalContent || '').split('\n');
  const newLines = (updatedContent || '').split('\n');

  return {
    filePath: toRelativePath(filePath),
    oldLineCount: oldLines.length,
    newLineCount: newLines.length,
    hunks: [{
      oldStart: 1,
      oldLines: oldLines.length,
      newStart: 1,
      newLines: newLines.length,
    }]
  };
}

/**
 * Generate a human-readable diff summary for chat display.
 */
function makeDiffSummary(oldString, newString) {
  const oldLines = oldString.split('\n');
  const newLines = newString.split('\n');
  
  return {
    linesRemoved: oldLines.length,
    linesAdded: newLines.length,
    oldPreview: oldString.length > 200 ? oldString.slice(0, 200) + '...' : oldString,
    newPreview: newString.length > 200 ? newString.slice(0, 200) + '...' : newString
  };
}

// ─── Core File Operations ────────────────────────────────────

/**
 * List all text files in the sandbox project.
 * Returns a flat array of relative paths with metadata.
 */
async function listFiles(provider) {
  if (!provider) throw new SandboxFsError('NO_SANDBOX', 'No active sandbox provider');

  const fileList = await provider.listFiles(SANDBOX_ROOT);
  
  // Filter to text files and add metadata
  const results = [];
  for (const filePath of fileList) {
    if (!isTextFile(filePath)) continue;
    // Skip node_modules, dist, etc. (provider's listFiles already excludes these)
    
    results.push({
      path: filePath,
      protected: isProtectedFile(filePath),
      extension: filePath.split('.').pop()?.toLowerCase()
    });
  }

  // Sort: src/ files first, then config files
  results.sort((a, b) => {
    const aIsSrc = a.path.startsWith('src/') ? 0 : 1;
    const bIsSrc = b.path.startsWith('src/') ? 0 : 1;
    if (aIsSrc !== bIsSrc) return aIsSrc - bIsSrc;
    return a.path.localeCompare(b.path);
  });

  return {
    files: results,
    totalFiles: results.length,
    sandboxRoot: SANDBOX_ROOT
  };
}

/**
 * Read a text file with optional line windowing.
 * Returns content, line count, and metadata.
 */
async function readFile(provider, filePath, options = {}) {
  if (!provider) throw new SandboxFsError('NO_SANDBOX', 'No active sandbox provider');

  const absolutePath = normalizePath(filePath);
  
  if (!isTextFile(absolutePath)) {
    throw new SandboxFsError('BINARY_FILE', `File "${filePath}" appears to be binary`);
  }

  let content;
  try {
    content = await provider.readFile(absolutePath);
  } catch (e) {
    throw new SandboxFsError('READ_FAILED', `Could not read "${filePath}": ${e.message}`);
  }

  if (typeof content !== 'string') {
    content = content.toString();
  }

  // Size check
  if (content.length > MAX_READ_SIZE) {
    throw new SandboxFsError('TOO_LARGE', `File "${filePath}" is too large (${content.length} bytes, max ${MAX_READ_SIZE})`);
  }

  const allLines = content.split('\n');
  const totalLines = allLines.length;

  // Apply line windowing if requested
  const { startLine, endLine } = options;
  let selectedContent = content;
  let selectedStartLine = 1;
  let selectedLineCount = totalLines;

  if (startLine !== undefined || endLine !== undefined) {
    const start = Math.max(0, (startLine || 1) - 1); // Convert to 0-indexed
    const end = endLine !== undefined ? Math.min(totalLines, endLine) : totalLines;
    
    const selectedLines = allLines.slice(start, end);
    selectedContent = selectedLines.join('\n');
    selectedStartLine = start + 1;
    selectedLineCount = selectedLines.length;
  }

  return {
    filePath: toRelativePath(absolutePath),
    content: selectedContent,
    totalLines,
    startLine: selectedStartLine,
    lineCount: selectedLineCount,
    sizeBytes: content.length
  };
}

/**
 * Create a new file. Fails if file already exists (use replaceFile for overwrites).
 * Returns structured patch metadata.
 */
async function createFile(provider, filePath, content) {
  if (!provider) throw new SandboxFsError('NO_SANDBOX', 'No active sandbox provider');

  if (content.length > MAX_WRITE_SIZE) {
    throw new SandboxFsError('TOO_LARGE', `Content too large (${content.length} bytes, max ${MAX_WRITE_SIZE})`);
  }

  const absolutePath = normalizePath(filePath);

  if (isProtectedFile(absolutePath)) {
    throw new SandboxFsError('PROTECTED_FILE', `Cannot write to protected file "${filePath}"`);
  }

  // Check if file already exists
  let existingContent = null;
  try {
    existingContent = await provider.readFile(absolutePath);
  } catch (e) {
    // File doesn't exist — good, proceed with creation
  }

  if (existingContent !== null) {
    throw new SandboxFsError(
      'FILE_EXISTS',
      `File "${filePath}" already exists. Use edit_file or replace_file instead.`
    );
  }

  // Write the file
  await provider.writeFile(absolutePath, content);

  return {
    type: 'create',
    filePath: toRelativePath(absolutePath),
    sizeBytes: content.length,
    lineCount: content.split('\n').length,
    patch: makePatch('', content, absolutePath)
  };
}

/**
 * Edit a file by exact string replacement.
 * This is the core agentic edit operation — robust across edits because it
 * matches exact text rather than fragile line numbers.
 * 
 * @param {SandboxProvider} provider
 * @param {string} filePath
 * @param {string} oldString — exact text to find in the file
 * @param {string} newString — replacement text
 * @param {boolean} replaceAll — if true, replace all occurrences
 */
async function editFile(provider, filePath, oldString, newString, replaceAll = false) {
  if (!provider) throw new SandboxFsError('NO_SANDBOX', 'No active sandbox provider');

  const absolutePath = normalizePath(filePath);

  if (isProtectedFile(absolutePath)) {
    throw new SandboxFsError('PROTECTED_FILE', `Cannot edit protected file "${filePath}"`);
  }

  if (oldString === newString) {
    throw new SandboxFsError('NO_CHANGE', 'old_string and new_string are identical');
  }

  // Read current content
  let originalContent;
  try {
    originalContent = await provider.readFile(absolutePath);
  } catch (e) {
    throw new SandboxFsError('READ_FAILED', `Cannot read "${filePath}" for editing: ${e.message}`);
  }

  if (typeof originalContent !== 'string') {
    originalContent = originalContent.toString();
  }

  // Check if oldString exists
  if (!originalContent.includes(oldString)) {
    throw new SandboxFsError(
      'STRING_NOT_FOUND',
      `Could not find the specified text in "${filePath}". The file may have been modified since you last read it.`
    );
  }

  // Count occurrences
  const occurrences = originalContent.split(oldString).length - 1;

  // Apply replacement
  let updatedContent;
  if (replaceAll) {
    updatedContent = originalContent.replaceAll(oldString, newString);
  } else {
    if (occurrences > 1) {
      // Multiple occurrences but replaceAll not set — warn but replace first
      console.warn(`[sandbox-fs] edit_file: found ${occurrences} occurrences of old_string in "${filePath}", replacing first only.`);
    }
    updatedContent = originalContent.replace(oldString, newString);
  }

  // Size check
  if (updatedContent.length > MAX_WRITE_SIZE) {
    throw new SandboxFsError('TOO_LARGE', `Updated content too large (${updatedContent.length} bytes)`);
  }

  // Write updated content
  await provider.writeFile(absolutePath, updatedContent);

  return {
    type: 'edit',
    filePath: toRelativePath(absolutePath),
    occurrencesFound: occurrences,
    occurrencesReplaced: replaceAll ? occurrences : 1,
    diff: makeDiffSummary(oldString, newString),
    patch: makePatch(originalContent, updatedContent, absolutePath),
    // Store original for undo
    _original: originalContent
  };
}

/**
 * Replace entire file contents. Used for major rewrites where edit_file
 * would be impractical.
 */
async function replaceFile(provider, filePath, content) {
  if (!provider) throw new SandboxFsError('NO_SANDBOX', 'No active sandbox provider');

  if (content.length > MAX_WRITE_SIZE) {
    throw new SandboxFsError('TOO_LARGE', `Content too large (${content.length} bytes, max ${MAX_WRITE_SIZE})`);
  }

  const absolutePath = normalizePath(filePath);

  if (isProtectedFile(absolutePath)) {
    throw new SandboxFsError('PROTECTED_FILE', `Cannot replace protected file "${filePath}"`);
  }

  // Read original for patch metadata and undo
  let originalContent = null;
  try {
    originalContent = await provider.readFile(absolutePath);
    if (typeof originalContent !== 'string') originalContent = originalContent.toString();
  } catch (e) {
    // File doesn't exist — this will act as a create
  }

  await provider.writeFile(absolutePath, content);

  return {
    type: originalContent !== null ? 'replace' : 'create',
    filePath: toRelativePath(absolutePath),
    sizeBytes: content.length,
    lineCount: content.split('\n').length,
    patch: makePatch(originalContent || '', content, absolutePath),
    _original: originalContent
  };
}

/**
 * Delete a file from the sandbox.
 */
async function deleteFile(provider, filePath) {
  if (!provider) throw new SandboxFsError('NO_SANDBOX', 'No active sandbox provider');

  const absolutePath = normalizePath(filePath);

  if (isProtectedFile(absolutePath)) {
    throw new SandboxFsError('PROTECTED_FILE', `Cannot delete protected file "${filePath}"`);
  }

  // Read original content for undo
  let originalContent;
  try {
    originalContent = await provider.readFile(absolutePath);
    if (typeof originalContent !== 'string') originalContent = originalContent.toString();
  } catch (e) {
    throw new SandboxFsError('READ_FAILED', `File "${filePath}" does not exist or cannot be read`);
  }

  // Use sandbox command to delete
  await provider.runCommand(`rm -f "${absolutePath}"`);

  return {
    type: 'delete',
    filePath: toRelativePath(absolutePath),
    lineCount: originalContent.split('\n').length,
    _original: originalContent
  };
}

/**
 * Search file contents with a regex or literal pattern.
 * Returns matching files and line-level context.
 */
async function searchFiles(provider, pattern, options = {}) {
  if (!provider) throw new SandboxFsError('NO_SANDBOX', 'No active sandbox provider');

  const { glob: globFilter, caseSensitive = true, contextLines = 2 } = options;

  // Get all text files
  const fileList = await provider.listFiles(SANDBOX_ROOT);
  const textFiles = fileList.filter(f => {
    if (!isTextFile(f)) return false;
    if (globFilter) {
      // Simple glob matching: *.jsx, src/**/*.css, etc.
      const ext = f.split('.').pop();
      if (globFilter.startsWith('*.')) {
        return f.endsWith(globFilter.slice(1));
      }
      return true;
    }
    return true;
  });

  const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  const results = [];

  for (const filePath of textFiles) {
    try {
      const content = await provider.readFile(filePath);
      if (typeof content !== 'string') continue;

      const lines = content.split('\n');
      const matches = [];

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          // Collect context
          const start = Math.max(0, i - contextLines);
          const end = Math.min(lines.length - 1, i + contextLines);
          const contextSnippet = lines.slice(start, end + 1).map((line, idx) => ({
            lineNumber: start + idx + 1,
            content: line,
            isMatch: (start + idx) === i
          }));

          matches.push({
            lineNumber: i + 1,
            content: lines[i],
            context: contextSnippet
          });
        }
        regex.lastIndex = 0; // Reset regex state
      }

      if (matches.length > 0) {
        results.push({
          filePath,
          matchCount: matches.length,
          matches: matches.slice(0, 10) // Cap at 10 matches per file
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }

  return {
    pattern,
    totalFiles: results.length,
    totalMatches: results.reduce((sum, r) => sum + r.matchCount, 0),
    results: results.slice(0, 20) // Cap at 20 files
  };
}

// ─── Snapshot System ─────────────────────────────────────────

/**
 * Create a snapshot of specific files before mutation.
 * Used for undo support.
 */
async function createSnapshot(provider, filePaths) {
  if (!provider) throw new SandboxFsError('NO_SANDBOX', 'No active sandbox provider');

  const snapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    files: {}
  };

  for (const filePath of filePaths) {
    try {
      const absolutePath = normalizePath(filePath);
      const content = await provider.readFile(absolutePath);
      snapshot.files[toRelativePath(absolutePath)] = typeof content === 'string' ? content : content.toString();
    } catch (e) {
      // File doesn't exist yet — record as null (for undo: delete the file)
      snapshot.files[filePath] = null;
    }
  }

  return snapshot;
}

/**
 * Restore files from a snapshot.
 */
async function restoreSnapshot(provider, snapshot) {
  if (!provider) throw new SandboxFsError('NO_SANDBOX', 'No active sandbox provider');

  const restored = [];

  for (const [filePath, content] of Object.entries(snapshot.files)) {
    const absolutePath = normalizePath(filePath);
    
    if (content === null) {
      // File didn't exist before — delete it
      try {
        await provider.runCommand(`rm -f "${absolutePath}"`);
        restored.push({ path: filePath, action: 'deleted' });
      } catch (e) {
        console.warn(`[sandbox-fs] Could not delete ${filePath} during restore:`, e.message);
      }
    } else {
      // Restore original content
      await provider.writeFile(absolutePath, content);
      restored.push({ path: filePath, action: 'restored' });
    }
  }

  return {
    snapshotId: snapshot.id,
    restoredFiles: restored
  };
}

// ─── Exports ─────────────────────────────────────────────────

export {
  // Core operations
  listFiles,
  readFile,
  createFile,
  editFile,
  replaceFile,
  deleteFile,
  searchFiles,
  
  // Snapshot
  createSnapshot,
  restoreSnapshot,
  
  // Utilities
  normalizePath,
  toRelativePath,
  isProtectedFile,
  isTextFile,
  
  // Error class
  SandboxFsError,
  
  // Constants
  SANDBOX_ROOT,
  PROTECTED_FILES,
  TEXT_EXTENSIONS
};
