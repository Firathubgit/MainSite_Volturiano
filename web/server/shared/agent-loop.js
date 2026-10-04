/**
 * Agent Loop — Harness-Owned Round Controller
 *
 * Runs the AI agent loop one model round at a time so the harness stays in
 * control between rounds. This enables:
 *   - Mid-loop message injection (verification results, screenshots, notes)
 *   - Dynamic step budgets (+repair steps when verification fails)
 *   - Enforced end-of-turn verification (a turn cannot silently end broken)
 *   - A visual self-review pass (the agent sees a screenshot of its own work)
 *
 * Both provider paths (Vercel AI SDK and native @google/genai for Gemini 3.x
 * thought signatures) share the same controller via thin adapters, so harness
 * behavior is identical regardless of model.
 */

import { generateText } from 'ai';
import { GoogleGenAI } from '@google/genai';
import { getModel, resolveAvailableModelId } from '../lib/provider-helpers.js';
import {
  listFiles, createSnapshot, restoreSnapshot, replaceFile
} from './sandbox-fs.js';
import {
  designBriefToContextBlock,
  designBriefToMarkdown,
  designBriefToTokensCss
} from '../lib/design/derive-design-system.js';
import { requireSandboxProvider } from '../lib/sandbox/provider-resolver.js';
import { normalizeAgentResponse } from '../lib/agent/response-normalizer.js';
import { isLikelyMutatingEditPrompt } from '../lib/agent/component-turn-policy.js';
import {
  buildMultimodalUserContent,
  toGeminiPartsFromContent
} from '../lib/agent/image-attachments.js';
import {
  bundleToFiles as runtimeBundleToFiles,
  createAgentToolRuntime,
  toGeminiToolExecutors,
  toVercelTools
} from '../lib/agent/tool-runtime.js';
import { captureViewportScreenshots } from '../lib/screenshot.js';
import { MODEL_IDS, normalizeModelId, resolveModelRole } from './model-registry.js';

// ─── Constants ───────────────────────────────────────────────

const MAX_STEPS = 20;            // Base model↔tool round budget per user message
const REPAIR_STEPS = 5;          // Extra rounds granted when verification fails
const MAX_REPAIR_ROUNDS = 2;     // How many failure→repair extensions are allowed
const VISUAL_REVIEW_STEPS = 6;   // Extra rounds granted for the screenshot self-review
const LOW_BUDGET_WARNING_AT = 3; // Inject a calm heads-up when this many rounds remain

// Gemini 3.x models require thought signatures in multi-turn tool calling.
// @ai-sdk/google v1 doesn't support this, so we use @google/genai natively.
const GEMINI_3X_MODELS = new Set([
  MODEL_IDS.GEMINI_35_FLASH,
  MODEL_IDS.GEMINI_31_PRO_PREVIEW,
  MODEL_IDS.GEMINI_31_PRO_CUSTOMTOOLS,
  MODEL_IDS.GEMINI_31_FLASH_LITE,
]);

// Native Google GenAI SDK client (for Gemini 3.x), created on first use.
let nativeGoogleClient = null;
function getNativeGoogleAI() {
  if (!nativeGoogleClient) nativeGoogleClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return nativeGoogleClient;
}

export const bundleToFiles = runtimeBundleToFiles;

// ─── System Prompt ───────────────────────────────────────────

