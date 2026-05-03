/**
 * Agent Loop — Core Orchestrator
 * 
 * Runs the AI agent loop: receives a user message, calls the model with tools,
 * the Vercel AI SDK executes tools automatically, and we emit SSE events at each step.
 * 
 * Architecture:
 *   User message → Context assembly → generateText({ maxSteps }) → Auto tool execution → Done
 *                                                                         ↓
 *                                                          SSE events via onStepFinish callback
 */

import { generateText } from 'ai';
import { GoogleGenAI } from '@google/genai';
import { getModel } from '../lib/provider-helpers.js';
import {
  listFiles, createSnapshot, restoreSnapshot
} from './sandbox-fs.js';
import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';
import { normalizeAgentResponse } from '../lib/agent/response-normalizer.js';
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

// ─── Constants ───────────────────────────────────────────────

const MAX_STEPS = 20; // Max model↔tool round trips per user message

// Gemini 3.x models require thought signatures in multi-turn tool calling.
// @ai-sdk/google v1 doesn't support this, so we use @google/genai natively.
const GEMINI_3X_MODELS = new Set([
  'google/gemini-3.1-pro-preview',
  'google/gemini-3-pro-preview',
  'google/gemini-3-pro',
]);

// Native Google GenAI SDK client (for Gemini 3.x)
const nativeGoogleAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export const bundleToFiles = runtimeBundleToFiles;

// ─── System Prompt ───────────────────────────────────────────

const AGENT_SYSTEM_PROMPT = `You are an expert frontend developer working inside a live React + Tailwind project sandbox powered by Vite.

## Workflow — ALWAYS follow this order:
1. **Understand**: Read the relevant file(s) to fully understand the current code before changing anything.
2. **Plan**: Decide exactly what changes to make. You get a limited number of steps, so plan carefully.
3. **Execute**: Make all your edits. Batch related changes together — don't make one tiny change per step.
4. **Verify**: Call get_build_errors once after all edits are done.
5. **Respond**: Give a short, user-facing completion message.

## Critical Rules
- **Never experiment or trial-and-error.** Do not make a change just to test a theory, then revert it. Understand the code first, then make the correct fix once.
- **Never revert your own changes.** If you realize a previous edit was wrong, fix it forward — don't undo and retry.
- Read a file ONCE at the start. Do not re-read the same file between every edit.
- If images are attached, treat them as visual ground truth. The image overrides vague text such as "make the following website"; infer the real site type, layout, colors, spacing, content hierarchy, and product/domain cues from the screenshot before using catalog components.

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
- After ALL edits are done, call get_build_errors exactly once. Do not build-check after every single edit.
- If a build fails, read the error carefully and fix it in one targeted edit.
- You have a maximum of ~20 tool calls. Use them wisely.
- Visible responses must stay concise. Tool cards already show implementation detail. For normal edits, use one short sentence or up to 3 clear bullets. Do not list every file unless the user asks.

## Code Style
- Available libraries: framer-motion, lucide-react, react-icons, react-router-dom, clsx, tailwind-merge, three, @react-three/fiber, @react-three/drei, @radix-ui/react-icons.
- Do NOT import libraries that are not listed above.
- Write modern React with functional components and hooks.
- Use Tailwind CSS for styling. Avoid inline styles unless necessary.
- Preserve existing code structure and patterns.`;

// ─── Tool Builders ───────────────────────────────────────────

/**
 * Create Vercel AI SDK tool definitions wired to the sandbox provider.
 * Each tool has: description, Zod parameters, and execute function.
 * 
 * The `onEvent` callback is called for tool start/result SSE events.
 */
function buildTools(provider, sandboxId, onEvent, { enableCatalogTools = false, debugTimeline = null } = {}) {
  const runtime = createAgentToolRuntime({ provider, sandboxId, onEvent, enableCatalogTools, debugTimeline });
  return {
    tools: toVercelTools(runtime),
    getMutations: runtime.getMutations,
    getBuildChecks: runtime.getBuildChecks
  };
}
// ─── Native Gemini Tool Executors (for @google/genai) ────────

