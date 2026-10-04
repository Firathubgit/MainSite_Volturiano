/**
 * Pre-build pass: find invalid JS identifier names at declaration sites and rename
 * them consistently across .js/.jsx (and .tsx) files. No LLM.
 */

const IDENT_START = /^[a-zA-Z_$]/;

/** Declarations that introduce a binding name we may need to fix */
const DECL_PATTERNS = [
  /(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)/g,
  /(?:export\s+)?(?:const|let|var)\s+(\w+)/g,
  /(?:export\s+)?class\s+(\w+)/g,
  /import\s+(\w+)\s+from\s+['"]/g,
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Invalid identifier names must not start with a valid ID_Start character (ASCII subset).
 * Handles common AI mistake: `3dProductRotation` → `ProductRotation3d`.
 */
export function fixInvalidIdentifierName(name) {
  if (IDENT_START.test(name)) return name;

  const m3d = name.match(/^(\d+)([a-z])([A-Z].*)$/);
  if (m3d) {
    return m3d[3] + m3d[1] + m3d[2];
  }

  const m = name.match(/^(\d+)(.*)$/);
  if (m) {
    const fixed = m[2] + m[1];
    if (IDENT_START.test(fixed)) return fixed;
    return `_${name}`;
  }

  return `_${name}`;
}

function collectInvalidDeclarationNames(content) {
  const invalid = new Set();
  for (const re of DECL_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(content)) !== null) {
      const name = match[1];
      if (name && !IDENT_START.test(name)) invalid.add(name);
    }
  }
  return invalid;
}

/**
 * Replace whole identifier tokens only (avoids touching substrings inside longer names).
 */
function replaceIdentifierGlobally(content, from, to) {
  if (from === to) return content;
  const escaped = escapeRegex(from);
  return content.replace(new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`, 'g'), to);
}

function isJsLike(path) {
  return (
    path.endsWith('.jsx') ||
    path.endsWith('.js') ||
    path.endsWith('.tsx') ||
    path.endsWith('.ts')
  );
}

/**
 * @param {Array<{ path: string, content: string }>} files - mutated in place
 * @returns {Array<{ file: string, from: string, to: string }>}
 */
export function validateAndFixIdentifiers(files) {
  const renameMap = new Map();

  for (const file of files) {
    if (!file?.path || !isJsLike(file.path)) continue;
    for (const name of collectInvalidDeclarationNames(file.content || '')) {
      if (!renameMap.has(name)) {
        const to = fixInvalidIdentifierName(name);
        if (to !== name) renameMap.set(name, to);
      }
    }
  }

  if (renameMap.size === 0) return [];

  const pairs = [...renameMap.entries()].sort((a, b) => b[0].length - a[0].length);
  const fixes = [];
  const seen = new Set();

  for (const file of files) {
    if (!file?.path || !isJsLike(file.path)) continue;
    let content = file.content || '';
    for (const [from, to] of pairs) {
      const next = replaceIdentifierGlobally(content, from, to);
      if (next !== content) {
        const key = `${file.path}|${from}|${to}`;
        if (!seen.has(key)) {
          seen.add(key);
          fixes.push({ file: file.path, from, to });
        }
        content = next;
      }
    }
    file.content = content;
  }

  return fixes;
}
