const DEFAULT_PREVIEW_CHARS = 240;
const DEFAULT_TEXT_PREVIEW_CHARS = 320;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 40;
const MAX_DEPTH = 5;

const DISABLED_VALUES = new Set(['0', 'false', 'off', 'no']);
const ENABLED_VALUES = new Set(['1', 'true', 'on', 'yes']);
const SENSITIVE_KEY = /(authorization|cookie|password|secret|api[_-]?key|service[_-]?role|token)/i;
const LARGE_TEXT_KEY = /(content|old_string|new_string|diff|logs|output|stdout|stderr|response|rawResponse|prompt|stack)/i;

export function isAgentDebugTimelineEnabled(env = process.env) {
  const raw = String(env.AGENT_DEBUG_TIMELINE ?? '').trim().toLowerCase();
  if (DISABLED_VALUES.has(raw)) return false;
  if (ENABLED_VALUES.has(raw)) return true;
  return env.NODE_ENV !== 'production';
}

export function createAgentDebugTimeline(context = {}, options = {}) {
  const enabled = options.enabled ?? isAgentDebugTimelineEnabled();
  const logger = typeof options.logger === 'function' ? options.logger : defaultDebugLogger;
  const startedAt = Date.now();
  let sequence = 0;
  let baseContext = sanitizeBaseContext(context);

  function setContext(updates = {}) {
    baseContext = {
      ...baseContext,
      ...sanitizeBaseContext(updates)
    };
  }

  function event(name, payload = {}) {
    const entry = buildDebugEntry({
      name,
      payload,
      baseContext,
      sequence: sequence++,
      startedAt
    });

    if (enabled) {
      try {
        logger(entry);
      } catch (error) {
        console.warn('[agent-debug] log skipped:', error?.message || error);
      }
    }

    return entry;
  }

  function final(payload = {}) {
    return event('turn_final', normalizeFinalPayload(payload));
  }

  function error(name, err, payload = {}) {
    return event(name, {
      ...payload,
      error: normalizeError(err)
    });
  }

  return {
    event,
    final,
    error,
    setContext,
    isEnabled: () => enabled,
    context: () => ({ ...baseContext })
  };
}

export function logAgentDebugEvent(name, payload = {}, options = {}) {
  const timeline = createAgentDebugTimeline({}, options);
  return timeline.event(name, payload);
}

export function buildDebugEntry({ name, payload, baseContext, sequence, startedAt }) {
  return {
    type: 'agent_debug_timeline',
    event: name,
    sequence,
    timestamp: new Date().toISOString(),
    elapsedMs: Math.max(0, Date.now() - startedAt),
    ...baseContext,
    data: sanitizeDebugValue(payload)
  };
}

export function sanitizeDebugValue(value, key = '', depth = 0) {
  if (value === null || value === undefined) return value ?? null;

  if (typeof value === 'string') {
    if (SENSITIVE_KEY.test(key)) return '[redacted]';
    if (LARGE_TEXT_KEY.test(key)) return summarizeText(value, DEFAULT_TEXT_PREVIEW_CHARS);
    return truncateSingleLine(value, DEFAULT_TEXT_PREVIEW_CHARS);
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return normalizeError(value);

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return { type: 'array', length: value.length };
    return {
      count: value.length,
      items: value
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) => sanitizeDebugValue(item, key, depth + 1)),
      ...(value.length > MAX_ARRAY_ITEMS ? { truncated: true } : {})
    };
  }

  if (typeof value === 'object') {
    if (depth >= MAX_DEPTH) return { type: 'object', keys: Object.keys(value).length };

    const output = {};
    const entries = Object.entries(value);
    for (const [childKey, childValue] of entries.slice(0, MAX_OBJECT_KEYS)) {
      output[childKey] = sanitizeDebugValue(childValue, childKey, depth + 1);
    }
    if (entries.length > MAX_OBJECT_KEYS) {
      output.truncated = true;
      output.totalKeys = entries.length;
    }
    return output;
  }

  return String(value);
}

export function summarizeText(text = '', maxLength = DEFAULT_PREVIEW_CHARS) {
  const clean = String(text || '');
  return {
    chars: clean.length,
    preview: truncateSingleLine(clean, maxLength)
  };
}

export function normalizeFinalPayload(payload = {}) {
  const response = payload.response ?? payload.finalResponse ?? payload.userMessage ?? '';
  const changedFiles = normalizeList(payload.changedFiles);
  const componentIds = normalizeList(payload.componentIds);

  return {
    route: payload.route,
    status: payload.status || 'completed',
    model: payload.model,
    toolsUsed: normalizeList(payload.toolsUsed),
    filesChanged: changedFiles,
    changedFileCount: changedFiles.length,
    buildStatus: payload.buildStatus ?? null,
    componentIds,
    finalResponseLength: typeof response === 'string'
      ? response.length
      : Number(payload.finalResponseLength || 0),
    mutationCount: payload.mutationCount ?? changedFiles.length,
    toolCallCount: payload.toolCallCount ?? null,
    rounds: payload.rounds ?? null,
    canUndo: payload.canUndo ?? null,
    error: payload.error || null
  };
}

export function normalizeError(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    code: error.code || null
  };
}

function sanitizeBaseContext(context = {}) {
  const prompt = context.prompt ?? context.userPrompt ?? undefined;
  const base = {
    route: context.route || undefined,
    sessionId: context.sessionId || undefined,
    turnId: context.turnId || undefined,
    projectId: context.projectId || undefined,
    sandboxId: context.sandboxId || undefined,
    userId: context.userId || undefined,
    model: context.model || context.modelId || undefined,
    turnType: context.turnType || undefined
  };

  if (prompt !== undefined) {
    const cleanPrompt = String(prompt || '');
    base.promptChars = cleanPrompt.length;
    base.promptPreview = truncateSingleLine(cleanPrompt, DEFAULT_PREVIEW_CHARS);
  }

  return Object.fromEntries(Object.entries(base).filter(([, value]) => value !== undefined));
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  const normalized = [];
  const seen = new Set();
  for (const item of value) {
    const text = typeof item === 'string'
      ? item
      : item?.path || item?.filePath || item?.id || item?.componentId || item?.name;
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
  }
  return normalized;
}

function truncateSingleLine(text = '', maxLength = DEFAULT_PREVIEW_CHARS) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 3))}...`;
}

function defaultDebugLogger(entry) {
  console.log(`[agent-debug] ${JSON.stringify(entry)}`);
}
