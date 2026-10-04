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
import {
  buildInitialComponentPrompt,
  isLikelyMutatingEditPrompt,
  shouldEnableCatalogToolsForEdit
} from '../lib/agent/component-turn-policy.js';
import { buildAgentContextEnvelope } from '../lib/agent/context-assembler.js';
import { createAgentDebugTimeline, logAgentDebugEvent } from '../lib/agent/debug-timeline.js';
import { persistTurnMemories } from '../lib/agent/memory-manager.js';
import { resolveSandboxProvider } from '../lib/sandbox/provider-resolver.js';
import { buildTemplateCodeAsync, hasRegistryComponents, resolveComponentRefs } from '../lib/registry/registry.js';
import { isProtectedFile, replaceFile } from '../shared/sandbox-fs.js';
import { deriveDesignBrief } from '../lib/design/derive-design-system.js';
import { normalizeProvidedDesignBrief } from '../lib/design/design-intake.js';
import { updateProject } from '../lib/db/projects.js';
import {
  appendAgentToolEvent,
  compactToolTranscript,
  extractComponentIds,
  finalizeAgentTurn,
  getOrCreateAgentSession,
  loadAgentSessionHydration,
  loadSessionReferenceImages,
  persistSessionReferenceImages,
  popDurableUndoSnapshot,
  pushDurableUndoSnapshot,
  startAgentTurn,
  summarizeChangedFiles
} from '../lib/agent/session-store.js';
import {
  normalizePublicModelId,
  resolveModelRole
} from '../shared/model-registry.js';

const router = express.Router();

// ─── Registry mode ───────────────────────────────────────────
// How much the agent leans on registry components:
//   off     write everything from scratch
//   hybrid  use registry components where they fit (default)
//   strict  build mainly from registry components
const PREMIUM_MODE_VALUES = new Set(['off', 'hybrid', 'strict']);

function normalizePremiumMode(value) {
  // With an empty registry there is nothing to browse, so skip the catalog tools.
  if (!hasRegistryComponents()) return 'off';
  const mode = String(value || '').toLowerCase().trim();
  if (mode === 'free') return 'off';
  if (mode === 'premium') return 'strict';
  return PREMIUM_MODE_VALUES.has(mode) ? mode : 'hybrid';
}

function buildModeContextNote(premiumMode) {
  if (premiumMode === 'strict') {
    return '\n\n[Build mode] PREMIUM (strict): Assemble the site primarily from community catalog components (browse_components / install_component_bundle). Custom-code only gaps the catalog cannot fill, and always customize installed components to the user\'s brief.';
  }
  if (premiumMode === 'off') {
    return '\n\n[Build mode] FREE: The community component catalog is disabled for this build. Write all components from scratch.';
  }
  return '';
}

const CARRYOVER_IMAGE_NOTE = '\n\n[Reference images] The attached images are the user\'s reference images from earlier in this session, re-attached by the harness for continuity. Keep steering the design toward them unless the new message changes direction.';

const TEMPLATE_FILE_BLOCK_PATTERN = /<file path="([^"]+)">(\n?)([\s\S]*?)<\/file>/g;

/**
 * Materialize a template's assembled code directly into the sandbox so the
 * agent starts from real files instead of re-interpreting a hidden prompt.
 * Returns the list of written file paths ([] when nothing was written).
 */
async function materializeTemplateIntoSandbox({ templateId, provider, debugTimeline }) {
  if (!templateId || !provider) return [];

  try {
    const result = await buildTemplateCodeAsync(templateId);
    if (!result?.success || !result.code) {
      console.warn(`[agent-initial] Template "${templateId}" could not be assembled`);
      return [];
    }

    const writtenPaths = [];
    let match;
    TEMPLATE_FILE_BLOCK_PATTERN.lastIndex = 0;
    while ((match = TEMPLATE_FILE_BLOCK_PATTERN.exec(result.code)) !== null) {
      const filePath = match[1];
      const content = match[3].trim();
      if (!filePath || !content || isProtectedFile(filePath)) continue;
      try {
        await replaceFile(provider, filePath, content);
        writtenPaths.push(filePath);
      } catch (writeErr) {
        console.warn(`[agent-initial] Template file write failed (${filePath}):`, writeErr.message);
      }
    }

    debugTimeline?.event?.('template_materialized', {
      templateId,
      fileCount: writtenPaths.length,
      missingComponents: result.missingComponents || []
    });
    console.log(`[agent-initial] Template "${templateId}" materialized: ${writtenPaths.length} files`);
    return writtenPaths;
  } catch (error) {
    console.warn(`[agent-initial] Template materialization failed (${templateId}):`, error.message);
    debugTimeline?.error?.('template_materialization_failed', error);
    return [];
  }
}

/**
 * Resolve which images ride on this turn. New images supersede the session's
 * stored references; otherwise the previous references are carried over so the
 * agent never loses its visual target between turns.
 */