const AGENT_SYSTEM_PROMPT = `You are an expert frontend developer working inside a live React + Tailwind project sandbox powered by Vite.

## Workflow — ALWAYS follow this order:
1. **Understand**: Read the relevant file(s) to fully understand the current code before changing anything.
2. **Plan**: Decide exactly what changes to make before editing.
3. **Execute**: Make all your edits. Batch related changes together — don't make one tiny change per step.
4. **Verify**: Call get_build_errors once after all edits are done.
5. **Respond**: Give a short, user-facing completion message.

## Critical Rules
- **Never experiment or trial-and-error.** Do not make a change just to test a theory, then revert it. Understand the code first, then make the correct fix once.
- **Never revert your own changes.** If you realize a previous edit was wrong, fix it forward — don't undo and retry.
- Read a file ONCE at the start. Do not re-read the same file between every edit.
- If the user asks you to add, create, update, fix, replace, remove, or build something, you must either make the needed file changes or clearly explain the blocker. Do not finish a mutating request after only reading files.
- When adding a new page in a simple single-page app, create a navigable view or section that matches the existing structure and update the navigation so the user can reach it.
- For genuinely multi-page sites (separate routes), call \`plan_pages\` first to get a page graph, then implement it with react-router-dom: src/pages/<Name>.jsx per page, a shared <Nav> component, and <Routes> in App.jsx. Keep the nav consistent with the plan's sharedNav links.
- If images are attached, treat them as visual ground truth. The image overrides vague text such as "make the following website"; infer the real site type, layout, colors, spacing, content hierarchy, and product/domain cues from the screenshot before using catalog components.
- Anti-slop quality bar: never leave placeholder or generic filler copy such as "Acme", "Brand", "Studio", "Welcome to our website", "Feature 1", lorem ipsum, generic testimonials, or demo pricing unless the user explicitly asked for it.
- When using catalog components, customize visible text, spacing, colors, contrast, and section rhythm so each component matches the user's domain and visual direction.

## Community Component Catalog
- When catalog tools are enabled for this turn, you have access to a **Community Component Database** via tools such as \`browse_components\`, \`fetch_component_bundle\`, and when available \`install_component_bundle\`.
- This catalog is a community-driven library where developers submit new, high-quality React/Tailwind UI components daily.
- You can search the catalog for relevant keywords (e.g., "hero", "gaming", "cards") to discover pre-made sections. Small fetched bundles may include source code. Large shader/WebGL files may be summarized to protect context.
- Prefer \`install_component_bundle\` for large visual/shader components or pre-selected components you want to use mostly as-is. It writes the files directly into the sandbox without loading huge source into the model context.
- Feel free to use these components to quickly assemble premium interfaces, or write custom code from scratch — whichever approach fits the project best.
- **Context Warning:** Try to avoid fetching more than 2-3 component bundles in a single turn to prevent context overload. If you need more, process them in batches across multiple turns.
- If source is clipped or omitted, do not repeatedly fetch/read the same huge file. Use the installed file paths and only read targeted line windows if you must edit internals.
- Component plan: think by section first (Header/Nav, Hero, Features, Pricing, Testimonials, Footer, or dashboard/admin panels when relevant). Browse with section-specific keywords, fetch/install only the best-fit bundle for each section, avoid duplicate bundles for the same role, and custom-code missing gaps when the catalog fit is weak.
- Use edit_file for targeted changes with exact string matching. Use replace_file only for major rewrites.
- **Removing files**: when the user asks to delete, remove, or get rid of a file (or when a generated component is genuinely no longer referenced), call \`delete_file\` with \`path\`, \`reason\`, and \`confirmation: "DELETE_FILE"\`. Do NOT use \`replace_file\` to replace the file's contents with an empty stub or "// File deleted" comment — that leaves dead code in the project tree. After deleting, use \`edit_file\` to also strip any \`import\` statements and JSX usages that referenced the deleted file from the other source files (e.g. App.jsx). Core build files (package.json, vite.config.js, src/main.jsx, src/App.jsx, index.html, etc.) are protected and cannot be deleted — refactor them instead.
- After ALL edits are done, call get_build_errors exactly once. Do not build-check after every single edit.
- get_build_errors also checks the live browser runtime. If Vite passes but previewHealthy/runtimeHealthy is false, use the compact browser console/page error/render diagnostics from that tool result to fix the runtime issue before ending the turn.
- If a build or browser-runtime check fails, read the error carefully and fix it in one targeted edit.
- The harness manages your step budget and will warn you when it runs low. If verification fails at the end of your turn, the harness grants extra repair steps — use them for targeted fixes, not rewrites.
- Visible responses must stay concise. Tool cards already show implementation detail. For normal edits, use one short sentence or up to 3 clear bullets. Do not list every file unless the user asks.

## Code Style
- Preinstalled libraries: framer-motion, lucide-react, react-icons, react-router-dom, clsx, tailwind-merge, three, @react-three/fiber, @react-three/drei, @radix-ui/react-icons.
- If you genuinely need another library, use \`install_packages\` (confirmation: "INSTALL_PACKAGES"). Only a curated allowlist of quality design/animation/data libraries is installable (e.g. gsap, recharts, swiper, zustand, lenis). Do NOT import a library that is neither preinstalled nor installed this way.
- Component bundles declare their own dependencies; install_component_bundle auto-installs allowlisted ones — check its \`dependencies\` result and adapt the code if something was blocked.
- Write modern React with functional components and hooks.
- Use Tailwind CSS for styling. Avoid inline styles unless necessary.
- Preserve existing code structure and patterns.`;

// ─── Helpers ─────────────────────────────────────────────────

function determineIncompleteReason({
  hitMaxSteps = false,
  expectsMutation = false,
  mutationCount = 0,
  verificationRan = false,
  buildStatus = null
} = {}) {
  if (hitMaxSteps) return 'max_steps_reached';
  if (buildStatus === 'failed') return 'build_verification_failed';
  if (mutationCount > 0 && !verificationRan) return 'build_verification_not_run';
  if (expectsMutation && mutationCount === 0) return 'expected_mutation_not_applied';
  return null;
}

function isCheckHealthy(check) {
  if (!check) return false;
  return Boolean(check.buildPassed) && check.previewHealthy !== false && check.runtimeHealthy !== false;
}