/**
 * Build tool executors and Google-format function declarations for native SDK.
 * Returns { declarations, executors } where executors is a map of name → async function.
 */
function buildNativeToolExecutors(provider, sandboxId, onEvent, { enableCatalogTools = false, debugTimeline = null } = {}) {
  const runtime = createAgentToolRuntime({ provider, sandboxId, onEvent, enableCatalogTools, debugTimeline });
  return toGeminiToolExecutors(runtime);
}
// ─── Native Gemini Loop ──────────────────────────────────────

/**
 * Run agent loop using @google/genai directly (for Gemini 3.x models).
 * Handles thought signatures transparently.
 */
async function runNativeGeminiLoop({ modelId, systemPrompt, messages, toolExecutors, maxSteps, onEvent, debugTimeline = null }) {
  const { executors, declarations, getMutations: getNativeMutations, getBuildChecks: getNativeBuildChecks } = toolExecutors;

  // Convert messages to Google GenAI format
  const googleMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: toGeminiPartsFromContent(m.content)
  }));

  // Use chat session for automatic thought signature handling
  const chat = nativeGoogleAI.chats.create({
    model: modelId,
    config: {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: declarations }],
      maxOutputTokens: 8192,
      temperature: 0.2,
    },
    history: googleMessages.slice(0, -1) // All but last message
  });

  // Send the last message to start
  const lastMsg = googleMessages[googleMessages.length - 1];
  const initialMessage = lastMsg.parts.length === 1 && lastMsg.parts[0]?.text
    ? lastMsg.parts[0].text
    : lastMsg.parts;
  let response = await chat.sendMessage(
    { message: initialMessage }, 
    { timeout: 120000 } // AI_STABILITY_FIX_V7: Increase timeout for heavy initial planning
  );

  let steps = 0;
  let allToolCalls = [];

  // Tool-calling loop — keep going while model requests function calls
  while (steps < maxSteps) {
    steps++;

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) break; // Model finished

    onEvent('agent_thinking', { step: `executing_tools_step_${steps}` });
    debugTimeline?.event?.('native_tool_round', {
      step: steps,
      functionCallCount: functionCalls.length,
      toolNames: functionCalls.map((fc) => fc.name).filter(Boolean)
    });

    // Execute all function calls
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
        allToolCalls.push({ name: fc.name, args: fc.args });
        functionResponses.push({ name: fc.name, response: result });
      } catch (e) {
        console.error(`[agent-native] Tool ${fc.name} failed:`, e.message);
        functionResponses.push({ name: fc.name, response: { error: e.message } });
      }
    }

    // Send tool results back to model
    try {
      response = await chat.sendMessage(
        { message: functionResponses.map(fr => ({ functionResponse: fr })) },
        { timeout: 120000 } // AI_STABILITY_FIX_V7: Consistency in timeouts
      );
    } catch (sendErr) {
      console.error(`[agent-native] chat.sendMessage failed at step ${steps}:`, sendErr.message);
      debugTimeline?.error?.('model_call_error', sendErr, { step: steps, providerPath: 'native_gemini' });
      onEvent('agent_error', { message: `Model communication error: ${sendErr.message}` });
      break; 
    }
  }

  if (steps >= maxSteps) {
    console.warn(`[agent-native] Hit max steps (${maxSteps})`);
  }

  // Safe text extraction — response.text() throws if no text parts present
  let finalResponseText = '';
  try {
    finalResponseText = response.text() || '';
  } catch (e) {
    // Fallback: manually extract text parts if any
    finalResponseText = response.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      .map(p => p.text)
      .join('\n') || '';
  }

  return {
    text: finalResponseText,
    steps,
    toolCalls: allToolCalls,
    buildChecks: typeof getNativeBuildChecks === 'function' ? getNativeBuildChecks() : []
  };
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

  // Add user's new message. Images are attached only to the current turn so
  // screenshots do not get replayed forever in long-running project memory.
  messages.push({
    role: 'user',
    content
  });

  return { messages, attachments };
}

// ─── Main Agent Loop ─────────────────────────────────────────

