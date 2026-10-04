import crypto from 'node:crypto';
import { supabaseAdmin } from '../supabase-admin.js';
import { RETENTION_DAYS, retentionUntil } from '../retention.js';

const MAX_CONTENT_CHARS = 12000;
const MAX_JSON_CHARS = 20000;
const DEFAULT_HYDRATION_TURN_LIMIT = 12;
const DEFAULT_CONTEXT_TURN_LIMIT = 6;

export function makeSessionKey({ userId = 'anon', projectId = 'none', sandboxId = 'default' } = {}) {
  return [userId || 'anon', projectId || 'none', sandboxId || 'default'].join(':');
}

export async function getOrCreateAgentSession({ userId = null, projectId = null, sandboxId = null, model = null, metadata = {} } = {}) {
  if (!supabaseAdmin) return null;

  const sessionKey = makeSessionKey({ userId, projectId, sandboxId });
  const now = new Date().toISOString();

  try {
    // Merge metadata with any existing session so durable fields set between
    // turns (e.g. referenceImages) survive the per-turn upsert.
    let existingMetadata = {};
    const { data: existing } = await supabaseAdmin
      .from('agent_sessions')
      .select('metadata')
      .eq('session_key', sessionKey)
      .maybeSingle();
    if (existing?.metadata && typeof existing.metadata === 'object') {
      existingMetadata = existing.metadata;
    }

    const payload = {
      session_key: sessionKey,
      user_id: userId,
      project_id: projectId,
      sandbox_id: sandboxId,
      model,
      status: 'active',
      metadata: sanitizeJson({ ...existingMetadata, ...metadata }, {}),
      updated_at: now,
      last_activity: now
    };

    const { data, error } = await supabaseAdmin
      .from('agent_sessions')
      .upsert(payload, { onConflict: 'session_key' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logPersistWarning('getOrCreateAgentSession', error);
    return null;
  }
}

// ─── Durable reference images ────────────────────────────────
// User-attached screenshots are the visual target for the whole session, not
// just one turn. We upload them once to storage and keep public URLs in the
// session metadata so later turns (and server restarts) can re-attach them.

const REFERENCE_IMAGE_BUCKET = 'agent-reference-images';
const MAX_REFERENCE_IMAGES = 4;

export async function persistSessionReferenceImages({ sessionId = null, images = [] } = {}) {
  if (!supabaseAdmin || !sessionId || !Array.isArray(images) || images.length === 0) return [];

  const urls = [];
  try {
    for (const [index, image] of images.slice(0, MAX_REFERENCE_IMAGES).entries()) {
      const parsed = parseDataUrlImage(image);
      if (!parsed) continue;
      const extension = parsed.mimeType.split('/')[1] || 'png';
      const filename = `${sessionId}/${Date.now()}_${index}.${extension}`;

      let { error } = await supabaseAdmin.storage
        .from(REFERENCE_IMAGE_BUCKET)
        .upload(filename, parsed.buffer, { contentType: parsed.mimeType, upsert: true });
      if (error) {
        await supabaseAdmin.storage.createBucket(REFERENCE_IMAGE_BUCKET, { public: true }).catch(() => {});
        ({ error } = await supabaseAdmin.storage
          .from(REFERENCE_IMAGE_BUCKET)
          .upload(filename, parsed.buffer, { contentType: parsed.mimeType, upsert: true }));
      }
      if (error) continue;

      const { data: publicUrlData } = supabaseAdmin.storage.from(REFERENCE_IMAGE_BUCKET).getPublicUrl(filename);
      if (publicUrlData?.publicUrl) urls.push(publicUrlData.publicUrl);
    }

    if (urls.length > 0) {
      await mergeSessionMetadata(sessionId, { referenceImages: urls, referenceImagesUpdatedAt: new Date().toISOString() });
    }
    return urls;
  } catch (error) {
    logPersistWarning('persistSessionReferenceImages', error);
    return urls;
  }
}

export async function loadSessionReferenceImages(sessionId = null) {
  if (!supabaseAdmin || !sessionId) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_sessions')
      .select('metadata')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) throw error;

    const urls = Array.isArray(data?.metadata?.referenceImages) ? data.metadata.referenceImages : [];
    const images = await Promise.all(urls.slice(0, MAX_REFERENCE_IMAGES).map(async (url) => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return null;
        const contentType = (response.headers.get('content-type') || 'image/png').split(';')[0];
        const buffer = Buffer.from(await response.arrayBuffer());
        if (!buffer.length) return null;
        return `data:${contentType};base64,${buffer.toString('base64')}`;
      } catch {
        return null;
      }
    }));
    return images.filter(Boolean);
  } catch (error) {
    logPersistWarning('loadSessionReferenceImages', error);
    return [];
  }
}