function summarizeFailedCheck(check) {
  if (!check) return 'Verification could not run.';
  const parts = [];
  const stages = Array.isArray(check.stages) ? check.stages : [];
  if (!check.buildPassed) {
    const buildStage = stages.find((stage) => stage.name === 'vite_build');
    const buildErrors = buildStage?.stderr || buildStage?.stdout || buildStage?.error || check.summary || '';
    parts.push(`Vite build FAILED.${buildErrors ? `\nBuild errors:\n${String(buildErrors).slice(0, 3000)}` : ''}`);
  } else {
    parts.push(`Vite build passed, but the live browser runtime is unhealthy.${check.summary ? ` (${check.summary})` : ''}`);
  }
  const runtimeStage = stages.find((stage) => stage.name === 'browser_runtime');
  const diagnostics = runtimeStage?.details || null;
  if (diagnostics) {
    const render = diagnostics.render || {};
    const consoleInfo = diagnostics.browserConsole || {};
    if (render.hasContent === false) {
      parts.push(`Rendered page is blank or near-empty (scrollHeight=${render.scrollHeight}, textLen=${render.textLen}).`);
    }
    if (consoleInfo.errorCount > 0 || consoleInfo.pageErrorCount > 0 || consoleInfo.requestFailureCount > 0) {
      const entries = (consoleInfo.entries || []).slice(0, 8)
        .map((entry) => `- [${entry.source}/${entry.level}] ${entry.text}`)
        .join('\n');
      parts.push(`Browser errors:\n${entries}`);
    }
  } else if (runtimeStage?.error) {
    parts.push(`Runtime check error: ${runtimeStage.error}`);
  }
  return parts.join('\n');
}

// ─── Context Assembly ────────────────────────────────────────

/**
 * Build the initial context for the agent.
 */
function assembleMessages(userPrompt, conversationHistory = [], fileTree = null, projectContextBlock = '', images = []) {
  const messages = [];

  // Add conversation history (last 20 messages max)
  if (conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-20);
    for (const msg of recent) {
      messages.push({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      });
    }
  }

  // Add durable project context and file tree context if available
  let contextPrefix = '';
  if (projectContextBlock) {
    contextPrefix += `${projectContextBlock}\n\n`;
  }
  if (fileTree) {
    const fileListStr = fileTree.files
      .map(f => `  ${f.protected ? '🔒 ' : ''}${f.path}`)
      .join('\n');
    contextPrefix += `[Current project files]\n${fileListStr}\n\n`;
  }

  const { content, attachments } = buildMultimodalUserContent({
    text: contextPrefix + userPrompt,
    images
  });

  // Add user's new message. Image attachments ride on the current turn; durable
  // reference images are re-attached by the session layer (see routes/agent.js).
  messages.push({
    role: 'user',
    content
  });

  return { messages, attachments };
}

// ─── Provider Adapters ───────────────────────────────────────
// Both adapters expose: callModel(injection) → { toolRound: boolean, text: string }
// Tool execution flows through the SAME runtime instance, so mutations,
// build checks, SSE events, and debug timeline are identical across providers.

function injectionToVercelMessage(injection) {
  const parts = [{ type: 'text', text: injection.text }];
  for (const image of injection.images || []) {
    parts.push({
      type: 'image',
      image: image.binary || Buffer.from(image.base64, 'base64'),
      mimeType: image.mimeType || 'image/jpeg'
    });
  }
  return { role: 'user', content: parts };
}

function injectionToGeminiParts(injection) {
  const parts = [{ text: injection.text }];
  for (const image of injection.images || []) {
    parts.push({
      inlineData: {
        data: image.base64 || (image.binary ? image.binary.toString('base64') : ''),
        mimeType: image.mimeType || 'image/jpeg'
      }
    });
  }
  return parts;
}

function createVercelAdapter({ modelId, systemPrompt, messages, runtime, debugTimeline }) {
  const model = getModel(modelId);
  const tools = toVercelTools(runtime);
  const history = [...messages];

  return {
    async callModel(injection = null) {
      if (injection) {
        history.push(injectionToVercelMessage(injection));
      }

      const result = await generateText({
        model,
        system: systemPrompt,
        messages: history,
        tools,
        maxSteps: 1, // one model round per call — the harness owns the loop
        maxTokens: 8192,
        temperature: 0.2,
        toolChoice: 'auto'
      });

      // Append generated assistant/tool messages so the next round has full context.
      const responseMessages = result.response?.messages || [];
      history.push(...responseMessages);

      const lastStep = result.steps?.[result.steps.length - 1] || null;
      const toolRound = Boolean(lastStep?.toolCalls?.length);
      debugTimeline?.event?.('sdk_step_finish', {
        stepType: toolRound ? 'tool-result' : 'final',
        textChars: String(result.text || '').length,
        toolCallCount: lastStep?.toolCalls?.length || 0,
        toolResultCount: lastStep?.toolResults?.length || 0
      });

      return {
        toolRound,
        toolNames: (lastStep?.toolCalls || []).map((call) => call.toolName).filter(Boolean),
        text: result.text || ''
      };
    }
  };
}