/**
 * Run the agent loop for a single user message.
 * Uses Vercel AI SDK's `maxSteps` for automatic tool round-tripping.
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
    modelId = 'google/gemini-3.1-pro-preview',
    sandboxId,
    conversationHistory = [],
    onEvent = () => {},
    systemPromptOverride = null,
    maxStepsOverride = null,
    enableCatalogTools = false,
    projectContextBlock = '',
    images = [],
    debugTimeline = null
  } = options;

  const effectiveMaxSteps = maxStepsOverride || MAX_STEPS;
  const effectiveSystemPrompt = systemPromptOverride || AGENT_SYSTEM_PROMPT;
  debugTimeline?.event?.('loop_start', {
    modelId,
    sandboxId,
    maxSteps: effectiveMaxSteps,
    enableCatalogTools,
    conversationHistoryLength: conversationHistory.length,
    projectContextChars: projectContextBlock.length,
    imageCount: Array.isArray(images) ? images.length : 0
  });

  // Resolve sandbox provider
  const provider = sandboxId
    ? (sandboxManager.getProvider(sandboxId) || global.activeSandboxProvider)
    : (sandboxManager.getActiveProvider() || global.activeSandboxProvider);

  if (!provider) {
    debugTimeline?.event?.('provider_missing', { sandboxId });
    throw new Error('No active sandbox. Create one first.');
  }

  const activeSandboxId = sandboxId || provider.getSandboxInfo()?.sandboxId;
  debugTimeline?.setContext?.({ sandboxId: activeSandboxId, model: modelId });
  debugTimeline?.event?.('provider_resolved', {
    sandboxId: activeSandboxId,
    providerType: provider?.constructor?.name || 'unknown'
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
  console.log(`[agent] 🚀 Agent loop starting`);
  console.log(`[agent]    Prompt: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
  console.log(`[agent]    Model: ${modelId}`);
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

  // Build tool instances (used by Vercel SDK path; native path builds its own)
  let { tools, getMutations, getBuildChecks } = buildTools(provider, activeSandboxId, onEvent, { enableCatalogTools, debugTimeline });

  // Assemble messages
  const { messages, attachments } = assembleMessages(prompt, conversationHistory, fileTree, projectContextBlock, images);
  debugTimeline?.event?.('messages_assembled', {
    messageCount: messages.length,
    lastMessageChars: String(messages[messages.length - 1]?.content || '').length,
    imageAttachmentCount: attachments.length
  });

  onEvent('agent_start', {
    prompt,
    modelId,
    fileCount: fileTree?.totalFiles || 0,
    imageCount: attachments.length
  });

  // ─── Call model with auto tool execution ─────────────────

  let result;
  const useNativeSDK = GEMINI_3X_MODELS.has(modelId);
  debugTimeline?.event?.('model_call_start', {
    providerPath: useNativeSDK ? 'native_gemini' : 'vercel_ai_sdk',
    modelId,
    maxSteps: effectiveMaxSteps,
    toolCount: Object.keys(tools || {}).length
  });

  if (useNativeSDK) {
    // ─── NATIVE GOOGLE SDK PATH (Gemini 3.x) ─────────────────
    console.log(`[agent] Using native @google/genai SDK for ${modelId}`);
    try {
        const nativeToolExec = buildNativeToolExecutors(provider, sandboxId, onEvent, { enableCatalogTools, debugTimeline });
      result = await runNativeGeminiLoop({
        modelId: modelId.replace('google/', ''),
        systemPrompt: effectiveSystemPrompt,
        messages,
        toolExecutors: nativeToolExec,
        maxSteps: effectiveMaxSteps,
        onEvent,
        debugTimeline
      });
      // Use native mutations for the summary
      getMutations = nativeToolExec.getMutations;
      getBuildChecks = nativeToolExec.getBuildChecks;
    } catch (modelError) {
      console.error('[agent-loop] ✗ Native Gemini call failed:', modelError.message);
      debugTimeline?.error?.('model_call_error', modelError, { providerPath: 'native_gemini', modelId });
      onEvent('agent_error', { message: `Model error: ${modelError.message}` });
      throw modelError;
    }
  } else {
    // ─── VERCEL AI SDK PATH (all other models) ────────────────
    try {
      const model = getModel(modelId);

      const sdkResult = await generateText({
        model,
        system: effectiveSystemPrompt,
        messages,
        tools,
        maxSteps: effectiveMaxSteps,
        maxTokens: 8192,
        temperature: 0.2,
        toolChoice: 'auto',
        onStepFinish: ({ text, toolCalls, toolResults, stepType }) => {
          debugTimeline?.event?.('sdk_step_finish', {
            stepType,
            textChars: String(text || '').length,
            toolCallCount: toolCalls?.length || 0,
            toolResultCount: toolResults?.length || 0
          });
          if (stepType === 'tool-result') {
            onEvent('agent_thinking', { step: 'processing_tool_results' });
          }
        }
      });

      result = {
        text: sdkResult.text || '',
        steps: sdkResult.steps?.length || 1,
        toolCalls: sdkResult.steps?.flatMap(s => s.toolCalls || []) || []
      };
    } catch (modelError) {
      console.error('[agent-loop] ✗ Model call failed:', modelError.message);
      debugTimeline?.error?.('model_call_error', modelError, { providerPath: 'vercel_ai_sdk', modelId });
      onEvent('agent_error', { message: `Model error: ${modelError.message}` });
      throw modelError;
    }
  }

  debugTimeline?.event?.('model_call_done', {
    providerPath: useNativeSDK ? 'native_gemini' : 'vercel_ai_sdk',
    rounds: result.steps || 1,
    rawResponseLength: String(result.text || '').length,
    toolCallCount: result.toolCalls?.length || 0
  });

  const rawResponse = result.text || '';
  const allMutations = getMutations();
  const buildChecks = typeof getBuildChecks === 'function'
    ? getBuildChecks()
    : Array.isArray(result.buildChecks) ? result.buildChecks : [];
  const latestBuildCheck = buildChecks[buildChecks.length - 1] || null;
  const buildStatus = latestBuildCheck
    ? latestBuildCheck.buildPassed ? 'passed' : 'failed'
    : null;
  const changedFiles = allMutations.map((mutation) => mutation.path || mutation.filePath).filter(Boolean);
  const responseEnvelope = normalizeAgentResponse(rawResponse, {
    mutationCount: allMutations.length,
    toolCallCount: result.toolCalls?.length || 0,
    changedFiles,
    buildStatus
  });
  const finalResponse = responseEnvelope.userMessage;

  onEvent('agent_text', {
    text: finalResponse,
    normalized: responseEnvelope.wasNormalized
  });
  onEvent('agent_complete', {
    steps: result.steps || 1,
    mutationCount: allMutations.length,
    hasSnapshot: !!snapshot,
    buildStatus,
    response: responseEnvelope
  });
  debugTimeline?.final?.({
    status: 'completed',
    response: finalResponse,
    changedFiles,
    buildStatus,
    mutationCount: allMutations.length,
    toolCallCount: result.toolCalls?.length || 0,
    rounds: result.steps || 1
  });

  console.log(`\n[agent] ═══════════════════════════════════════════`);
  console.log(`[agent] ✅ Agent loop complete`);
  console.log(`[agent]    Steps: ${result.steps || 1}`);
  console.log(`[agent]    Mutations: ${allMutations.length} file(s) changed`);
  console.log(`[agent]    Response: "${finalResponse.slice(0, 120)}${finalResponse.length > 120 ? '...' : ''}"`);
  console.log(`[agent] ═══════════════════════════════════════════\n`);

  return {
    response: finalResponse,
    rawResponse,
    responseEnvelope,
    buildStatus,
    buildChecks,
    toolCalls: result.toolCalls || [],
    mutations: allMutations,
    snapshot,
    rounds: result.steps || 1,
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

  const provider = sandboxId
    ? (sandboxManager.getProvider(sandboxId) || global.activeSandboxProvider)
    : (sandboxManager.getActiveProvider() || global.activeSandboxProvider);

  if (!provider) throw new Error('No active sandbox');

  return await restoreSnapshot(provider, snapshot);
}