async function mergeSessionMetadata(sessionId, patch = {}) {
  const { data } = await supabaseAdmin
    .from('agent_sessions')
    .select('metadata')
    .eq('id', sessionId)
    .maybeSingle();
  const merged = { ...(data?.metadata && typeof data.metadata === 'object' ? data.metadata : {}), ...patch };
  await supabaseAdmin
    .from('agent_sessions')
    .update({ metadata: sanitizeJson(merged, {}) })
    .eq('id', sessionId);
}

function parseDataUrlImage(image) {
  const value = typeof image === 'string'
    ? image
    : (image && typeof image === 'object' ? image.dataUrl || image.url || null : null);
  if (typeof value !== 'string') {
    if (image && typeof image === 'object' && typeof image.base64 === 'string') {
      const mimeType = image.mimeType || image.mediaType || 'image/png';
      try {
        return { mimeType, buffer: Buffer.from(image.base64.replace(/\s/g, ''), 'base64') };
      } catch {
        return null;
      }
    }
    return null;
  }
  const match = value.trim().match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/i);
  if (!match) return null;
  try {
    return { mimeType: match[1] || 'image/png', buffer: Buffer.from(match[2].replace(/\s/g, ''), 'base64') };
  } catch {
    return null;
  }
}

export async function startAgentTurn({ sessionId = null, userId = null, projectId = null, sandboxId = null, model = null, prompt = '', turnType = 'edit' } = {}) {
  if (!supabaseAdmin || !sessionId) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_turns')
      .insert({
        session_id: sessionId,
        user_id: userId,
        project_id: projectId,
        sandbox_id: sandboxId,
        model,
        turn_type: turnType,
        user_prompt: trimText(prompt),
        status: 'running'
      })
      .select('*')
      .single();

    if (error) throw error;

    await appendAgentMessage({
      sessionId,
      turnId: data.id,
      role: 'user',
      content: prompt
    });

    return data;
  } catch (error) {
    logPersistWarning('startAgentTurn', error);
    return null;
  }
}