function createGeminiAdapter({ modelId, systemPrompt, messages, runtime, debugTimeline }) {
  const { executors, declarations } = toGeminiToolExecutors(runtime);

  const googleMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: toGeminiPartsFromContent(m.content)
  }));

  const chat = getNativeGoogleAI().chats.create({
    model: modelId.replace('google/', ''),
    config: {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: declarations }],
      maxOutputTokens: 8192,
      temperature: 0.2,
    },
    history: googleMessages.slice(0, -1)
  });

  let pendingResponse = null; // model response whose functionCalls still need execution
  let started = false;

  function extractText(response) {
    try {
      return response.text() || '';
    } catch {
      return response.candidates?.[0]?.content?.parts
        ?.filter(p => p.text)
        .map(p => p.text)
        .join('\n') || '';
    }
  }

  return {
    async callModel(injection = null) {
      let response;

      if (!started) {
        started = true;
        const lastMsg = googleMessages[googleMessages.length - 1];
        const parts = [...lastMsg.parts];
        if (injection) parts.push(...injectionToGeminiParts(injection));
        const initialMessage = parts.length === 1 && parts[0]?.text ? parts[0].text : parts;
        response = await chat.sendMessage({ message: initialMessage }, { timeout: 120000 });
      } else if (pendingResponse) {
        // Execute the pending tool calls, then send results (+ any injection) back.
        const functionCalls = pendingResponse.functionCalls || [];
        const functionResponses = [];
        for (const fc of functionCalls) {
          const executor = executors[fc.name];
          if (!executor) {
            console.warn(`[agent-native] Unknown tool: ${fc.name}`);
            debugTimeline?.event?.('tool_result', {
              toolName: fc.name,
              success: false,
              error: { message: `Unknown tool: ${fc.name}` }
            });
            functionResponses.push({ name: fc.name, response: { error: `Unknown tool: ${fc.name}` } });
            continue;
          }
          try {
            const result = await executor(fc.args || {});
            functionResponses.push({ name: fc.name, response: result });
          } catch (e) {
            console.error(`[agent-native] Tool ${fc.name} failed:`, e.message);
            functionResponses.push({ name: fc.name, response: { error: e.message } });
          }
        }
        pendingResponse = null;

        const parts = functionResponses.map(fr => ({ functionResponse: fr }));
        if (injection) parts.push(...injectionToGeminiParts(injection));
        response = await chat.sendMessage({ message: parts }, { timeout: 120000 });
      } else {
        // No pending tool calls — this is a harness-driven continuation round.
        const parts = injection
          ? injectionToGeminiParts(injection)
          : [{ text: 'Continue.' }];
        response = await chat.sendMessage({ message: parts }, { timeout: 120000 });
      }

      const functionCalls = response.functionCalls || [];
      if (functionCalls.length > 0) {
        pendingResponse = response;
        return {
          toolRound: true,
          toolNames: functionCalls.map((fc) => fc.name).filter(Boolean),
          text: ''
        };
      }
      return { toolRound: false, toolNames: [], text: extractText(response) };
    }
  };
}

// ─── Harness Round Controller ────────────────────────────────

/**
 * Drive model rounds until the turn is genuinely complete:
 * tools done → verification healthy → (optional) visual review done.
 */
async function runHarnessRounds({
  adapter,
  runtime,
  baseSteps,
  onEvent,
  debugTimeline,
  enforceVerification = true,
  visualJudge = null, // { capture: async () => ({ images, note }) } | null
  isInitialBuild = false,
  expectsMutation = false
}) {
  const state = {
    rounds: 0,
    budget: baseSteps,
    repairRounds: 0,
    forcedVerifications: 0,
    visualReviewDone: false,
    lowBudgetWarned: false,
    hitMaxSteps: false,
    finalText: ''
  };

  let nextInjection = null;

  while (state.rounds < state.budget) {
    state.rounds++;

    // Calm budget note instead of an anxiety-inducing hard count in the prompt.
    const remaining = state.budget - state.rounds;
    if (!state.lowBudgetWarned && remaining === LOW_BUDGET_WARNING_AT) {
      state.lowBudgetWarned = true;
      const note = `[Harness note] About ${LOW_BUDGET_WARNING_AT} tool rounds remain in this turn. Finish the current work, then call get_build_errors and wrap up.`;
      nextInjection = nextInjection
        ? { ...nextInjection, text: `${nextInjection.text}\n\n${note}` }
        : { text: note };
    }

    let round;
    try {
      round = await adapter.callModel(nextInjection);
    } catch (modelError) {
      debugTimeline?.error?.('model_call_error', modelError, { round: state.rounds });
      throw modelError;
    }
    nextInjection = null;

    if (round.toolRound) {
      onEvent('agent_thinking', { step: `executing_tools_step_${state.rounds}` });
      debugTimeline?.event?.('tool_round', {
        round: state.rounds,
        toolNames: round.toolNames
      });

      // Tools can queue visual attachments (e.g. component preview thumbnails
      // from browse_components). Inject them as image parts on the next round.
      const pendingVisuals = runtime.drainVisualAttachments?.() || [];
      if (pendingVisuals.length > 0) {
        const mergedImages = pendingVisuals.flatMap((attachment) => attachment.images || []);
        const mergedText = pendingVisuals.map((attachment) => attachment.text).filter(Boolean).join('\n\n');
        debugTimeline?.event?.('visual_attachments_injected', {
          round: state.rounds,
          imageCount: mergedImages.length
        });
        nextInjection = { text: mergedText, images: mergedImages };
      }
      continue;
    }

    // Model produced a final text — harness decides whether the turn is really done.
    state.finalText = round.text || state.finalText;

    const decision = enforceVerification
      ? await decideEndOfTurn({ runtime, state, visualJudge, isInitialBuild, onEvent, debugTimeline })
      : { action: 'done' };

    if (decision.action === 'done') {
      return state;
    }

    nextInjection = decision.injection;
    state.budget += decision.extraSteps || 0;
    state.lowBudgetWarned = false;
  }

  // Budget exhausted. If the model still wanted tools, mark as truncated.
  state.hitMaxSteps = true;

  // Last-resort safety: if edits were made but never verified, run the check
  // once so the user at least gets an honest buildStatus.
  if (enforceVerification && runtime.getMutations().length > 0 && runtime.getBuildChecks().length === 0) {
    await forceVerification({ runtime, onEvent, debugTimeline });
  }

  return state;
}

