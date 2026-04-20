/**
 * Agent API Routes
 * 
 * POST /api/agent/message    — Start agent loop for a user message (SSE stream)
 * POST /api/agent/undo       — Undo the last agent turn
 * 
 * The message endpoint streams SSE events as the agent works:
 *   agent_start     → loop begins
 *   agent_thinking  → model is being called
 *   tool_start      → tool execution starting
 *   tool_result     → tool execution complete
 *   agent_text      → model's text response
 *   agent_complete  → loop finished
 *   agent_error     → error occurred
 */

import express from 'express';
import { runAgentLoop, undoLastTurn } from '../shared/agent-loop.js';

const router = express.Router();

// In-memory session store (per sandbox session)
// In production, this should be persisted to Supabase
const agentSessions = new Map();

function getSession(sandboxId) {
  if (!agentSessions.has(sandboxId)) {
    agentSessions.set(sandboxId, {
      conversationHistory: [],
      snapshots: [],       // Stack of snapshots for undo
      lastActivity: Date.now()
    });
  }
  const session = agentSessions.get(sandboxId);
  session.lastActivity = Date.now();
  return session;
}

// ─── POST /api/agent/message ─────────────────────────────────
// Starts the agent loop and streams SSE events to the client.

router.post('/message', async (req, res) => {
  const {
    prompt,
    sandboxId,
    model = 'google/gemini-3.1-pro-preview'
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  if (!sandboxId && !global.activeSandboxProvider) {
    return res.status(400).json({ success: false, error: 'No active sandbox. Create one first.' });
  }

  const activeSandboxId = sandboxId || global.sandboxData?.sandboxId;
  const session = getSession(activeSandboxId || 'default');

  console.log(`\n[agent-route] POST /api/agent/message`);
  console.log(`[agent-route]   sandbox: ${activeSandboxId || 'global'}`);
  console.log(`[agent-route]   model: ${model}`);
  console.log(`[agent-route]   prompt: "${prompt.trim().slice(0, 80)}${prompt.length > 80 ? '...' : ''}"`);
  console.log(`[agent-route]   history: ${session.conversationHistory.length} messages`);

  // Set up SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  // Keepalive
  const keepalive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
  }, 15000);

  // SSE event emitter
  const sendEvent = (eventType, payload = {}) => {
    try {
      const data = {
        event: eventType,
        timestamp: Date.now(),
        ...payload
      };
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      console.error('[agent] SSE send failed:', e.message);
    }
  };

  try {
    const result = await runAgentLoop({
      prompt: prompt.trim(),
      modelId: model,
      sandboxId: activeSandboxId,
      conversationHistory: session.conversationHistory,
      onEvent: sendEvent
    });

    // Update session
    session.conversationHistory = result.conversationHistory;

    // Push snapshot for undo
    if (result.snapshot && result.mutations.length > 0) {
      session.snapshots.push({
        snapshot: result.snapshot,
        mutations: result.mutations,
        prompt: prompt.trim(),
        timestamp: Date.now()
      });
      // Keep last 10 snapshots
      if (session.snapshots.length > 10) {
        session.snapshots.shift();
      }
    }

    // Final summary event
    sendEvent('agent_done', {
      response: result.response,
      toolCallCount: result.toolCalls.length,
      mutationCount: result.mutations.length,
      rounds: result.rounds,
      canUndo: session.snapshots.length > 0
    });

  } catch (error) {
    console.error('[agent] Loop error:', error);
    sendEvent('agent_error', {
      message: error.message || 'Agent loop failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    clearInterval(keepalive);
    try { res.end(); } catch { /* already closed */ }
  }
});

// ─── POST /api/agent/undo ────────────────────────────────────
// Undo the last agent turn by restoring the snapshot.

router.post('/undo', async (req, res) => {
  console.log('[agent-route] POST /api/agent/undo');
  const { sandboxId } = req.body;
  const activeSandboxId = sandboxId || global.sandboxData?.sandboxId;
  const session = getSession(activeSandboxId || 'default');

  if (session.snapshots.length === 0) {
    return res.status(400).json({ success: false, error: 'Nothing to undo' });
  }

  try {
    const lastEntry = session.snapshots.pop();
    const result = await undoLastTurn(lastEntry.snapshot, activeSandboxId);

    // Also remove the last conversation turn
    if (session.conversationHistory.length >= 2) {
      session.conversationHistory = session.conversationHistory.slice(0, -2);
    }

    res.json({
      success: true,
      restoredFiles: result.restoredFiles,
      undonePrompt: lastEntry.prompt,
      canUndo: session.snapshots.length > 0
    });
  } catch (error) {
    console.error('[agent] Undo error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/agent/session ──────────────────────────────────
// Returns current session state (for UI hydration on reconnect).

router.get('/session', (req, res) => {
  const sandboxId = req.query.sandboxId || global.sandboxData?.sandboxId;
  const session = getSession(sandboxId || 'default');

  res.json({
    success: true,
    conversationLength: session.conversationHistory.length,
    canUndo: session.snapshots.length > 0,
    undoDepth: session.snapshots.length,
    lastActivity: session.lastActivity
  });
});

// ─── POST /api/agent/reset ───────────────────────────────────
// Clear agent session (conversation + snapshots).

router.post('/reset', (req, res) => {
  const { sandboxId } = req.body;
  const activeSandboxId = sandboxId || global.sandboxData?.sandboxId || 'default';
  agentSessions.delete(activeSandboxId);
  res.json({ success: true, message: 'Agent session cleared' });
});

// ─── Cleanup stale sessions ──────────────────────────────────
setInterval(() => {
  const staleThreshold = 2 * 60 * 60 * 1000; // 2 hours
  const now = Date.now();
  for (const [id, session] of agentSessions.entries()) {
    if (now - session.lastActivity > staleThreshold) {
      agentSessions.delete(id);
      console.log(`[agent] Cleaned stale session: ${id}`);
    }
  }
}, 30 * 60 * 1000); // Every 30 minutes

export default router;
