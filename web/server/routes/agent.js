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
import { supabaseAdmin } from '../lib/supabase-admin.js';

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
    model = 'google/gemini-3.1-pro-preview',
    buildId,
    initialComponents = [],
    manualSelectionIds = [],
    images = []
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  if (!sandboxId && !global.activeSandboxProvider) {
    return res.status(400).json({ success: false, error: 'No active sandbox. Create one first.' });
  }

  const activeSandboxId = sandboxId || global.sandboxData?.sandboxId;

  // ─── Credit Deduction (same pattern as apply-ai-code-stream) ────
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (user && !authError) {
        const { data: deductData, error: deductError } = await supabaseAdmin.rpc('deduct_credits_safe', {
          p_user_id: user.id,
          p_amount: 1,
          p_description: 'Agent Mode Edit',
          p_project_id: req.body.buildId || null
        });

        if (deductError || !deductData || !deductData.success) {
          console.warn(`[agent] Credit deduction failed for user ${user.id}: ${deductError?.message || deductData?.error}`);
          return res.status(402).json({ success: false, error: 'Creative Energy Depleted. Please recharge your credits.' });
        }
        console.log(`[agent] Successfully deducted 1 credit for user ${user.id}`);
      }
    } catch (e) {
      console.warn('[agent] Credit check error (non-fatal):', e.message);
    }
  } else {
    console.log('[agent] No auth token provided, skipping credit check (Guest mode/Local).');
  }

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

/**
 * Specialized System Prompt for Initial Build Phase
 * This prompt instructs the agent to be more autonomous, proactive, and thorough.
 */
const INITIAL_BUILD_SYSTEM_PROMPT = `You are the Volturiano Agentic Site Architect.
Your goal is to build a complete, high-end website from scratch based on a user's prompt inside a live Vite sandbox.

CAPABILITIES:
1. Browse Community Components: Use 'browse_components' to find existing premium components that match the user's industry/style.
2. Fetch Component Code: Use 'fetch_component_bundle' to get the raw JSX/CSS for pre-selected or newly found components.
3. File Management: Use 'create_file', 'edit_file', and 'replace_file' to build the project structure (src/App.jsx, src/components, etc.).
4. Vision: You can see images provided by the user to match their design aesthetic.

OBJECTIVES:
- Standard Structure: Always create a clean React + Tailwind structure. Use 'src/App.jsx' as the main entry point and 'src/index.css' for styles.
- Tailored Design: Match the industry, colors, and fonts requested by the user. Use modern CSS (glassmorphism, animations).
- Component Integration: If components are provided or found, fetch them and integrate them into App.jsx. Ensure all imports are correct.
- Verification: Call 'get_build_errors' to ensure everything compiles.
- Completeness: Build a functional, beautiful site. Don't leave placeholders.

If the user has pre-selected components, your first priority is to fetch their code and integrate them. 
Then, browse for missing sections (e.g., if there's no Footer, find one).
Finally, write the glue code (App.jsx, siteMap.js) and refine the design.

You have a 25-step limit. Work efficiently.`;

router.post('/initial-build', async (req, res) => {
  const {
    prompt,
    sandboxId,
    buildId,
    model = 'google/gemini-3.1-pro-preview',
    initialComponents = [],
    manualSelectionIds = [],
    images = []
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  // ─── Credit Deduction ────
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (user && !authError) {
        const { data: deductData, error: deductError } = await supabaseAdmin.rpc('deduct_credits_safe', {
          p_user_id: user.id,
          p_amount: 1,
          p_description: 'Agent Mode Initial Build',
          p_project_id: buildId || null
        });

        if (deductError || !deductData || !deductData.success) {
          console.warn(`[agent-initial] Credit deduction failed for user ${user.id}: ${deductError?.message || deductData?.error}`);
          return res.status(402).json({ success: false, error: 'Creative Energy Depleted. Please recharge your credits.' });
        }
        console.log(`[agent-initial] Successfully deducted 1 credit for user ${user.id}`);
      }
    } catch (e) {
      console.warn('[agent-initial] Credit check error (non-fatal):', e.message);
    }
  }

  // Resolve or use existing sandbox
  const activeSandboxId = sandboxId || global.sandboxData?.sandboxId;

  if (!activeSandboxId && !global.activeSandboxProvider) {
    return res.status(400).json({ success: false, error: 'No active sandbox. Create one first.' });
  }

  const session = getSession(activeSandboxId || 'default');

  console.log(`\n[agent-initial] POST /api/agent/initial-build`);
  console.log(`[agent-initial]   sandbox: ${activeSandboxId || 'global'}`);
  console.log(`[agent-initial]   model: ${model}`);
  console.log(`[agent-initial]   buildId: ${buildId || 'none'}`);
  console.log(`[agent-initial]   prompt: "${prompt.trim().slice(0, 80)}${prompt.length > 80 ? '...' : ''}"`);
  console.log(`[agent-initial]   initialComps: ${initialComponents.length}`);

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  const sendEvent = (event, data) => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch { /* stream closed */ }
  };

  const keepalive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
  }, 15000);

  // Prepare final prompt with context about pre-selected components
  let finalPrompt = prompt.trim();
  if (initialComponents.length > 0 || manualSelectionIds.length > 0) {
    const list = initialComponents.map(c => `- ${c.name} (ID: ${c.id})`).join('\n');
    finalPrompt = `User has pre-selected the following components for this build:\n${list}\n\nUser's Vision: ${finalPrompt}\n\nPlease fetch these pre-selected components FIRST using 'fetch_component_bundle' and integrate them into the project.`;
  }

  try {
    const result = await runAgentLoop({
      prompt: finalPrompt,
      images, // Pass user-provided images to the agent
      modelId: model,
      sandboxId: activeSandboxId,
      conversationHistory: session.conversationHistory,
      onEvent: sendEvent,
      systemPromptOverride: INITIAL_BUILD_SYSTEM_PROMPT,
      maxStepsOverride: 25,
      enableCatalogTools: true
    });

    // Update conversation history
    session.conversationHistory = result.conversationHistory;

    // Store snapshot for undo
    if (result.snapshot) {
      session.snapshots.push({
        snapshot: result.snapshot,
        prompt: prompt.trim(),
        timestamp: Date.now()
      });
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
      canUndo: session.snapshots.length > 0,
      isInitialBuild: true
    });

  } catch (error) {
    console.error('[agent-initial] Loop error:', error);
    sendEvent('agent_error', {
      message: error.message || 'Agent initial build failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    clearInterval(keepalive);
    try { res.end(); } catch { /* already closed */ }
  }
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