async function forceVerification({ runtime, onEvent, debugTimeline }) {
  onEvent('agent_thinking', { step: 'harness_verification' });
  debugTimeline?.event?.('harness_forced_verification', {});
  try {
    const outcome = await runtime.execute('get_build_errors', {});
    return outcome?.result || null;
  } catch (error) {
    debugTimeline?.error?.('harness_verification_failed', error);
    return null;
  }
}

/**
 * End-of-turn gate. Returns { action: 'done' } or
 * { action: 'continue', injection: { text, images? }, extraSteps }.
 */
async function decideEndOfTurn({ runtime, state, visualJudge, isInitialBuild = false, onEvent, debugTimeline }) {
  const mutations = runtime.getMutations();
  if (mutations.length === 0) {
    return { action: 'done' };
  }

  let buildChecks = runtime.getBuildChecks();
  let latestCheck = buildChecks[buildChecks.length - 1] || null;
  const lastMutationAt = mutations[mutations.length - 1]?.timestamp || 0;
  const checkIsStale = !latestCheck || (latestCheck.timestamp || 0) < lastMutationAt;

  // The model finished without (re-)verifying its edits — the harness verifies.
  if (checkIsStale && state.forcedVerifications < 1 + MAX_REPAIR_ROUNDS) {
    state.forcedVerifications++;
    await forceVerification({ runtime, onEvent, debugTimeline });
    buildChecks = runtime.getBuildChecks();
    latestCheck = buildChecks[buildChecks.length - 1] || null;
  }

  if (!isCheckHealthy(latestCheck)) {
    if (state.repairRounds >= MAX_REPAIR_ROUNDS) {
      return { action: 'done' }; // give up gracefully; incompleteReason will reflect it
    }
    state.repairRounds++;
    debugTimeline?.event?.('harness_repair_round', {
      repairRound: state.repairRounds,
      extraSteps: REPAIR_STEPS
    });
    return {
      action: 'continue',
      extraSteps: REPAIR_STEPS,
      injection: {
        text: [
          '[Harness check] Your edits did not pass verification. The harness ran get_build_errors after your last change:',
          summarizeFailedCheck(latestCheck),
          '',
          `You have ${REPAIR_STEPS} extra repair steps. Fix the root cause with targeted edits (no rewrites, no reverts), then call get_build_errors once to confirm.`
        ].join('\n')
      }
    };
  }

  // Build is healthy — optional visual self-review before finishing.
  // Skip on trivial edits (1 file) to avoid an extra slow model round; keep it
  // for initial builds and multi-file changes where design polish matters.
  const visualReviewWarranted = isInitialBuild || mutations.length >= 2;
  if (visualJudge && visualReviewWarranted && !state.visualReviewDone) {
    state.visualReviewDone = true;
    onEvent('agent_thinking', { step: 'visual_review' });
    try {
      // Reuse the screenshot already captured during verification when present
      // (no second browser launch). Fall back to capturing if none.
      const reusable = Array.isArray(latestCheck?.screenshots) ? latestCheck.screenshots : [];
      const capture = reusable.length > 0
        ? visualJudge.fromScreenshots(reusable)
        : await visualJudge.capture();
      if (capture && capture.images?.length) {
        debugTimeline?.event?.('visual_review_injected', {
          imageCount: capture.images.length
        });
        return {
          action: 'continue',
          extraSteps: VISUAL_REVIEW_STEPS,
          injection: {
            text: capture.note,
            images: capture.images
          }
        };
      }
    } catch (error) {
      debugTimeline?.error?.('visual_review_failed', error);
    }
  }

  return { action: 'done' };
}

