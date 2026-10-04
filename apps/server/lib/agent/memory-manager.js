import { db } from '../store/index.js';

const DEFAULT_MEMORY_LIMIT = 12;
const MAX_MEMORY_CONTENT = 420;
const MAX_BLOCK_CHARS = 2600;

const STYLE_HINTS = [
  { pattern: /\bdark(er)?\b/i, label: 'dark visual style' },
  { pattern: /\blight(er)?\b/i, label: 'light visual style' },
  { pattern: /\bluxury|premium|high[-\s]?end|elegant\b/i, label: 'premium/luxury feel' },
  { pattern: /\bminimal|clean|simple\b/i, label: 'minimal clean layout' },
  { pattern: /\bmodern|sleek\b/i, label: 'modern sleek aesthetic' },
  { pattern: /\bteal\b/i, label: 'teal accents' },
  { pattern: /\bblue\b/i, label: 'blue accents' },
  { pattern: /\bpurple\b/i, label: 'purple accents' },
  { pattern: /\bgreen\b/i, label: 'green accents' },
  { pattern: /\borange\b/i, label: 'orange accents' },
  { pattern: /\bmobile|responsive\b/i, label: 'strong mobile/responsive behavior' }
];

const PROJECT_HINTS = [
  { pattern: /\bdashboard|admin|crm|workspace|panel\b/i, label: 'dashboard/admin workspace' },
  { pattern: /\blanding page|marketing site|homepage\b/i, label: 'marketing landing page' },
  { pattern: /\bpricing|plans|subscription\b/i, label: 'pricing/conversion section' },
  { pattern: /\be[-\s]?commerce|shop|store|product page\b/i, label: 'commerce/product surface' },
  { pattern: /\bportfolio|case stud(y|ies)\b/i, label: 'portfolio/showcase surface' }
];

