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
  const payload = {
    session_key: sessionKey,
    user_id: userId,
    project_id: projectId,
    sandbox_id: sandboxId,
    model,
    status: 'active',
    metadata: sanitizeJson(metadata, {}),
    updated_at: now,
    last_activity: now
  };

  try {
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
    .select('id, turn_type, user_prompt, response_short, changed_files, component_ids, build_status, tool_call_count, mutation_count, status, error, created_at')
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
  for (const turn of turns) {
    const prompt = trimSingleLine(turn.user_prompt, 220);
    const response = trimSingleLine(turn.response_short, 220);
    const files = summarizeFileList(turn.changed_files);
    const components = Array.isArray(turn.component_ids) ? turn.component_ids.filter(Boolean).slice(0, 5) : [];

    lines.push(`- User asked: ${prompt || '(no prompt stored)'}`);
    if (response) lines.push(`  Assistant said: ${response}`);
    if (files) lines.push(`  Changed files: ${files}`);
    if (components.length) lines.push(`  Components used: ${components.join(', ')}`);
    if (turn.build_status) lines.push(`  Build status: ${turn.build_status}`);
    if (turn.status === 'failed' && turn.error) lines.push(`  Last error: ${trimSingleLine(turn.error, 180)}`);
  }
  lines.push('Use this as continuity context for short follow-up requests. Do not repeat it back unless the user asks.');
  return lines.join('\n');
}

function summarizeFileList(changedFiles) {
  if (!Array.isArray(changedFiles)) return '';
  return changedFiles
    .map((file) => typeof file === 'string' ? file : file?.path)
    .filter(Boolean)
    .slice(0, 8)
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