// ─── Visual Judge ────────────────────────────────────────────

function buildVisualReviewNote(shots) {
  return [
    `[Visual check] The build passed. Attached: screenshot(s) of the rendered site (${shots.map((s) => s.label).join(', ')}).`,
    'Review it like a senior designer before finishing:',
    '- Layout: overlapping elements, broken spacing/alignment, collapsed or zero-height sections',
    '- Contrast & readability: low-contrast text, illegible copy over imagery, white-on-white / black-on-black',
    '- Visual hierarchy & section rhythm: does the page read as intentionally designed, with a clear focal point?',
    '- Broken assets: missing images, unstyled default HTML, raw fallback fonts',
    '- Slop markers: placeholder copy, uncustomized generic component defaults',
    '',
    `If you find real problems, fix the most important ones now with targeted edits (you have up to ${VISUAL_REVIEW_STEPS} extra steps), then call get_build_errors once. If it genuinely looks good, reply with your final short summary and change nothing.`
  ].join('\n');
}

function buildVisualJudge({ provider, isInitialBuild = false, debugTimeline }) {
  const sandboxUrl = provider?.getSandboxUrl?.() || provider?.getSandboxInfo?.()?.url || null;
  if (!sandboxUrl) return null;

  return {
    // Preferred path: reuse screenshots already captured during verification.
    fromScreenshots: (shots) => {
      const images = (shots || [])
        .filter((shot) => shot?.base64)
        .map((shot) => ({ base64: shot.base64, mimeType: shot.mimeType || 'image/jpeg', label: shot.label }));
      if (!images.length) return null;
      debugTimeline?.event?.('visual_review_reused', { viewports: images.map((image) => image.label) });
      return { images, note: buildVisualReviewNote(images) };
    },
    // Fallback: capture fresh (only when verification did not return a screenshot).
    capture: async () => {
      const viewports = isInitialBuild
        ? [
          { label: 'desktop', width: 1280, height: 800 },
          { label: 'mobile', width: 390, height: 844 }
        ]
        : [{ label: 'desktop', width: 1280, height: 800 }];

      const shots = await captureViewportScreenshots(sandboxUrl, { viewports });
      if (!shots.length) return null;
      debugTimeline?.event?.('visual_review_captured', {
        viewports: shots.map((shot) => shot.label)
      });

      return {
        images: shots.map((shot) => ({
          base64: shot.base64,
          mimeType: shot.mimeType,
          label: shot.label
        })),
        note: buildVisualReviewNote(shots)
      };
    }
  };
}

// ─── Main Agent Loop ─────────────────────────────────────────

/**
 * Run the agent loop for a single user message.
 *
 * @param {object} options
 * @param {string} options.prompt — the user's message
 * @param {string} options.modelId — AI model to use
 * @param {string} options.sandboxId — active sandbox ID
 * @param {Array} options.conversationHistory — previous conversation turns
 * @param {Function} options.onEvent — callback for SSE events
 * @returns {object} — { response, toolCalls, mutations, snapshot, conversationHistory }
 */