export async function loadAgentMemoryBlock({
  projectId = null,
  userId = null,
  limit = DEFAULT_MEMORY_LIMIT
} = {}) {
  if (!projectId) return '';

  try {
    let query = db
      .from('agent_memory')
      .select('id,memory_type,content,metadata,importance,created_at,updated_at')
      .eq('project_id', projectId)
      .order('importance', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(clampLimit(limit, 1, 30, DEFAULT_MEMORY_LIMIT));

    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;

    return formatAgentMemoryBlock(data || []);
  } catch (error) {
    console.warn('[agent-memory] load skipped:', error?.message || error);
    return '';
  }
}

export async function persistTurnMemories({
  projectId = null,
  userId = null,
  turnId = null,
  prompt = '',
  response = '',
  changedFiles = [],
  componentIds = [],
  buildStatus = null,
  status = 'completed',
  error = null,
  mutationCount = 0,
  toolCallCount = 0,
  rounds = null,
  route = null,
  turnType = null
} = {}) {
  if (!projectId) return [];

  const memories = deriveTurnMemories({
    prompt,
    response,
    changedFiles,
    componentIds,
    buildStatus,
    status,
    error,
    mutationCount,
    toolCallCount,
    rounds,
    route,
    turnType
  });

  if (!memories.length) return [];

  try {
    const results = [];
    for (const memory of memories) {
      const content = trimSingleLine(memory.content, MAX_MEMORY_CONTENT);
      const memoryType = memory.memoryType;
      const importance = memory.importance;
      const metadata = sanitizeJson({
        ...memory.metadata,
        turnId,
        route,
        turnType,
        source: 'agent_turn'
      }, {});

      // Check for existing memory with same project + type + content
      const { data: existing } = await db
        .from('agent_memory')
        .select('id, importance')
        .eq('project_id', projectId)
        .eq('memory_type', memoryType)
        .eq('content', content)
        .maybeSingle();

      if (existing) {
        // Bump importance and refresh timestamp instead of duplicating
        const { data: updated } = await db
          .from('agent_memory')
          .update({
            importance: Math.max(existing.importance, importance),
            metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('id, memory_type');
        if (updated) results.push(updated);
      } else {
        // New memory — insert
        const { data: inserted } = await db
          .from('agent_memory')
          .insert({
            project_id: projectId,
            user_id: userId,
            memory_type: memoryType,
            content,
            metadata,
            importance
          })
          .select('id, memory_type');
        if (inserted) results.push(inserted);
      }
    }

    return results.flat();
  } catch (error) {
    console.warn('[agent-memory] persist skipped:', error?.message || error);
    return [];
  }
}

export function deriveTurnMemories({
  prompt = '',
  response = '',
  changedFiles = [],
  componentIds = [],
  buildStatus = null,
  status = 'completed',
  error = null,
  mutationCount = 0,
  toolCallCount = 0,
  rounds = null,
  route = null,
  turnType = null
} = {}) {
  const memories = [];
  const cleanPrompt = trimSingleLine(prompt, 260);
  const cleanResponse = trimSingleLine(response, 220);
  const normalizedFiles = normalizeChangedFiles(changedFiles);
  const normalizedComponents = uniqueStrings(componentIds).slice(0, 8);

  const styleHints = STYLE_HINTS
    .filter((hint) => hint.pattern.test(prompt))
    .map((hint) => hint.label);
  if (styleHints.length) {
    memories.push(makeMemory({
      memoryType: 'design_preference',
      content: `User design preference: ${uniqueStrings(styleHints).join(', ')}.`,
      importance: 4,
      metadata: { prompt: cleanPrompt }
    }));
  }

  const projectHints = PROJECT_HINTS
    .filter((hint) => hint.pattern.test(prompt))
    .map((hint) => hint.label);
  if (projectHints.length) {
    memories.push(makeMemory({
      memoryType: 'project_fact',
      content: `Project direction: ${uniqueStrings(projectHints).join(', ')}.`,
      importance: 3,
      metadata: { prompt: cleanPrompt }
    }));
  }

  if (hasPersistentInstruction(prompt)) {
    memories.push(makeMemory({
      memoryType: 'user_instruction',
      content: `User instruction to preserve: ${cleanPrompt}`,
      importance: 5,
      metadata: { prompt: cleanPrompt }
    }));
  }

  if ((Number(mutationCount) > 0 || normalizedFiles.length > 0) && (cleanPrompt || cleanResponse)) {
    const fileText = normalizedFiles.length
      ? ` Files changed: ${normalizedFiles.slice(0, 8).join(', ')}.`
      : '';
    memories.push(makeMemory({
      memoryType: 'recent_change',
      content: `Recent change after "${cleanPrompt || 'agent turn'}": ${cleanResponse || 'updated the website.'}${fileText}`,
      importance: 3,
      metadata: {
        changedFiles: normalizedFiles,
        mutationCount: Number(mutationCount) || normalizedFiles.length,
        toolCallCount,
        rounds
      }
    }));
  }

  if (normalizedComponents.length) {
    memories.push(makeMemory({
      memoryType: 'component_choice',
      content: `Registry components used: ${normalizedComponents.join(', ')}.`,
      importance: 3,
      metadata: { componentIds: normalizedComponents }
    }));
  }

  if (buildStatus || status === 'failed' || error) {
    const failed = status === 'failed' || Boolean(error);
    memories.push(makeMemory({
      memoryType: failed ? 'error_pattern' : 'build_status',
      content: failed
        ? `Last agent issue: ${trimSingleLine(error || cleanResponse || 'turn failed', 260)}`
        : `Latest build status: ${buildStatus}.`,
      importance: failed ? 4 : 2,
      metadata: { buildStatus, status }
    }));
  }

  return dedupeMemories(memories);
}

export function formatAgentMemoryBlock(memories = []) {
  if (!Array.isArray(memories) || memories.length === 0) return '';

  const groups = new Map();
  for (const memory of memories) {
    const type = memory.memory_type || memory.memoryType;
    const content = trimSingleLine(memory.content, MAX_MEMORY_CONTENT);
    if (!type || !content) continue;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(content);
  }

  if (!groups.size) return '';

  const lines = [
    '[Agent memory]',
    'Use these durable notes to keep this as one continuous website-building conversation. Do not repeat them back unless helpful.'
  ];

  for (const [type, entries] of groups.entries()) {
    lines.push(`${humanizeMemoryType(type)}:`);
    for (const entry of uniqueStrings(entries).slice(0, 3)) {
      lines.push(`- ${entry}`);
    }
  }

  lines.push('[/Agent memory]');
  return trimBlock(lines.join('\n'), MAX_BLOCK_CHARS);
}

function makeMemory({ memoryType, content, importance = 1, metadata = {} }) {
  return {
    memoryType,
    content: trimSingleLine(content, MAX_MEMORY_CONTENT),
    importance: Math.min(5, Math.max(1, Number(importance) || 1)),
    metadata
  };
}

function dedupeMemories(memories = []) {
  const seen = new Set();
  const deduped = [];
  for (const memory of memories) {
    const key = `${memory.memoryType}:${memory.content.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(memory);
  }
  return deduped;
}

function normalizeChangedFiles(changedFiles = []) {
  if (!Array.isArray(changedFiles)) return [];
  return uniqueStrings(
    changedFiles
      .map((file) => typeof file === 'string' ? file : file?.path || file?.filePath)
      .filter(Boolean)
  );
}

function hasPersistentInstruction(prompt = '') {
  return /\b(remember|always|from now on|keep|preserve|do not change|don't change|continue with|stick with)\b/i.test(prompt);
}

function humanizeMemoryType(type = '') {
  return String(type)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const clean = trimSingleLine(value, MAX_MEMORY_CONTENT);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function trimBlock(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function trimSingleLine(text, maxLength = MAX_MEMORY_CONTENT) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function clampLimit(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sanitizeJson(value, fallback) {
  if (value === undefined) return fallback;
  if (value === null) return null;
  try {
    JSON.stringify(value);
    return value;
  } catch {
    return fallback;
  }
}