export async function appendAgentMessage({ sessionId = null, turnId = null, role, content = '', blocks = [], tokenUsage = null } = {}) {
  if (!supabaseAdmin || !sessionId || !role) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_messages')
      .insert({
        session_id: sessionId,
        turn_id: turnId,
        role,
        content: trimText(content),
        blocks: sanitizeJson(blocks, []),
        token_usage: sanitizeJson(tokenUsage, null),
        retention_until: retentionUntil(RETENTION_DAYS.agentMessages)
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logPersistWarning('appendAgentMessage', error);
    return null;
  }
}

export async function appendAgentToolEvent({ sessionId = null, turnId = null, toolName, eventType = 'result', args = {}, result = null, success = null, durationMs = null } = {}) {
  if (!supabaseAdmin || !sessionId || !turnId || !toolName) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_tool_events')
      .insert({
        session_id: sessionId,
        turn_id: turnId,
        tool_name: toolName,
        event_type: eventType,
        args: sanitizeJson(args, {}),
        result: sanitizeJson(result, null),
        success,
        duration_ms: durationMs,
        retention_until: retentionUntil(RETENTION_DAYS.agentToolEvents)
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logPersistWarning('appendAgentToolEvent', error);
    return null;
  }
}

export async function finalizeAgentTurn({
  sessionId = null,
  turnId = null,
  response = '',
  summary = {},
  changedFiles = [],
  componentIds = [],
  buildStatus = null,
  toolCallCount = 0,
  mutationCount = 0,
  rounds = null,
  status = 'completed',
  error = null,
  startedAt = null
} = {}) {
  if (!supabaseAdmin || !sessionId || !turnId) return null;

  const completedAt = new Date();
  const durationMs = startedAt ? Math.max(0, completedAt.getTime() - new Date(startedAt).getTime()) : null;

  try {
    const payload = {
      response_short: trimText(response, 2000),
      summary: sanitizeJson(summary, {}),
      changed_files: sanitizeJson(changedFiles, []),
      component_ids: sanitizeJson(componentIds, []),
      build_status: buildStatus,
      tool_call_count: toolCallCount || 0,
      mutation_count: mutationCount || 0,
      rounds,
      status,
      error: error ? trimText(error, 2000) : null,
      duration_ms: durationMs,
      completed_at: completedAt.toISOString()
    };

    const { data, error: updateError } = await supabaseAdmin
      .from('agent_turns')
      .update(payload)
      .eq('id', turnId)
      .select('id')
      .single();

    if (updateError) throw updateError;

    if (response) {
      await appendAgentMessage({
        sessionId,
        turnId,
        role: 'assistant',
        content: response,
        blocks: [{ type: 'turn_summary', data: sanitizeJson(summary, {}) }]
      });
    }

    await touchAgentSession({ sessionId, status: status === 'failed' ? 'failed' : 'active' });
    return data;
  } catch (persistError) {
    logPersistWarning('finalizeAgentTurn', persistError);
    return null;
  }
}

export async function touchAgentSession({ sessionId = null, status = 'active' } = {}) {
  if (!supabaseAdmin || !sessionId) return null;

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('agent_sessions')
      .update({ status, updated_at: now, last_activity: now })
      .eq('id', sessionId)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logPersistWarning('touchAgentSession', error);
    return null;
  }
}

export async function loadAgentSessionHydration({
  userId = null,
  projectId = null,
  sandboxId = null,
  limit = DEFAULT_HYDRATION_TURN_LIMIT
} = {}) {
  if (!supabaseAdmin) return null;

  try {
    const session = await findAgentSession({ userId, projectId, sandboxId });
    if (!session?.id) {
      return {
        session: null,
        turns: [],
        messages: [],
        conversationHistory: []
      };
    }

    const turnLimit = clampLimit(limit, 1, 50, DEFAULT_HYDRATION_TURN_LIMIT);
    const { data: turns, error: turnsError } = await supabaseAdmin
      .from('agent_turns')
      .select('id, turn_type, user_prompt, response_short, summary, changed_files, component_ids, build_status, tool_call_count, mutation_count, rounds, status, error, created_at, completed_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(turnLimit);

    if (turnsError) throw turnsError;

    const orderedTurns = (turns || []).slice().reverse();
    const messages = turnsToHydratedMessages(orderedTurns);

    return {
      session: {
        id: session.id,
        sessionKey: session.session_key,
        projectId: session.project_id,
        sandboxId: session.sandbox_id,
        model: session.model,
        status: session.status,
        lastActivity: session.last_activity
      },
      turns: orderedTurns.map(toHydratedTurn),
      messages,
      conversationHistory: hydratedMessagesToConversation(messages)
    };
  } catch (error) {
    logPersistWarning('loadAgentSessionHydration', error);
    return null;
  }
}

export async function loadRecentAgentContextBlock({
  sessionId = null,
  userId = null,
  projectId = null,
  sandboxId = null,
  excludeTurnId = null,
  limit = DEFAULT_CONTEXT_TURN_LIMIT
} = {}) {
  if (!supabaseAdmin) return '';

  try {
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const session = await findAgentSession({ userId, projectId, sandboxId });
      activeSessionId = session?.id;
    }
    if (!activeSessionId && !projectId) return '';

    const turnLimit = clampLimit(limit, 1, 12, DEFAULT_CONTEXT_TURN_LIMIT);
    let data = [];

    if (activeSessionId) {
      const sessionResult = await queryRecentTurns({
        sessionId: activeSessionId,
        excludeTurnId,
        limit: turnLimit
      });
      data = sessionResult || [];
    }

    if ((!data || data.length === 0) && projectId) {
      const projectResult = await queryRecentTurns({
        projectId,
        userId,
        excludeTurnId,
        limit: turnLimit
      });
      data = projectResult || [];
    }

    return formatRecentAgentContextBlock((data || []).slice().reverse());
  } catch (error) {
    logPersistWarning('loadRecentAgentContextBlock', error);
    return '';
  }
}

async function queryRecentTurns({ sessionId = null, projectId = null, userId = null, excludeTurnId = null, limit }) {
  let query = supabaseAdmin
    .from('agent_turns')
    .select('id, turn_type, user_prompt, response_short, summary, changed_files, component_ids, build_status, tool_call_count, mutation_count, status, error, created_at')
    .in('status', ['completed', 'failed'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (sessionId) query = query.eq('session_id', sessionId);
  if (projectId) query = query.eq('project_id', projectId);
  if (userId) query = query.eq('user_id', userId);
  if (excludeTurnId) query = query.neq('id', excludeTurnId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function summarizeChangedFiles(mutations = []) {
  if (!Array.isArray(mutations)) return [];

  const seen = new Set();
  const files = [];
  for (const mutation of mutations) {
    const path = mutation?.path || mutation?.filePath;
    if (!path || seen.has(path)) continue;
    seen.add(path);
    files.push({
      path,
      tool: mutation.tool || mutation.toolName || mutation.type || mutation.operation || null,
      timestamp: mutation.timestamp || null
    });
  }
  return files;
}

export function extractComponentIds(toolCalls = []) {
  if (!Array.isArray(toolCalls)) return [];

  const ids = new Set();
  for (const call of toolCalls) {
    const name = typeof call?.toolName === 'object'
      ? call.toolName.name
      : call?.name || call?.toolName || call?.tool;
    if (name !== 'fetch_component_bundle' && name !== 'install_component_bundle') continue;
    const args = call?.args || call?.input || {};
    const result = call?.result || call?.response || call?.output || {};
    const componentId = args.component_id
      || args.componentId
      || result.component_id
      || result.componentId
      || call?.component_id
      || call?.componentId;
    if (componentId) ids.add(componentId);
  }
  return Array.from(ids);
}

export function createLocalTurnId() {
  return crypto.randomUUID();
}

// ─── Durable undo snapshots ──────────────────────────────────
// The in-memory per-sandbox undo stack is a cache; the durable copy in
// agent_undo_snapshots survives server restarts and the 2h session sweep.

const MAX_DURABLE_UNDO_PER_SANDBOX = 10;

export async function pushDurableUndoSnapshot({
  sessionId = null,
  sandboxId = null,
  projectId = null,
  userId = null,
  prompt = '',
  snapshot = null
} = {}) {
  if (!supabaseAdmin || !snapshot?.files || !sandboxId) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_undo_snapshots')
      .insert({
        session_id: sessionId,
        sandbox_id: sandboxId,
        project_id: projectId,
        user_id: userId,
        prompt: trimText(prompt, 1000),
        files: snapshot.files
      })
      .select('id')
      .single();
    if (error) throw error;

    // Prune anything beyond the cap for this sandbox.
    const { data: extras } = await supabaseAdmin
      .from('agent_undo_snapshots')
      .select('id')
      .eq('sandbox_id', sandboxId)
      .order('created_at', { ascending: false })
      .range(MAX_DURABLE_UNDO_PER_SANDBOX, MAX_DURABLE_UNDO_PER_SANDBOX + 20);
    if (Array.isArray(extras) && extras.length > 0) {
      await supabaseAdmin
        .from('agent_undo_snapshots')
        .delete()
        .in('id', extras.map((row) => row.id));
    }

    return data;
  } catch (error) {
    logPersistWarning('pushDurableUndoSnapshot', error);
    return null;
  }
}

/**
 * Pop (fetch + delete) the most recent durable undo snapshot for a sandbox.
 * Returns { snapshot: { id, timestamp, files }, prompt } or null.
 */
export async function popDurableUndoSnapshot({ sandboxId = null } = {}) {
  if (!supabaseAdmin || !sandboxId) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_undo_snapshots')
      .select('id, prompt, files, created_at')
      .eq('sandbox_id', sandboxId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    await supabaseAdmin.from('agent_undo_snapshots').delete().eq('id', data.id);

    return {
      prompt: data.prompt || '',
      snapshot: {
        id: data.id,
        timestamp: new Date(data.created_at).getTime(),
        files: data.files || {}
      }
    };
  } catch (error) {
    logPersistWarning('popDurableUndoSnapshot', error);
    return null;
  }
}

async function findAgentSession({ userId = null, projectId = null, sandboxId = null } = {}) {
  const exactKey = makeSessionKey({ userId, projectId, sandboxId });

  if (sandboxId || projectId || userId) {
    const { data: exactSession, error: exactError } = await supabaseAdmin
      .from('agent_sessions')
      .select('*')
      .eq('session_key', exactKey)
      .maybeSingle();

    if (exactError) throw exactError;
    if (exactSession) return exactSession;
  }

  let query = supabaseAdmin
    .from('agent_sessions')
    .select('*')
    .order('last_activity', { ascending: false })
    .limit(1);

  if (projectId) query = query.eq('project_id', projectId);
  if (userId) query = query.eq('user_id', userId);
  if (!projectId && sandboxId) query = query.eq('sandbox_id', sandboxId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

function turnsToHydratedMessages(turns = []) {
  const messages = [];
  for (const turn of turns) {
    if (turn.user_prompt) {
      messages.push({
        id: `${turn.id}:user`,
        role: 'user',
        type: 'user',
        content: turn.user_prompt,
        timestamp: turn.created_at,
        metadata: {
          source: 'agent_session',
          turnId: turn.id,
          turnType: turn.turn_type
        }
      });
    }

    if (turn.response_short) {
      messages.push({
        id: `${turn.id}:assistant`,
        role: 'assistant',
        type: 'ai-narrator',
        content: turn.response_short,
        timestamp: turn.completed_at || turn.created_at,
        metadata: {
          source: 'agent_session',
          turnId: turn.id,
          turnType: turn.turn_type,
          toolCallCount: turn.tool_call_count || 0,
          mutationCount: turn.mutation_count || 0,
          buildStatus: turn.build_status || null
        }
      });
    }
  }
  return messages;
}

function hydratedMessagesToConversation(messages = []) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role,
      content: message.content
    }));
}

function toHydratedTurn(turn) {
  return {
    id: turn.id,
    turnType: turn.turn_type,
    status: turn.status,
    userPrompt: turn.user_prompt,
    responseShort: turn.response_short,
    summary: turn.summary || {},
    changedFiles: turn.changed_files || [],
    componentIds: turn.component_ids || [],
    buildStatus: turn.build_status || null,
    toolCallCount: turn.tool_call_count || 0,
    mutationCount: turn.mutation_count || 0,
    rounds: turn.rounds || null,
    error: turn.error || null,
    createdAt: turn.created_at,
    completedAt: turn.completed_at
  };
}

function formatRecentAgentContextBlock(turns = []) {
  if (!turns.length) return '';

  const lines = ['[Recent agent turns]'];
  for (const [index, turn] of turns.entries()) {
    // The most recent 2 turns get a fuller record (incl. tool transcript) so
    // the agent doesn't re-discover what it just did.
    const isRecent = index >= turns.length - 2;
    const promptCap = isRecent ? 420 : 220;
    const responseCap = isRecent ? 420 : 220;

    const prompt = trimSingleLine(turn.user_prompt, promptCap);
    const response = trimSingleLine(turn.response_short, responseCap);
    const files = summarizeFileList(turn.changed_files, isRecent ? 14 : 8);
    const components = Array.isArray(turn.component_ids) ? turn.component_ids.filter(Boolean).slice(0, 5) : [];

    lines.push(`- User asked: ${prompt || '(no prompt stored)'}`);
    if (response) lines.push(`  Assistant said: ${response}`);
    if (files) lines.push(`  Changed files: ${files}`);
    if (components.length) lines.push(`  Components used: ${components.join(', ')}`);
    if (turn.build_status) lines.push(`  Build status: ${turn.build_status}`);
    if (turn.status === 'failed' && turn.error) lines.push(`  Last error: ${trimSingleLine(turn.error, 180)}`);

    const transcript = Array.isArray(turn.summary?.toolTranscript) ? turn.summary.toolTranscript : [];
    if (isRecent && transcript.length) {
      lines.push(`  Tool transcript: ${transcript.slice(0, 30).join(' → ')}`);
    }
  }
  lines.push('Use this as continuity context for short follow-up requests. Do not repeat it back unless the user asks.');
  return lines.join('\n');
}

/**
 * Compact a turn's tool calls into a one-line-per-call transcript for durable
 * memory, e.g. "edit_file(src/App.jsx)".
 */
export function compactToolTranscript(toolCalls = [], maxEntries = 30) {
  if (!Array.isArray(toolCalls)) return [];
  return toolCalls.slice(0, maxEntries).map((call) => {
    const name = call?.name || call?.toolName || 'tool';
    const args = call?.args || {};
    const target = args.path || args.filePath || args.component_id || args.keywords || args.pattern || '';
    const suffix = call?.success === false ? '!' : '';
    return target ? `${name}(${trimSingleLine(String(target), 60)})${suffix}` : `${name}${suffix}`;
  });
}

function summarizeFileList(changedFiles, maxFiles = 8) {
  if (!Array.isArray(changedFiles)) return '';
  return changedFiles
    .map((file) => typeof file === 'string' ? file : file?.path)
    .filter(Boolean)
    .slice(0, maxFiles)
    .join(', ');
}

function trimSingleLine(text, maxLength) {
  return trimText(text, maxLength).replace(/\s+/g, ' ').trim();
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
    const json = JSON.stringify(value);
    if (json.length <= MAX_JSON_CHARS) return value;
    return {
      truncated: true,
      originalSize: json.length,
      preview: json.slice(0, MAX_JSON_CHARS)
    };
  } catch {
    return fallback;
  }
}

function trimText(text, maxLength = MAX_CONTENT_CHARS) {
  const clean = String(text || '');
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 3))}...`;
}

function logPersistWarning(operation, error) {
  console.warn(`[agent-session-store] ${operation} skipped: ${error?.message || error}`);
}