export async function runAgentLoop(options) {
  const {
    prompt,
    modelId = resolveModelRole('generalGeneration'),
    sandboxId,
    conversationHistory = [],
    onEvent = () => {},
    systemPromptOverride = null,
    maxStepsOverride = null,
    enableCatalogTools = false,
    enableVisualJudge = true,
    enforceVerification = true,
    expectedMutation = null,
    projectContextBlock = '',
    projectId = null,
    sessionId = null,
    isInitialBuild = false,
    designBrief = null,
    images = [],
    debugTimeline = null
  } = options;

  // Falls back to another provider when the requested one has no API key.
  const effectiveModelId = resolveAvailableModelId(modelId);
  const effectiveMaxSteps = maxStepsOverride || MAX_STEPS;
  const effectiveSystemPrompt = systemPromptOverride || AGENT_SYSTEM_PROMPT;
  const expectsMutation = expectedMutation ?? isLikelyMutatingEditPrompt(prompt);
  debugTimeline?.event?.('loop_start', {
    requestedModelId: modelId,
    modelId: effectiveModelId,
    sandboxId,
    projectId,
    maxSteps: effectiveMaxSteps,
    enableCatalogTools,
    enableVisualJudge,
    expectedMutation: expectsMutation,
    conversationHistoryLength: conversationHistory.length,
    projectContextChars: projectContextBlock.length,
    imageCount: Array.isArray(images) ? images.length : 0
  });

  const sandboxResolution = await requireSandboxProvider({
    sandboxId,
    allowGlobalFallback: !sandboxId,
    allowReconnect: true,
    requireAlive: true
  });
  const provider = sandboxResolution.provider;
  const activeSandboxId = sandboxResolution.sandboxId || provider.getSandboxInfo()?.sandboxId;
  debugTimeline?.setContext?.({ sandboxId: activeSandboxId, requestedModel: modelId, model: effectiveModelId });
  debugTimeline?.event?.('provider_resolved', {
    sandboxId: activeSandboxId,
    providerType: provider?.constructor?.name || 'unknown',
    resolvedBy: sandboxResolution.resolvedBy,
    capabilities: sandboxResolution.capabilities
  });

  // Get file tree for context
  let fileTree = null;
  try {
    fileTree = await listFiles(provider);
    debugTimeline?.event?.('file_tree_loaded', {
      fileCount: fileTree?.totalFiles || fileTree?.files?.length || 0
    });
  } catch (e) {
    console.warn('[agent-loop] Could not list files for context:', e.message);
    debugTimeline?.error?.('file_tree_failed', e);
  }

  console.log(`\n[agent] ═══════════════════════════════════════════`);
  console.log(`[agent] 🚀 Agent loop starting (harness-owned rounds)`);
  console.log(`[agent]    Prompt: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
  console.log(`[agent]    Model: ${effectiveModelId} (requested: ${modelId})`);
  console.log(`[agent]    Files in sandbox: ${fileTree?.totalFiles || 0}`);
  console.log(`[agent] ═══════════════════════════════════════════\n`);

  // Create pre-mutation snapshot of all editable files (everything except protected system files)
  let snapshot = null;
  try {
    if (fileTree) {
      const editableFiles = fileTree.files
        .filter(f => !f.protected)
        .map(f => f.path);
      snapshot = await createSnapshot(provider, editableFiles);
      debugTimeline?.event?.('snapshot_created', {
        fileCount: editableFiles.length,
        hasSnapshot: Boolean(snapshot)
      });
    }
  } catch (e) {
    console.warn('[agent-loop] Could not create pre-mutation snapshot:', e.message);
    debugTimeline?.error?.('snapshot_failed', e);
  }

  // Materialize the design brief into the sandbox so the agent (and the user)
  // can read the project's art direction as real files.
  let effectiveProjectContext = projectContextBlock;
  if (designBrief) {
    try {
      const tokensCss = designBriefToTokensCss(designBrief);
      const designMd = designBriefToMarkdown(designBrief);
      if (tokensCss) await replaceFile(provider, 'src/styles/tokens.css', tokensCss);
      if (designMd) await replaceFile(provider, 'DESIGN.md', designMd);
      debugTimeline?.event?.('design_brief_materialized', {
        tokensCss: Boolean(tokensCss),
        designMd: Boolean(designMd)
      });
    } catch (e) {
      console.warn('[agent-loop] Could not write design brief files:', e.message);
      debugTimeline?.error?.('design_brief_write_failed', e);
    }
    const briefBlock = designBriefToContextBlock(designBrief);
    if (briefBlock) {
      effectiveProjectContext = `${briefBlock}\n\n${effectiveProjectContext}`;
    }
  }

  // ONE tool runtime for the whole turn, shared by both provider adapters,
  // so the harness can run tools itself (forced verification) and all
  // mutations/build checks are tracked in one place.
  const runtime = createAgentToolRuntime({
    provider,
    sandboxId: activeSandboxId,
    projectId,
    sessionId,
    onEvent,
    enableCatalogTools,
    enablePackageTools: true, // allowlisted curated packages only
    providerCapabilities: sandboxResolution.capabilities,
    debugTimeline
  });

  // Assemble messages
  const { messages, attachments } = assembleMessages(prompt, conversationHistory, fileTree, effectiveProjectContext, images);
  debugTimeline?.event?.('messages_assembled', {
    messageCount: messages.length,
    lastMessageChars: String(messages[messages.length - 1]?.content || '').length,
    imageAttachmentCount: attachments.length
  });

  onEvent('agent_start', {
    prompt,
    modelId: effectiveModelId,
    requestedModelId: modelId,
    fileCount: fileTree?.totalFiles || 0,
    imageCount: attachments.length
  });

  // ─── Build adapter + run harness rounds ───────────────────

  const useNativeSDK = GEMINI_3X_MODELS.has(normalizeModelId(effectiveModelId));
  debugTimeline?.event?.('model_call_start', {
    providerPath: useNativeSDK ? 'native_gemini' : 'vercel_ai_sdk',
    modelId: effectiveModelId,
    maxSteps: effectiveMaxSteps,
    toolCount: runtime.definitions.length
  });

  const adapter = useNativeSDK
    ? createGeminiAdapter({ modelId: effectiveModelId, systemPrompt: effectiveSystemPrompt, messages, runtime, debugTimeline })
    : createVercelAdapter({ modelId: effectiveModelId, systemPrompt: effectiveSystemPrompt, messages, runtime, debugTimeline });

  const visualJudge = enableVisualJudge
    ? buildVisualJudge({ provider, isInitialBuild, debugTimeline })
    : null;

  let loopState;
  try {
    loopState = await runHarnessRounds({
      adapter,
      runtime,
      baseSteps: effectiveMaxSteps,
      onEvent,
      debugTimeline,
      enforceVerification,
      visualJudge,
      isInitialBuild,
      expectsMutation
    });
  } catch (modelError) {
    console.error('[agent-loop] ✗ Model call failed:', modelError.message);
    debugTimeline?.error?.('model_call_error', modelError, {
      providerPath: useNativeSDK ? 'native_gemini' : 'vercel_ai_sdk',
      modelId: effectiveModelId
    });
    onEvent('agent_error', { message: `Model error: ${modelError.message}` });
    throw modelError;
  }

  debugTimeline?.event?.('model_call_done', {
    providerPath: useNativeSDK ? 'native_gemini' : 'vercel_ai_sdk',
    rounds: loopState.rounds,
    rawResponseLength: String(loopState.finalText || '').length,
    repairRounds: loopState.repairRounds,
    forcedVerifications: loopState.forcedVerifications,
    visualReviewDone: loopState.visualReviewDone
  });

  const rawResponse = loopState.finalText || '';
  const allMutations = runtime.getMutations();
  const buildChecks = runtime.getBuildChecks();
  const latestBuildCheck = buildChecks[buildChecks.length - 1] || null;
  const buildStatus = latestBuildCheck
    ? isCheckHealthy(latestBuildCheck) ? 'passed' : 'failed'
    : null;
  const verificationRan = Boolean(latestBuildCheck);
  const hitMaxSteps = Boolean(loopState.hitMaxSteps);
  const incompleteReason = determineIncompleteReason({
    hitMaxSteps,
    expectsMutation,
    mutationCount: allMutations.length,
    verificationRan,
    buildStatus
  });
  const changedFiles = allMutations.map((mutation) => mutation.path || mutation.filePath).filter(Boolean);
  const toolCalls = runtime.getToolCalls();
  const responseEnvelope = normalizeAgentResponse(rawResponse, {
    mutationCount: allMutations.length,
    toolCallCount: toolCalls.length,
    changedFiles,
    buildStatus,
    verificationRan,
    incompleteReason,
    hitMaxSteps,
    maxSteps: effectiveMaxSteps,
    expectedMutation: expectsMutation
  });
  const finalResponse = responseEnvelope.userMessage;

  onEvent('agent_text', {
    text: finalResponse,
    normalized: responseEnvelope.wasNormalized
  });
  onEvent('agent_complete', {
    steps: loopState.rounds,
    mutationCount: allMutations.length,
    hasSnapshot: !!snapshot,
    buildStatus,
    verificationRan,
    incompleteReason,
    hitMaxSteps,
    repairRounds: loopState.repairRounds,
    visualReviewRan: loopState.visualReviewDone,
    response: responseEnvelope
  });
  debugTimeline?.final?.({
    status: incompleteReason ? 'completed_with_issues' : 'completed',
    response: finalResponse,
    changedFiles,
    buildStatus,
    verificationRan,
    incompleteReason,
    hitMaxSteps,
    mutationCount: allMutations.length,
    rounds: loopState.rounds,
    repairRounds: loopState.repairRounds,
    visualReviewRan: loopState.visualReviewDone
  });

  console.log(`\n[agent] ═══════════════════════════════════════════`);
  console.log(`[agent] ✅ Agent loop complete`);
  console.log(`[agent]    Rounds: ${loopState.rounds} (repairs: ${loopState.repairRounds}, visual review: ${loopState.visualReviewDone ? 'yes' : 'no'})`);
  console.log(`[agent]    Mutations: ${allMutations.length} file(s) changed`);
  console.log(`[agent]    Build: ${buildStatus || 'not verified'}`);
  console.log(`[agent]    Response: "${finalResponse.slice(0, 120)}${finalResponse.length > 120 ? '...' : ''}"`);
  console.log(`[agent] ═══════════════════════════════════════════\n`);

  return {
    response: finalResponse,
    rawResponse,
    responseEnvelope,
    buildStatus,
    verificationRan,
    incompleteReason,
    hitMaxSteps,
    buildChecks,
    toolCalls,
    mutations: allMutations,
    snapshot,
    rounds: loopState.rounds,
    repairRounds: loopState.repairRounds,
    visualReviewRan: loopState.visualReviewDone,
    conversationHistory: [
      ...conversationHistory,
      { role: 'user', content: prompt },
      { role: 'assistant', content: finalResponse }
    ]
  };
}

// ─── Undo ────────────────────────────────────────────────────

/**
 * Undo the last agent turn by restoring the pre-mutation snapshot.
 */
export async function undoLastTurn(snapshot, sandboxId) {
  if (!snapshot) throw new Error('No snapshot available to undo');

  const { provider } = await requireSandboxProvider({
    sandboxId,
    allowGlobalFallback: !sandboxId,
    allowReconnect: true,
    requireAlive: true
  });

  return await restoreSnapshot(provider, snapshot);
}