async function resolveTurnImages({ session, durableSessionId, images = [] }) {
  if (Array.isArray(images) && images.length > 0) {
    session.referenceImages = images;
    if (durableSessionId) {
      persistLater(
        persistSessionReferenceImages({ sessionId: durableSessionId, images }),
        'persist reference images'
      );
    }
    return { images, carryover: false };
  }

  if (Array.isArray(session.referenceImages) && session.referenceImages.length > 0) {
    return { images: session.referenceImages, carryover: true };
  }

  if (durableSessionId) {
    const restored = await loadSessionReferenceImages(durableSessionId);
    if (restored.length > 0) {
      session.referenceImages = restored;
      return { images: restored, carryover: true };
    }
  }

  return { images: [], carryover: false };
}

// In-memory session store (per sandbox session)
// The durable copy lives in the session store; this is the hot cache.
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

function persistLater(operation, label) {
  if (!operation) return;
  Promise.resolve(operation).catch((error) => {
    console.warn(`[agent-persist] ${label} failed:`, error?.message || error);
  });
}

async function resolveUserId(req) {
  return req.user?.id || null;
}

// ─── POST /api/agent/message ─────────────────────────────────
// Starts the agent loop and streams SSE events to the client.

router.post('/message', async (req, res) => {
  const {
    prompt,
    sandboxId,
    model = resolveModelRole('generalGeneration'),
    buildId,
    projectId: requestProjectId,
    initialComponents = [],
    manualSelectionIds = [],
    images = [],
    premiumMode: requestedPremiumMode
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  let activeSandboxId = sandboxId || global.sandboxData?.sandboxId;
  const sandboxPreflight = await resolveSandboxProvider({
    sandboxId: activeSandboxId,
    allowGlobalFallback: !activeSandboxId,
    allowReconnect: true,
    requireAlive: true
  });
  if (!sandboxPreflight.ok) {
    return res.status(sandboxPreflight.statusCode).json({
      success: false,
      error: sandboxPreflight.message,
      code: sandboxPreflight.code,
      sandboxId: sandboxPreflight.sandboxId
    });
  }
  activeSandboxId = sandboxPreflight.sandboxId || activeSandboxId;
  const activeProjectId = requestProjectId || buildId || null;
  const premiumMode = normalizePremiumMode(requestedPremiumMode);
  // Premium mode overrides the keyword heuristic: strict always gets catalog
  // tools, free never does, hybrid keeps the intent-based gate.
  const enableCatalogTools = premiumMode === 'off'
    ? false
    : premiumMode === 'strict'
      ? true
      : shouldEnableCatalogToolsForEdit({
        prompt,
        initialComponents,
        manualSelectionIds
      });
  const expectedMutation = isLikelyMutatingEditPrompt(prompt);
  const requestedModel = model;
  // Honor the user's explicit model choice. The internal tool-heavy model is
  // only a fallback when the request doesn't specify one.
  const effectiveModel = req.body.model
    ? normalizePublicModelId(requestedModel)
    : enableCatalogTools
      ? resolveModelRole('agentToolHeavy')
      : normalizePublicModelId(requestedModel);
  const debugTimeline = createAgentDebugTimeline({
    route: 'message',
    projectId: activeProjectId,
    sandboxId: activeSandboxId,
    model: effectiveModel,
    requestedModel,
    prompt: prompt.trim(),
    turnType: 'edit'
  });
  debugTimeline.event('request_received', {
    buildId,
    initialComponentCount: initialComponents.length,
    manualSelectionCount: manualSelectionIds.length,
    imageCount: images.length,
    expectedMutation,
    enableCatalogTools,
    requestedModel,
    effectiveModel
  });
  debugTimeline.event('catalog_tool_gate', {
    enabled: enableCatalogTools,
    premiumMode,
    reason: premiumMode !== 'hybrid'
      ? `premium_mode_${premiumMode}`
      : enableCatalogTools ? 'component_section_or_page_intent' : 'ordinary_edit_prompt'
  });

  const authUserId = req.user?.id || null;
  debugTimeline.setContext({ userId: authUserId });

  const session = getSession(activeSandboxId || 'default');
  const durableSession = await getOrCreateAgentSession({
    userId: authUserId,
    projectId: activeProjectId,
    sandboxId: activeSandboxId,
    model: effectiveModel,
    metadata: { route: 'message' }
  });
  const durableTurn = await startAgentTurn({
    sessionId: durableSession?.id,
    userId: authUserId,
    projectId: activeProjectId,
    sandboxId: activeSandboxId,
    model: effectiveModel,
    prompt: prompt.trim(),
    turnType: 'edit'
  });
  const turnStartedAt = durableTurn?.created_at || new Date().toISOString();
  debugTimeline.setContext({
    userId: authUserId,
    sessionId: durableSession?.id,
    turnId: durableTurn?.id
  });
  debugTimeline.event('turn_start', {
    historyLength: session.conversationHistory.length,
    undoDepth: session.snapshots.length,
    durableSession: Boolean(durableSession?.id),
    durableTurn: Boolean(durableTurn?.id)
  });

  console.log(`\n[agent-route] POST /api/agent/message`);
  console.log(`[agent-route]   sandbox: ${activeSandboxId || 'global'}`);
  console.log(`[agent-route]   project: ${activeProjectId || 'none'}`);
  console.log(`[agent-route]   model: ${effectiveModel} (requested: ${requestedModel})`);
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
      debugTimeline.event('sse_event', {
        eventType,
        toolName: payload.toolName,
        success: payload.success,
        payload
      });
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if ((eventType === 'tool_start' || eventType === 'tool_result') && durableSession?.id && durableTurn?.id) {
        persistLater(appendAgentToolEvent({
          sessionId: durableSession.id,
          turnId: durableTurn.id,
          toolName: payload.toolName,
          eventType: eventType === 'tool_start' ? 'start' : 'result',
          args: payload.args,
          result: payload.result,
          success: payload.success
        }), 'append tool event');
      }
    } catch (e) {
      console.error('[agent] SSE send failed:', e.message);
    }
  };

  try {
    debugTimeline.event('context_assembly_start', {
      projectId: activeProjectId,
      sandboxId: activeSandboxId
    });
    const agentContextBlock = await buildAgentContextEnvelope({
      projectId: activeProjectId,
      userId: authUserId,
      sessionId: durableSession?.id,
      sandboxId: activeSandboxId,
      excludeTurnId: durableTurn?.id
    });
    debugTimeline.event('context_ready', {
      contextChars: agentContextBlock.length
    });

    const turnImages = await resolveTurnImages({
      session,
      durableSessionId: durableSession?.id,
      images
    });
    if (turnImages.carryover) {
      debugTimeline.event('reference_images_carried_over', { count: turnImages.images.length });
    }

    const result = await runAgentLoop({
      prompt: prompt.trim(),
      images: turnImages.images,
      modelId: effectiveModel,
      sandboxId: activeSandboxId,
      conversationHistory: session.conversationHistory,
      onEvent: sendEvent,
      enableCatalogTools,
      expectedMutation,
      projectContextBlock: agentContextBlock
        + buildModeContextNote(premiumMode)
        + (turnImages.carryover ? CARRYOVER_IMAGE_NOTE : ''),
      projectId: activeProjectId,
      sessionId: durableSession?.id,
      debugTimeline
    });

    // Update session
    session.conversationHistory = result.conversationHistory;

    // Push snapshot for undo (memory cache + durable copy)
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
      persistLater(pushDurableUndoSnapshot({
        sessionId: durableSession?.id,
        sandboxId: activeSandboxId,
        projectId: activeProjectId,
        userId: authUserId,
        prompt: prompt.trim(),
        snapshot: result.snapshot
      }), 'push durable undo snapshot');
    }

    // Final summary event
    sendEvent('agent_done', {
      response: result.response,
      responseEnvelope: result.responseEnvelope,
      toolCallCount: result.toolCalls.length,
      mutationCount: result.mutations.length,
      rounds: result.rounds,
      buildStatus: result.buildStatus,
      verificationRan: result.verificationRan,
      incompleteReason: result.incompleteReason,
      hitMaxSteps: result.hitMaxSteps,
      canUndo: session.snapshots.length > 0
    });

    const changedFiles = summarizeChangedFiles(result.mutations);
    const componentIds = extractComponentIds(result.toolCalls);
    debugTimeline.final({
      route: 'message',
      model: effectiveModel,
      requestedModel,
      response: result.response,
      toolsUsed: result.toolCalls.map((call) => call.name || call.toolName || call.tool).filter(Boolean),
      changedFiles,
      componentIds,
      buildStatus: result.buildStatus,
      verificationRan: result.verificationRan,
      incompleteReason: result.incompleteReason,
      hitMaxSteps: result.hitMaxSteps,
      toolCallCount: result.toolCalls.length,
      mutationCount: result.mutations.length,
      rounds: result.rounds,
      canUndo: session.snapshots.length > 0
    });

    persistLater(finalizeAgentTurn({
      sessionId: durableSession?.id,
      turnId: durableTurn?.id,
      response: result.response,
      summary: {
        canUndo: session.snapshots.length > 0,
        route: 'message',
        verificationRan: result.verificationRan,
        incompleteReason: result.incompleteReason || null,
        hitMaxSteps: Boolean(result.hitMaxSteps),
        response: result.responseEnvelope || null,
        toolTranscript: compactToolTranscript(result.toolCalls)
      },
      changedFiles,
      componentIds,
      buildStatus: result.buildStatus,
      toolCallCount: result.toolCalls.length,
      mutationCount: result.mutations.length,
      rounds: result.rounds,
      status: 'completed',
      startedAt: turnStartedAt
    }), 'finalize turn');

    persistLater(persistTurnMemories({
      projectId: activeProjectId,
      userId: authUserId,
      turnId: durableTurn?.id,
      prompt: prompt.trim(),
      response: result.response,
      changedFiles,
      componentIds,
      buildStatus: result.buildStatus,
      verificationRan: result.verificationRan,
      incompleteReason: result.incompleteReason || null,
      hitMaxSteps: Boolean(result.hitMaxSteps),
      mutationCount: result.mutations.length,
      toolCallCount: result.toolCalls.length,
      rounds: result.rounds,
      route: 'message',
      turnType: 'edit',
      status: 'completed'
    }), 'persist turn memories');

  } catch (error) {
    console.error('[agent] Loop error:', error);
    debugTimeline.error('turn_error', error, {
      route: 'message',
      projectId: activeProjectId,
      sandboxId: activeSandboxId
    });
    persistLater(finalizeAgentTurn({
      sessionId: durableSession?.id,
      turnId: durableTurn?.id,
      status: 'failed',
      error: error.message || 'Agent loop failed',
      startedAt: turnStartedAt
    }), 'finalize failed turn');
    persistLater(persistTurnMemories({
      projectId: activeProjectId,
      userId: authUserId,
      turnId: durableTurn?.id,
      prompt: prompt.trim(),
      response: '',
      status: 'failed',
      error: error.message || 'Agent loop failed',
      route: 'message',
      turnType: 'edit'
    }), 'persist failed turn memory');
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
  const debugTimeline = createAgentDebugTimeline({
    route: 'undo',
    sandboxId: activeSandboxId,
    prompt: 'undo last agent turn'
  });
  debugTimeline.event('undo_start', {
    undoDepth: session.snapshots.length
  });

  try {
    let lastEntry = session.snapshots.pop() || null;
    if (lastEntry) {
      // Keep the durable stack aligned with the in-memory cache.
      popDurableUndoSnapshot({ sandboxId: activeSandboxId }).catch(() => {});
    } else {
      // Server restarted (or session swept) — fall back to the durable stack.
      lastEntry = await popDurableUndoSnapshot({ sandboxId: activeSandboxId });
      if (lastEntry) {
        debugTimeline.event('undo_durable_fallback', {});
      }
    }

    if (!lastEntry) {
      debugTimeline.event('undo_empty', { undoDepth: 0 });
      return res.status(400).json({ success: false, error: 'Nothing to undo' });
    }

    const result = await undoLastTurn(lastEntry.snapshot, activeSandboxId);

    // Also remove the last conversation turn
    if (session.conversationHistory.length >= 2) {
      session.conversationHistory = session.conversationHistory.slice(0, -2);
    }
    debugTimeline.event('undo_done', {
      restoredFileCount: result.restoredFiles?.length || 0,
      restoredFiles: result.restoredFiles || [],
      canUndo: session.snapshots.length > 0
    });

    res.json({
      success: true,
      restoredFiles: result.restoredFiles,
      undonePrompt: lastEntry.prompt,
      canUndo: session.snapshots.length > 0
    });
  } catch (error) {
    console.error('[agent] Undo error:', error);
    debugTimeline.error('undo_error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/agent/session ──────────────────────────────────
// Returns current session state (for UI hydration on reconnect).

router.get('/session', async (req, res) => {
  const sandboxId = req.query.sandboxId || global.sandboxData?.sandboxId;
  const projectId = req.query.projectId || req.query.buildId || null;
  const shouldHydrate = req.query.hydrate === '1' || req.query.hydrate === 'true';
  const session = getSession(sandboxId || 'default');

  const response = {
    success: true,
    conversationLength: session.conversationHistory.length,
    canUndo: session.snapshots.length > 0,
    undoDepth: session.snapshots.length,
    lastActivity: session.lastActivity
  };

  if (shouldHydrate) {
    const authUserId = await resolveUserId(req);
    const hydration = await loadAgentSessionHydration({
      userId: authUserId,
      projectId,
      sandboxId,
      limit: req.query.limit
    });

    if (hydration?.conversationHistory?.length && session.conversationHistory.length === 0) {
      session.conversationHistory = hydration.conversationHistory;
    }

    response.hydrated = Boolean(hydration?.session);
    response.durableSession = hydration?.session || null;
    response.turns = hydration?.turns || [];
    response.messages = hydration?.messages || [];
    response.conversationLength = Math.max(response.conversationLength, hydration?.conversationHistory?.length || 0);
  }

  res.json(response);
});

// ─── POST /api/agent/reset ───────────────────────────────────
// Clear agent session (conversation + snapshots).

router.post('/reset', (req, res) => {
  const { sandboxId } = req.body;
  const activeSandboxId = sandboxId || global.sandboxData?.sandboxId || 'default';
  agentSessions.delete(activeSandboxId);
  logAgentDebugEvent('session_reset', {
    route: 'reset',
    sandboxId: activeSandboxId
  });
  res.json({ success: true, message: 'Agent session cleared' });
});

/**
 * Specialized System Prompt for Initial Build Phase
 * This prompt instructs the agent to be more autonomous, proactive, and thorough.
 */
const INITIAL_BUILD_SYSTEM_PROMPT = `You are the Volturiano Agentic Site Architect.
Your goal is to build a complete, high-end, TAILORED website from scratch based on a user's prompt inside a live Vite sandbox.

CAPABILITIES:
0. Page Architecture: For sites that need multiple routes (shops, restaurants, multi-service businesses), call 'plan_pages' FIRST to get a page graph, then implement it with react-router-dom (src/pages/<Name>.jsx per page, shared Nav, <Routes> in App.jsx). Simple landing pages can skip this and stay single-page multi-section.
1. Browse Community Components: Use 'browse_components' to find existing premium components that match the user's industry/style.
2. Fetch Component Code: Use 'fetch_component_bundle' for small components when you need to inspect/adapt source. Large shader/WebGL files may be summarized to protect context.
3. Install Component Bundles: Use 'install_component_bundle' for large visual/shader components or pre-selected components you want to use mostly as-is. It writes files directly into the sandbox without loading huge source into your context.
4. File Management: Use 'create_file', 'edit_file', and 'replace_file' to build the project structure (src/App.jsx, src/components, etc.).
5. Vision: You can see images provided by the user to match their design aesthetic.
If images are attached, they are primary visual context. When the user says "the following website" or similar, replicate the screenshot's real structure, domain, colors, spacing, product hierarchy, and visible content direction instead of substituting a generic catalog theme.

OBJECTIVES:
- Standard Structure: Always create a clean React + Tailwind structure. Use 'src/App.jsx' as the main entry point and 'src/index.css' for styles.
- Tailored Design: Match the industry, colors, and fonts requested by the user. Use modern CSS (glassmorphism, animations).
- Component Plan: Think in page sections first. Browse by section, install or fetch only the best-fit bundle for that section, avoid duplicate bundles, and custom-code missing gaps when the catalog fit is weak.
- Component Integration: If components are provided or found, install or fetch them and integrate them into App.jsx. Ensure all imports are correct.
- Verification: Call 'get_build_errors' to ensure everything compiles.
- Completeness: Build a functional, beautiful site. Don't leave placeholders.

COMPONENT CUSTOMIZATION (MANDATORY — DO NOT SKIP):
Components from the library are GENERIC templates. You MUST customize every installed component to match the user's specific site purpose, industry, and aesthetic. Never leave library defaults.

1. **Copy & Headlines**: After installing a component, READ it and REWRITE all user-visible text:
   - Headlines and subheadlines must reflect the user's industry/purpose (e.g., "website agency" → "We Craft Digital Experiences", not "Welcome to Our Website")
   - Button labels, nav links, testimonials, stat numbers, feature descriptions — ALL must be tailored
   - Replace generic brand names ("Acme", "Studio", "Brand") with content fitting the user's site goal
   - Pricing tiers, team member names, service descriptions — rewrite to match the industry
2. **Color Theme**: Update color values, gradients, and accent tokens to match the user's requested color scheme:
   - If the user says "dark blue black theme", change component colors to deep navy (#0a0e27), midnight (#0d1117), electric blue (#3b82f6), etc.
   - Update both inline styles AND Tailwind classes (bg-*, text-*, border-* tokens)
   - Pass color props where components accept them (e.g., \`color\`, \`accentColor\`, \`theme\`)
3. **Structural Content**: Ensure each component has proper content for its role:
   - Hero sections need industry-specific headline + subheadline + CTA overlaid on the visual effect
   - Feature sections need real service/feature descriptions relevant to the user's site goal
   - Footer needs relevant links, company info, and consistent branding
4. **Do NOT strip content layers**: If a visual component (Hero, Banner) needs text overlay, keep the overlay div with customized content. Don't reduce sections to just the visual effect.

STEP BUDGET STRATEGY:
You have a limited step budget. Allocate wisely:
- Install components: ~1 step each (batch if possible)
- Wire up UserComponent/App.jsx: ~2 steps
- READ + CUSTOMIZE each installed component: ~2 steps per component (read then edit)
- Build verification: 1 step
- DO NOT spend multiple steps retrying failed edits on the same file. If edit_file fails, read the file once, then use replace_file.

If the user has pre-selected components, your first priority is to install them with install_component_bundle when available, or fetch their code and write the returned files with create_file or replace_file when the source is small enough to inspect safely.
If source is clipped or omitted, do not repeatedly fetch/read the same huge file. Use the installed paths and only read targeted line windows if you must edit internals.
Then, browse for missing sections (e.g., if there's no Footer, find one).
After installing and wiring all components, spend your remaining steps CUSTOMIZING each component's text and colors to match the user's vision. This is the most important part — the difference between a generic template and a tailored website.

VISIBLE RESPONSE STYLE:
After the build is complete, keep the user-facing response short and calm. Tool cards already show detail. Use one concise sentence or up to 3 clear bullets.

The harness manages your step budget, warns you when it runs low, and grants extra repair steps if verification fails. After your build passes, the harness may show you a screenshot of the rendered site — review it like a senior designer and fix real visual problems before finishing. Work efficiently: install fast, customize thoroughly.`;

router.post('/initial-build', async (req, res) => {
  const {
    prompt,
    sandboxId,
    buildId,
    projectId: requestProjectId,
    model = resolveModelRole('generalGeneration'),
    initialComponents = [],
    manualSelectionIds = [],
    images = [],
    premiumMode: requestedPremiumMode,
    templateId = null,
    designBrief: providedDesignBrief = null
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  // Resolve the sandbox first so a missing or paused workspace fails before any model call.
  let activeSandboxId = sandboxId || global.sandboxData?.sandboxId;
  const sandboxPreflight = await resolveSandboxProvider({
    sandboxId: activeSandboxId,
    allowGlobalFallback: !activeSandboxId,
    allowReconnect: true,
    requireAlive: true
  });
  if (!sandboxPreflight.ok) {
    return res.status(sandboxPreflight.statusCode).json({
      success: false,
      error: sandboxPreflight.message,
      code: sandboxPreflight.code,
      sandboxId: sandboxPreflight.sandboxId
    });
  }
  activeSandboxId = sandboxPreflight.sandboxId || activeSandboxId;

  const activeProjectId = requestProjectId || buildId || null;
  const premiumMode = normalizePremiumMode(requestedPremiumMode);
  const normalizedProvidedDesignBrief = normalizeProvidedDesignBrief(providedDesignBrief);
  const requestedModel = model;
  // Honor the user's model choice on initial builds; the internal tool-heavy
  // model is only the default when no model is requested.
  const effectiveModel = req.body.model
    ? normalizePublicModelId(requestedModel)
    : resolveModelRole('agentToolHeavy');
  const enableCatalogTools = premiumMode !== 'off';
  const debugTimeline = createAgentDebugTimeline({
    route: 'initial-build',
    projectId: activeProjectId,
    sandboxId: activeSandboxId,
    model: effectiveModel,
    requestedModel,
    prompt: prompt.trim(),
    turnType: 'initial_build'
  });
  debugTimeline.event('request_received', {
    buildId,
    initialComponentCount: initialComponents.length,
    manualSelectionCount: manualSelectionIds.length,
    imageCount: images.length,
    providedDesignBrief: Boolean(normalizedProvidedDesignBrief),
    requestedModel,
    effectiveModel
  });
  const authUserId = req.user?.id || null;
  debugTimeline.setContext({ userId: authUserId });

  // Agentic builder turns are bound to the preflighted sandbox id.
  debugTimeline.setContext({ sandboxId: activeSandboxId });

  const session = getSession(activeSandboxId || 'default');
  const durableSession = await getOrCreateAgentSession({
    userId: authUserId,
    projectId: activeProjectId,
    sandboxId: activeSandboxId,
    model: effectiveModel,
    metadata: { route: 'initial-build' }
  });
  const durableTurn = await startAgentTurn({
    sessionId: durableSession?.id,
    userId: authUserId,
    projectId: activeProjectId,
    sandboxId: activeSandboxId,
    model: effectiveModel,
    prompt: prompt.trim(),
    turnType: 'initial_build'
  });
  const turnStartedAt = durableTurn?.created_at || new Date().toISOString();
  debugTimeline.setContext({
    userId: authUserId,
    sessionId: durableSession?.id,
    turnId: durableTurn?.id
  });
  debugTimeline.event('turn_start', {
    historyLength: session.conversationHistory.length,
    undoDepth: session.snapshots.length,
    durableSession: Boolean(durableSession?.id),
    durableTurn: Boolean(durableTurn?.id)
  });

  console.log(`\n[agent-initial] POST /api/agent/initial-build`);
  console.log(`[agent-initial]   sandbox: ${activeSandboxId || 'global'}`);
  console.log(`[agent-initial]   project: ${activeProjectId || 'none'}`);
  console.log(`[agent-initial]   model: ${effectiveModel} (requested: ${requestedModel})`);
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
      debugTimeline.event('sse_event', {
        eventType: event,
        toolName: data?.toolName,
        success: data?.success,
        payload: data
      });
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      if ((event === 'tool_start' || event === 'tool_result') && durableSession?.id && durableTurn?.id) {
        persistLater(appendAgentToolEvent({
          sessionId: durableSession.id,
          turnId: durableTurn.id,
          toolName: data.toolName,
          eventType: event === 'tool_start' ? 'start' : 'result',
          args: data.args,
          result: data.result,
          success: data.success
        }), 'append initial tool event');
      }
    } catch { /* stream closed */ }
  };

  const keepalive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
  }, 15000);

  // Normalize component references to catalog slugs so the model sees one ID
  // dialect: the human UI passes UUIDs while browse_components returns slugs.
  let resolvedInitialComponents = initialComponents;
  let resolvedManualSelectionIds = manualSelectionIds;
  try {
    const allRefs = [
      ...initialComponents.map((c) => (typeof c === 'object' && c ? c.id || c.component_id : c)),
      ...manualSelectionIds
    ].filter(Boolean);
    const refs = await resolveComponentRefs(allRefs);
    if (refs.size > 0) {
      resolvedInitialComponents = initialComponents.map((component) => {
        const key = String((typeof component === 'object' && component ? component.id || component.component_id : component) || '').trim();
        const ref = refs.get(key);
        if (!ref) return component;
        return typeof component === 'object' && component
          ? { ...component, id: ref.slug, name: component.name || ref.name }
          : { id: ref.slug, name: ref.name };
      });
      resolvedManualSelectionIds = manualSelectionIds.map((id) => refs.get(String(id || '').trim())?.slug || id);
      debugTimeline.event('component_refs_resolved', {
        requested: allRefs.length,
        resolved: refs.size
      });
    }
  } catch (refErr) {
    console.warn('[agent-initial] Component ref resolution skipped:', refErr.message);
  }

  // Template mode: write the template's assembled files into the sandbox so
  // the agent starts from a real, working site and spends its budget on
  // customization instead of re-deriving the structure from a prompt.
  let templateNote = '';
  if (templateId) {
    const templateFiles = await materializeTemplateIntoSandbox({
      templateId,
      provider: sandboxPreflight.provider,
      debugTimeline
    });
    if (templateFiles.length > 0) {
      templateNote = [
        '',
        `[Template installed] The "${templateId}" template files are ALREADY written into the sandbox:`,
        templateFiles.map((path) => `- ${path}`).join('\n'),
        'Do NOT rebuild the structure from scratch. Read the key files, then customize copy, colors, imagery, and sections to the user\'s brief. Replace every generic placeholder.'
      ].join('\n');
    }
  }

  // Prepare final prompt with context about pre-selected components
  const finalPrompt = buildInitialComponentPrompt({
    prompt,
    initialComponents: resolvedInitialComponents,
    manualSelectionIds: resolvedManualSelectionIds
  }) + templateNote;
  if (finalPrompt !== prompt.trim()) {
    debugTimeline.event('initial_components_attached', {
      initialComponentCount: initialComponents.length,
      manualSelectionCount: manualSelectionIds.length,
      finalPromptChars: finalPrompt.length
    });
  }

  try {
    debugTimeline.event('context_assembly_start', {
      projectId: activeProjectId,
      sandboxId: activeSandboxId
    });
    // Derive the design brief in parallel with context assembly. It becomes
    // the project's persistent art direction (palette, type, imagery, tone).
    const [agentContextBlock, designBrief] = await Promise.all([
      buildAgentContextEnvelope({
        projectId: activeProjectId,
        userId: authUserId,
        sessionId: durableSession?.id,
        sandboxId: activeSandboxId,
        excludeTurnId: durableTurn?.id
      }),
      normalizedProvidedDesignBrief
        ? Promise.resolve(normalizedProvidedDesignBrief)
        : deriveDesignBrief({ prompt: prompt.trim(), images })
    ]);
    debugTimeline.event('context_ready', {
      contextChars: agentContextBlock.length,
      hasDesignBrief: Boolean(designBrief)
    });

    if (designBrief) {
      // Persist so every later edit turn inherits the same art direction.
      persistLater(updateProject(activeProjectId, { design_system: designBrief }), 'persist design system');
      sendEvent('agent_design_brief', {
        industry: designBrief.industryCategory,
        mood: designBrief.mood,
        mode: designBrief.colorPalette?.mode,
        primary: designBrief.colorPalette?.primary,
        accent: designBrief.colorPalette?.accent,
        headingFont: designBrief.typography?.headingFont,
        bodyFont: designBrief.typography?.bodyFont,
        personality: designBrief.designPersonality || []
      });
    }

    // Initial build: any attached images become the session's durable visual
    // reference so follow-up edit turns keep steering toward them.
    if (Array.isArray(images) && images.length > 0) {
      session.referenceImages = images;
      if (durableSession?.id) {
        persistLater(
          persistSessionReferenceImages({ sessionId: durableSession.id, images }),
          'persist initial reference images'
        );
      }
    }

    const result = await runAgentLoop({
      prompt: finalPrompt,
      images, // Pass user-provided images to the agent
      modelId: effectiveModel,
      sandboxId: activeSandboxId,
      conversationHistory: session.conversationHistory,
      onEvent: sendEvent,
      systemPromptOverride: INITIAL_BUILD_SYSTEM_PROMPT,
      maxStepsOverride: 35,
      enableCatalogTools,
      projectContextBlock: agentContextBlock + buildModeContextNote(premiumMode),
      projectId: activeProjectId,
      sessionId: durableSession?.id,
      isInitialBuild: true,
      designBrief,
      debugTimeline
    });

    // Update conversation history
    session.conversationHistory = result.conversationHistory;

    // Store snapshot for undo (memory cache + durable copy)
    if (result.snapshot) {
      session.snapshots.push({
        snapshot: result.snapshot,
        prompt: prompt.trim(),
        timestamp: Date.now()
      });
      if (session.snapshots.length > 10) {
        session.snapshots.shift();
      }
      persistLater(pushDurableUndoSnapshot({
        sessionId: durableSession?.id,
        sandboxId: activeSandboxId,
        projectId: activeProjectId,
        userId: authUserId,
        prompt: prompt.trim(),
        snapshot: result.snapshot
      }), 'push durable undo snapshot');
    }

    // Final summary event
    sendEvent('agent_done', {
      response: result.response,
      responseEnvelope: result.responseEnvelope,
      toolCallCount: result.toolCalls.length,
      mutationCount: result.mutations.length,
      rounds: result.rounds,
      buildStatus: result.buildStatus,
      verificationRan: result.verificationRan,
      incompleteReason: result.incompleteReason,
      hitMaxSteps: result.hitMaxSteps,
      canUndo: session.snapshots.length > 0,
      isInitialBuild: true
    });

    const changedFiles = summarizeChangedFiles(result.mutations);
    const componentIds = extractComponentIds(result.toolCalls);
    debugTimeline.final({
      route: 'initial-build',
      model: effectiveModel,
      requestedModel,
      response: result.response,
      toolsUsed: result.toolCalls.map((call) => call.name || call.toolName || call.tool).filter(Boolean),
      changedFiles,
      componentIds,
      buildStatus: result.buildStatus,
      verificationRan: result.verificationRan,
      incompleteReason: result.incompleteReason,
      hitMaxSteps: result.hitMaxSteps,
      toolCallCount: result.toolCalls.length,
      mutationCount: result.mutations.length,
      rounds: result.rounds,
      canUndo: session.snapshots.length > 0
    });

    persistLater(finalizeAgentTurn({
      sessionId: durableSession?.id,
      turnId: durableTurn?.id,
      response: result.response,
      summary: {
        canUndo: session.snapshots.length > 0,
        route: 'initial-build',
        isInitialBuild: true,
        verificationRan: result.verificationRan,
        incompleteReason: result.incompleteReason || null,
        hitMaxSteps: Boolean(result.hitMaxSteps),
        response: result.responseEnvelope || null,
        toolTranscript: compactToolTranscript(result.toolCalls)
      },
      changedFiles,
      componentIds,
      buildStatus: result.buildStatus,
      toolCallCount: result.toolCalls.length,
      mutationCount: result.mutations.length,
      rounds: result.rounds,
      status: 'completed',
      startedAt: turnStartedAt
    }), 'finalize initial turn');

    persistLater(persistTurnMemories({
      projectId: activeProjectId,
      userId: authUserId,
      turnId: durableTurn?.id,
      prompt: prompt.trim(),
      response: result.response,
      changedFiles,
      componentIds,
      buildStatus: result.buildStatus,
      verificationRan: result.verificationRan,
      incompleteReason: result.incompleteReason || null,
      hitMaxSteps: Boolean(result.hitMaxSteps),
      mutationCount: result.mutations.length,
      toolCallCount: result.toolCalls.length,
      rounds: result.rounds,
      route: 'initial-build',
      turnType: 'initial_build',
      status: 'completed'
    }), 'persist initial turn memories');

  } catch (error) {
    console.error('[agent-initial] Loop error:', error);
    debugTimeline.error('turn_error', error, {
      route: 'initial-build',
      projectId: activeProjectId,
      sandboxId: activeSandboxId
    });
    persistLater(finalizeAgentTurn({
      sessionId: durableSession?.id,
      turnId: durableTurn?.id,
      status: 'failed',
      error: error.message || 'Agent initial build failed',
      startedAt: turnStartedAt
    }), 'finalize failed initial turn');
    persistLater(persistTurnMemories({
      projectId: activeProjectId,
      userId: authUserId,
      turnId: durableTurn?.id,
      prompt: prompt.trim(),
      response: '',
      status: 'failed',
      error: error.message || 'Agent initial build failed',
      route: 'initial-build',
      turnType: 'initial_build'
    }), 'persist failed initial turn memory');
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
