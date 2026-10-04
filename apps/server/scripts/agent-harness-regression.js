import assert from 'node:assert/strict';
import { createAgentDebugTimeline, sanitizeDebugValue } from '../lib/agent/debug-timeline.js';
import { normalizeAgentResponse } from '../lib/agent/response-normalizer.js';
import { composeAgentContextBlock } from '../lib/agent/context-assembler.js';
import {
  buildInitialComponentPrompt,
  buildInitialComponentSelectionList,
  isLikelyMutatingEditPrompt,
  shouldEnableCatalogToolsForEdit
} from '../lib/agent/component-turn-policy.js';
import {
  buildImageReferenceInstruction,
  buildMultimodalUserContent,
  normalizeImageAttachments,
  toGeminiPartsFromContent,
  toVercelImageParts
} from '../lib/agent/image-attachments.js';
import { deriveTurnMemories, formatAgentMemoryBlock } from '../lib/agent/memory-manager.js';
import {
  createAgentToolRuntime,
  SOURCE_SAFETY_LIMITS,
  toGeminiToolExecutors,
  toVercelTools,
  validatePackageNames
} from '../lib/agent/tool-runtime.js';
import { TOOL_PERMISSION_MODES } from '../lib/agent/tool-policy.js';
import {
  inferComponentIntent,
  rankComponentsForPrompt,
  scoreComponentFit
} from '../lib/registry/registry.js';
import { verifySandboxBuild } from '../lib/verify-sandbox-build.js';
import { compactConsoleEntries } from '../lib/screenshot.js';
import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';
import { resolveSandboxProvider } from '../lib/sandbox/provider-resolver.js';
import { isDeleteProtectedFile, normalizePath } from '../shared/sandbox-fs.js';
import { consumeAgentEventStream } from '../../web/src/builder/generation/useAgentMode.js';
import { mergeHydratedAgentMessages } from '../../web/src/builder/generation/agentChatHydration.js';

const encoder = new TextEncoder();

const tests = [
  ['response_normalizer_contract', testResponseNormalizerContract],
  ['response_normalizer_verification_truth_contract', testResponseNormalizerVerificationTruthContract],
  ['sse_chunked_edit_turn_contract', testSseChunkedEditTurnContract],
  ['sse_initial_build_contract', testSseInitialBuildContract],
  ['sse_agent_progress_line_contract', testSseAgentProgressLineContract],
  ['hydration_dedupe_contract', testHydrationDedupeContract],
  ['turn_memory_derivation_contract', testTurnMemoryDerivationContract],
  ['context_envelope_contract', testContextEnvelopeContract],
  ['context_envelope_priority_contract', testContextEnvelopePriorityContract],
  ['image_attachment_multimodal_contract', testImageAttachmentMultimodalContract],
  ['tool_runtime_adapter_shape_contract', testToolRuntimeAdapterShapeContract],
  ['tool_runtime_read_source_safety_contract', testToolRuntimeReadSourceSafetyContract],
  ['tool_runtime_large_bundle_source_safety_contract', testToolRuntimeLargeBundleSourceSafetyContract],
  ['tool_runtime_install_component_bundle_contract', testToolRuntimeInstallComponentBundleContract],
  ['agent_debug_timeline_contract', testAgentDebugTimelineContract],
  ['tool_runtime_debug_timeline_contract', testToolRuntimeDebugTimelineContract],
  ['tool_policy_exposure_contract', testToolPolicyExposureContract],
  ['tool_runtime_mutation_contract', testToolRuntimeMutationContract],
  ['tool_runtime_error_contract', testToolRuntimeErrorContract],
  ['tool_runtime_delete_guard_contract', testToolRuntimeDeleteGuardContract],
  ['sandbox_delete_protected_core_contract', testSandboxDeleteProtectedCoreContract],
  ['tool_runtime_package_install_guard_contract', testToolRuntimePackageInstallGuardContract],
  ['tool_runtime_reset_guard_contract', testToolRuntimeResetGuardContract],
  ['sandbox_resolver_strict_identity_contract', testSandboxResolverStrictIdentityContract],
  ['sandbox_path_boundary_contract', testSandboxPathBoundaryContract],
  ['tool_runtime_catalog_fetch_parity_contract', testToolRuntimeCatalogFetchParityContract],
  ['component_turn_policy_catalog_gate_contract', testComponentTurnPolicyCatalogGateContract],
  ['initial_component_prompt_manual_ids_contract', testInitialComponentPromptManualIdsContract],
  ['tool_runtime_build_check_contract', testToolRuntimeBuildCheckContract],
  ['staged_browser_runtime_diagnostics_contract', testStagedBrowserRuntimeDiagnosticsContract],
  ['component_intent_dashboard_contract', testComponentIntentDashboardContract],
  ['component_intent_word_boundary_contract', testComponentIntentWordBoundaryContract],
  ['component_fit_ranking_contract', testComponentFitRankingContract],
  ['component_exact_vertical_ranking_contract', testComponentExactVerticalRankingContract],
  ['component_not_suitable_penalty_contract', testComponentNotSuitablePenaltyContract],
  ['staged_verification_pass_contract', testStagedVerificationPassContract],
  ['staged_verification_failure_contract', testStagedVerificationFailureContract],
  ['benign_console_error_classification_contract', testBenignConsoleErrorClassificationContract]
];

for (const [name, test] of tests) {
  await test();
  console.log(`ok - ${name}`);
}

console.log(`agent harness regression passed (${tests.length} scenarios)`);

function testResponseNormalizerContract() {
  const verbose = [
    'Summary:',
    '- Updated the hero section with stronger hierarchy and better spacing.',
    '- Fixed the mobile pricing grid so cards stack cleanly.',
    '- Ran the build verification successfully.',
    '- Added internal implementation detail that belongs in tool cards.',
    'Would you like me to continue polishing the rest?'
  ].join('\n');

  const result = normalizeAgentResponse(verbose, {
    mutationCount: 2,
    toolCallCount: 5,
    changedFiles: ['src/App.jsx', 'src/components/Pricing.jsx']
  });

  assert.equal(result.wasNormalized, true);
  assert.equal(result.summaryBullets.length, 3);
  assert.match(result.userMessage, /^Done:/);
  assert.doesNotMatch(result.userMessage, /Would you like/i);
  assert.doesNotMatch(result.userMessage, /internal implementation detail/i);

  const noOpEdit = normalizeAgentResponse('', {
    mutationCount: 0,
    toolCallCount: 4,
    expectedMutation: true
  });
  assert.equal(noOpEdit.reason, 'empty_response');
  assert.match(noOpEdit.userMessage, /couldn't complete/i);
  assert.doesNotMatch(noOpEdit.userMessage, /checked the project/i);
}

function testResponseNormalizerVerificationTruthContract() {
  const failedBuild = normalizeAgentResponse('', {
    mutationCount: 2,
    buildStatus: 'failed',
    verificationRan: true,
    incompleteReason: 'build_verification_failed'
  });
  assert.equal(failedBuild.reason, 'empty_response');
  assert.equal(failedBuild.buildStatus, 'failed');
  assert.equal(failedBuild.verificationRan, true);
  assert.equal(failedBuild.incompleteReason, 'build_verification_failed');
  assert.match(failedBuild.userMessage, /did not pass build verification/i);

  const unverified = normalizeAgentResponse('', {
    mutationCount: 1,
    verificationRan: false,
    incompleteReason: 'build_verification_not_run'
  });
  assert.match(unverified.userMessage, /not confirmed/i);
  assert.equal(unverified.verificationRan, false);

  const maxed = normalizeAgentResponse('', {
    mutationCount: 1,
    hitMaxSteps: true,
    incompleteReason: 'max_steps_reached'
  });
  assert.match(maxed.userMessage, /step limit/i);
}

async function testSseChunkedEditTurnContract() {
  const messages = [];
  const undoStates = [];

  const meta = await consumeAgentEventStream(chunkedSseStream([
    sseEvent('agent_start', { prompt: 'make it darker' }),
    sseEvent('tool_start', { toolName: 'edit_file', args: { path: 'src/App.jsx' } }),
    sseEvent('tool_result', { toolName: 'edit_file', result: { filePath: 'src/App.jsx', diff: { linesAdded: 8, linesRemoved: 3 } }, success: true }),
    sseEvent('agent_text', { text: 'This is a verbose raw model response that should not create its own visible final message.' }),
    sseEvent('agent_done', {
      response: 'Done - I darkened the page and tightened the contrast.',
      toolCallCount: 1,
      mutationCount: 1,
      buildStatus: 'passed',
      canUndo: true
    })
  ].join('')), {
    addChatMessage: (content, type, metadata) => messages.push({ content, type, metadata }),
    setCanUndo: (value) => undoStates.push(value)
  });

  assert.equal(meta.mutationCount, 1);
  assert.equal(meta.toolCallCount, 1);
  assert.equal(meta.canUndo, true);
  assert.equal(meta.buildStatus, 'passed');
  assert.deepEqual(undoStates, [true]);
  assert.equal(messages.filter((message) => message.type === 'ai-narrator').length, 1);
  assert.equal(messages.filter((message) => message.type === 'agent-progress').length, 1);
  assert.equal(messages.find((message) => message.type === 'agent-progress').content, 'Edited 1 file');
  assert.equal(messages.find((message) => message.type === 'agent-progress').metadata.linesAdded, 8);
  assert.equal(messages.find((message) => message.type === 'agent-progress').metadata.linesRemoved, 3);
}

async function testSseInitialBuildContract() {
  const messages = [];

  const meta = await consumeAgentEventStream(chunkedSseStream([
    sseEvent('agent_start', { prompt: 'build a SaaS landing page' }),
    sseEvent('tool_result', { toolName: 'create_file', result: { filePath: 'src/App.jsx' }, success: true }),
    sseEvent('tool_result', { toolName: 'replace_file', result: { filePath: 'src/index.css' }, success: true }),
    sseEvent('agent_done', {
      response: 'Done - I built the first version and verified the project.',
      toolCallCount: 2,
      mutationCount: 2,
      buildStatus: 'passed',
      canUndo: true,
      isInitialBuild: true
    })
  ].join(''), [3, 17, 2, 29, 7]), {
    addChatMessage: (content, type, metadata) => messages.push({ content, type, metadata }),
    setCanUndo: () => {}
  });

  assert.equal(meta.mutationCount, 2);
  assert.equal(meta.toolCallCount, 2);
  assert.equal(meta.canUndo, true);
  assert.equal(meta.buildStatus, 'passed');
  assert.equal(messages.filter((message) => message.type === 'ai-narrator').length, 1);
  assert.equal(messages.find((message) => message.type === 'agent-progress').content, 'Edited 2 files');
}

async function testSseAgentProgressLineContract() {
  const messages = [];
  const liveRows = [];
  const addProgressAwareMessage = (content, type, metadata) => {
    if (type === 'agent-progress' && metadata?.replaceProgressKind) {
      const index = messages.findLastIndex((message) => (
        message.type === 'agent-progress' &&
        message.metadata?.kind === metadata.replaceProgressKind
      ));
      if (index >= 0) {
        messages[index] = { content, type, metadata };
        return;
      }
    }
    messages.push({ content, type, metadata });
  };

  const meta = await consumeAgentEventStream(chunkedSseStream([
    sseEvent('agent_start', { prompt: 'use premium components and edit the hero' }),
    sseEvent('tool_start', { toolName: 'browse_components', args: { keywords: 'hero' } }),
    sseEvent('tool_result', { toolName: 'browse_components', result: { count: 12 }, success: true }),
    sseEvent('tool_start', { toolName: 'browse_components', args: { keywords: 'pricing' } }),
    sseEvent('tool_result', { toolName: 'browse_components', result: { count: 8 }, success: true }),
    sseEvent('tool_start', { toolName: 'read_file', args: { path: 'src/App.jsx' } }),
    sseEvent('tool_result', { toolName: 'read_file', result: { filePath: 'src/App.jsx' }, success: true }),
    sseEvent('tool_start', { toolName: 'edit_file', args: { path: 'src/App.jsx' } }),
    sseEvent('tool_result', { toolName: 'edit_file', result: { filePath: 'src/App.jsx', diff: { linesAdded: 12, linesRemoved: 4 } }, success: true }),
    sseEvent('tool_start', { toolName: 'read_file', args: { path: 'src/theme.css' } }),
    sseEvent('tool_result', { toolName: 'read_file', result: { filePath: 'src/theme.css' }, success: true }),
    sseEvent('tool_start', { toolName: 'get_build_errors', args: {} }),
    sseEvent('tool_result', { toolName: 'get_build_errors', result: { buildPassed: false }, success: true }),
    sseEvent('agent_done', {
      response: 'Done - I adjusted the hero.',
      toolCallCount: 6,
      mutationCount: 1,
      buildStatus: 'failed',
      canUndo: true
    })
  ].join('')), {
    addChatMessage: addProgressAwareMessage,
    setAgentProgressText: (text) => liveRows.push(text)
  });

  assert.equal(meta.mutationCount, 1);
  assert.deepEqual(messages.filter((message) => message.type === 'agent-progress').map((message) => message.content), [
    'Read through 2 categories, 2 files',
    'Edited 1 file'
  ]);
  assert.deepEqual(messages.find((message) => message.metadata?.kind === 'edit').metadata, {
    kind: 'edit',
    files: 1,
    linesAdded: 12,
    linesRemoved: 4
  });
  assert.ok(liveRows.includes('Reading through 1 category...'));
  assert.ok(liveRows.includes('Reading through 2 categories, 1 file...'));
  assert.ok(liveRows.includes('Reading App.jsx file...'));
  assert.ok(liveRows.includes('Editing App.jsx file...'));
  assert.ok(liveRows.includes('Editing 1 file...'));
  assert.ok(!liveRows.includes('Edited 1 file'));
  assert.equal(liveRows.some((row) => row.includes('categorys')), false);
  assert.ok(liveRows.includes('Building...'));
  assert.ok(liveRows.includes('Build failed...'));
  assert.equal(messages.filter((message) => message.type === 'agent-tool').length, 0);
  assert.equal(messages.filter((message) => message.type === 'agent-summary').length, 0);
}

function testHydrationDedupeContract() {
  const current = [
    {
      content: 'Build the dashboard',
      type: 'user',
      timestamp: new Date('2026-04-29T10:00:00Z'),
      metadata: { agentMessageId: 'turn-1:user' }
    },
    {
      content: 'Preparing environment...',
      type: 'system',
      timestamp: new Date('2026-04-29T10:00:01Z')
    }
  ];

  const hydrated = [
    {
      id: 'turn-1:user',
      role: 'user',
      type: 'user',
      content: 'Build the dashboard',
      timestamp: '2026-04-29T10:00:00Z'
    },
    {
      id: 'turn-1:assistant',
      role: 'assistant',
      type: 'ai-narrator',
      content: 'Done - I built the dashboard shell.',
      timestamp: '2026-04-29T10:00:03Z'
    }
  ];

  const merged = mergeHydratedAgentMessages(current, hydrated);

  assert.equal(merged.length, 3);
  assert.equal(merged[0].content, 'Build the dashboard');
  assert.equal(merged[1].content, 'Done - I built the dashboard shell.');
  assert.equal(merged[1].metadata.hydrated, true);
  assert.equal(merged[2].content, 'Preparing environment...');
}

function testTurnMemoryDerivationContract() {
  const memories = deriveTurnMemories({
    prompt: 'Make it darker and keep the teal luxury dashboard style from now on.',
    response: 'Done - I darkened the dashboard shell and tightened the teal accents.',
    changedFiles: [{ path: 'src/App.jsx' }, { path: 'src/components/Dashboard.jsx' }],
    componentIds: ['dashboard.cards.premium.v1'],
    mutationCount: 2,
    toolCallCount: 4,
    rounds: 3,
    route: 'message'
  });

  const types = memories.map((memory) => memory.memoryType);
  assert.ok(types.includes('design_preference'));
  assert.ok(types.includes('project_fact'));
  assert.ok(types.includes('user_instruction'));
  assert.ok(types.includes('recent_change'));
  assert.ok(types.includes('component_choice'));
  assert.match(memories.find((memory) => memory.memoryType === 'design_preference').content, /dark visual style/);
  assert.match(memories.find((memory) => memory.memoryType === 'recent_change').content, /src\/App\.jsx/);

  const block = formatAgentMemoryBlock(memories);
  assert.match(block, /\[Agent memory\]/);
  assert.match(block, /Design Preference/);
  assert.match(block, /Community components used/);
}

function testContextEnvelopeContract() {
  const block = composeAgentContextBlock({
    projectContextBlock: '[Persisted project context]\nOriginal prompt: Build a CRM dashboard',
    memoryBlock: '[Agent memory]\nDesign Preference:\n- dark visual style',
    recentTurnsBlock: '[Recent agent turns]\n- User asked: make it darker'
  });

  assert.match(block, /\[Volturiano continuity envelope\]/);
  assert.ok(block.indexOf('[Persisted project context]') < block.indexOf('[Agent memory]'));
  assert.ok(block.indexOf('[Agent memory]') < block.indexOf('[Recent agent turns]'));
  assert.match(block, /short follow-up prompts/);
  assert.match(block, /\[\/Volturiano continuity envelope\]/);
}

function testContextEnvelopePriorityContract() {
  const block = composeAgentContextBlock({
    projectContextBlock: '[Persisted project context]\nOld direction',
    memoryBlock: '[Agent memory]\nOld copy style',
    recentTurnsBlock: '[Recent agent turns]\nOld turn'
  });

  assert.match(block, /latest user request and the current sandbox file state outrank/i);
}

function testImageAttachmentMultimodalContract() {
  const dataUrl = 'data:image/png;base64,aGVsbG8=';
  const attachments = normalizeImageAttachments([dataUrl]);

  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].mimeType, 'image/png');
  assert.equal(attachments[0].base64, 'aGVsbG8=');
  assert.ok(attachments[0].binary instanceof Uint8Array);

  const instruction = buildImageReferenceInstruction(1);
  assert.match(instruction, /visual ground truth/);
  assert.match(instruction, /generic catalog concept/);

  const multimodal = buildMultimodalUserContent({
    text: 'Make the following website',
    images: [dataUrl]
  });

  assert.equal(Array.isArray(multimodal.content), true);
  assert.equal(multimodal.content[0].type, 'text');
  assert.match(multimodal.content[0].text, /Attached reference images: 1/);
  assert.equal(multimodal.content[1].type, 'image');
  assert.equal(multimodal.content[1].mimeType, 'image/png');

  const vercelParts = toVercelImageParts(attachments);
  assert.equal(vercelParts[0].type, 'image');
  assert.equal(vercelParts[0].mimeType, 'image/png');
  assert.ok(vercelParts[0].image instanceof Uint8Array);

  const geminiParts = toGeminiPartsFromContent(multimodal.content);
  assert.equal(geminiParts[0].text.includes('Make the following website'), true);
  assert.deepEqual(geminiParts[1], {
    inlineData: {
      data: 'aGVsbG8=',
      mimeType: 'image/png'
    }
  });
}

function testToolRuntimeAdapterShapeContract() {
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-shape',
    enableCatalogTools: true,
    getCatalog: async () => ({ components: [] }),
    getBundle: async () => null,
    verifyBuild: async () => ({ success: true })
  });

  const vercelToolNames = Object.keys(toVercelTools(runtime)).sort();
  const { executors, declarations } = toGeminiToolExecutors(runtime);
  const geminiExecutorNames = Object.keys(executors).sort();
  const geminiDeclarationNames = declarations.map((declaration) => declaration.name).sort();

  assert.deepEqual(geminiExecutorNames, vercelToolNames);
  assert.deepEqual(geminiDeclarationNames, vercelToolNames);
  assert.ok(vercelToolNames.includes('browse_components'));
  assert.ok(vercelToolNames.includes('fetch_component_bundle'));
  assert.ok(vercelToolNames.includes('install_component_bundle'));
}

async function testToolRuntimeReadSourceSafetyContract() {
  const largeSource = Array.from({ length: SOURCE_SAFETY_LIMITS.readDefaultLineLimit + 90 }, (_, index) => {
    return `const shaderLine${index} = "vec3 color${index} = vec3(${index}.0); gl_FragColor = vec4(color${index}, 1.0);";`;
  }).join('\n');
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider({ 'src/components/ShaderHero.jsx': largeSource }),
    sandboxId: 'sandbox-tool-read-safety',
    verifyBuild: async () => ({ success: true })
  });

  const result = await runtime.execute('read_file', {
    path: 'src/components/ShaderHero.jsx',
    start_line: null,
    end_line: null
  });

  assert.equal(result.ok, true);
  assert.equal(result.result.content, largeSource);
  assert.equal(result.modelResult.sourceSafety.truncated, true);
  assert.ok(result.modelResult.content.length < largeSource.length);
  assert.ok(result.modelResult.lineCount <= SOURCE_SAFETY_LIMITS.readDefaultLineLimit);
  assert.equal(result.modelResult.sourceSafety.suggestedNextRead.path, 'src/components/ShaderHero.jsx');
}

async function testToolRuntimeLargeBundleSourceSafetyContract() {
  const largeShader = [
    'export const fragmentShader = `',
    ...Array.from({ length: 900 }, (_, index) => `vec3 color${index} = vec3(${index}.0); gl_FragColor = vec4(color${index}, 1.0);`),
    '`;'
  ].join('\n');
  const componentBundle = {
    files: [
      {
        path: 'src/components/ShaderHero.jsx',
        content: largeShader
      },
      {
        path: 'src/components/ShaderCaption.jsx',
        content: 'export default function ShaderCaption() {\n  return <p>Fast cinematic motion</p>;\n}\n'
      }
    ]
  };
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-large-bundle',
    enableCatalogTools: true,
    getCatalog: async () => ({ components: [] }),
    getBundle: async (componentId) => componentId === 'shader.hero.v1' ? componentBundle : null,
    verifyBuild: async () => ({ success: true })
  });

  const result = await runtime.execute('fetch_component_bundle', {
    component_id: 'shader.hero.v1'
  });

  assert.equal(result.ok, true);
  assert.equal(result.result.files[0].content, largeShader);
  assert.equal(result.modelResult.sourceSafety.fullSourceReturned, false);
  assert.equal(result.modelResult.sourceSafety.omittedFileCount, 1);
  assert.equal(result.modelResult.files[0].omitted, true);
  assert.equal(Object.prototype.hasOwnProperty.call(result.modelResult.files[0], 'content'), false);
  assert.equal(result.modelResult.files[0].exportHints.suggestedImportName, 'ShaderHero');
  assert.equal(result.modelResult.files[1].omitted, false);
  assert.match(result.modelResult.files[0].sourceSafety.guidance, /install_component_bundle/);
}

async function testToolRuntimeInstallComponentBundleContract() {
  const largeShader = [
    'export default function ShaderHero() {',
    '  const fragmentShader = `',
    ...Array.from({ length: 260 }, (_, index) => `    vec3 color${index} = vec3(${index}.0); gl_FragColor = vec4(color${index}, 1.0);`),
    '  `;',
    '  return <section data-shader={fragmentShader}>Shader</section>;',
    '}'
  ].join('\n');
  const componentBundle = {
    files: [
      { path: 'src/components/ShaderHero.jsx', content: largeShader },
      { path: 'src/components/ShaderHero.css', content: '.shader-hero { min-height: 100vh; }\n' },
      { path: 'package.json', content: '{"dependencies":{}}\n' }
    ]
  };
  const provider = createFakeProvider();
  const runtime = createAgentToolRuntime({
    provider,
    sandboxId: 'sandbox-tool-install-component',
    enableCatalogTools: true,
    getCatalog: async () => ({ components: [] }),
    getBundle: async (componentId) => componentId === 'shader.hero.v1' ? componentBundle : null,
    verifyBuild: async () => ({ success: true })
  });

  const result = await runtime.execute('install_component_bundle', {
    component_id: 'shader.hero.v1',
    reason: 'large shader source should not enter model context'
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelResult.success, true);
  assert.equal(result.modelResult.fileCount, 2);
  assert.equal(result.modelResult.skippedFiles[0].path, 'package.json');
  assert.equal(result.modelResult.sourceSafety.installedWithoutModelSource, true);
  assert.equal(runtime.getMutations().length, 2);
  assert.equal(runtime.getSideEffects()[0].type, 'component_install');
  assert.equal(await provider.readFile('src/components/ShaderHero.jsx'), largeShader);
  assert.equal(result.modelResult.installedFiles[0].exportHints.defaultExport, 'ShaderHero');
  assert.equal(Object.prototype.hasOwnProperty.call(result.modelResult.installedFiles[0], 'content'), false);
}

function testAgentDebugTimelineContract() {
  const events = [];
  const timeline = createAgentDebugTimeline({
    route: 'message',
    sessionId: 'session-1',
    projectId: 'project-1',
    sandboxId: 'sandbox-1',
    model: 'test-model',
    prompt: 'Build a private dashboard with a very long prompt '.repeat(20)
  }, {
    enabled: true,
    logger: (event) => events.push(event)
  });

  timeline.event('turn_start', {
    apiKey: 'sk-test-should-not-leak',
    content: 'x'.repeat(1000)
  });
  timeline.setContext({ turnId: 'turn-1' });
  timeline.final({
    response: 'Done - I tightened the dashboard.',
    changedFiles: [{ path: 'src/App.jsx' }, { path: 'src/App.jsx' }],
    componentIds: ['dashboard.cards.v1'],
    buildStatus: 'passed',
    mutationCount: 1,
    toolCallCount: 3,
    rounds: 2,
    canUndo: true
  });

  assert.equal(events.length, 2);
  assert.equal(events[0].type, 'agent_debug_timeline');
  assert.equal(events[0].sequence, 0);
  assert.equal(events[1].sequence, 1);
  assert.equal(events[0].route, 'message');
  assert.equal(events[0].promptChars > events[0].promptPreview.length, true);
  assert.equal(events[0].data.apiKey, '[redacted]');
  assert.equal(events[0].data.content.chars, 1000);
  assert.equal(events[1].turnId, 'turn-1');
  assert.equal(events[1].data.finalResponseLength, 'Done - I tightened the dashboard.'.length);
  assert.deepEqual(events[1].data.filesChanged.items, ['src/App.jsx']);
  assert.doesNotMatch(JSON.stringify(events), /sk-test-should-not-leak/);

  const sanitized = sanitizeDebugValue({ token: 'secret-token', output: 'hello\n'.repeat(200) });
  assert.equal(sanitized.token, '[redacted]');
  assert.equal(sanitized.output.chars > sanitized.output.preview.length, true);
}

async function testToolRuntimeDebugTimelineContract() {
  const debugEvents = [];
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-debug',
    debugTimeline: {
      event: (name, payload) => debugEvents.push({ name, payload })
    },
    verifyBuild: async () => ({ success: true })
  });

  const result = await runtime.execute('create_file', {
    path: 'src/DebugPanel.jsx',
    content: 'export default function DebugPanel() {\n  return <section />;\n}\n'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(debugEvents.map((event) => event.name), ['tool_start', 'tool_result']);
  assert.equal(debugEvents[0].payload.toolName, 'create_file');
  assert.equal(debugEvents[0].payload.policy.category, 'file-write');
  assert.equal(debugEvents[0].payload.args.contentLength > 0, true);
  assert.equal(debugEvents[1].payload.success, true);
  assert.equal(debugEvents[1].payload.mutation.path, 'src/DebugPanel.jsx');
}

function testToolPolicyExposureContract() {
  const defaultRuntime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-policy-default',
    verifyBuild: async () => ({ success: true })
  });
  const defaultNames = defaultRuntime.definitions.map((definition) => definition.name).sort();

  assert.ok(defaultNames.includes('read_file'));
  assert.ok(defaultNames.includes('create_file'));
  assert.ok(defaultNames.includes('get_build_errors'));
  // delete_file is a normal authoring tool now, gated only by its
  // confirmation-token requirement (DELETE_FILE), not by a feature flag.
  assert.ok(defaultNames.includes('delete_file'));
  assert.ok(!defaultNames.includes('browse_components'));
  assert.ok(!defaultNames.includes('install_packages'));
  assert.ok(!defaultNames.includes('reset_sandbox_app'));

  const elevatedRuntime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-policy-elevated',
    enableCatalogTools: true,
    enablePackageTools: true,
    enableDestructiveTools: true,
    enableSandboxAdminTools: true,
    permissionMode: TOOL_PERMISSION_MODES.DANGER_FULL_ACCESS,
    verifyBuild: async () => ({ success: true })
  });
  const elevatedNames = elevatedRuntime.definitions.map((definition) => definition.name).sort();
  const policySummary = elevatedRuntime.getPolicySummary();

  assert.ok(elevatedNames.includes('browse_components'));
  assert.ok(elevatedNames.includes('fetch_component_bundle'));
  assert.ok(elevatedNames.includes('install_component_bundle'));
  assert.ok(elevatedNames.includes('delete_file'));
  assert.ok(elevatedNames.includes('install_packages'));
  assert.ok(elevatedNames.includes('reset_sandbox_app'));
  assert.equal(policySummary.find((tool) => tool.name === 'delete_file').requiresConfirmation, true);
  assert.equal(policySummary.find((tool) => tool.name === 'install_packages').permission, TOOL_PERMISSION_MODES.PACKAGE_INSTALL);
}

async function testToolRuntimeMutationContract() {
  const events = [];
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-mutation',
    onEvent: (eventType, payload) => events.push({ eventType, payload }),
    verifyBuild: async () => ({ success: true })
  });

  const result = await runtime.execute('create_file', {
    path: 'src/NewPanel.jsx',
    content: 'export default function NewPanel() {\n  return <section />;\n}\n'
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelResult.success, true);
  assert.equal(runtime.getMutations().length, 1);
  assert.equal(runtime.getMutations()[0].tool, 'create_file');
  assert.deepEqual(events.map((event) => event.eventType), ['tool_start', 'tool_result']);
  assert.equal(events[1].payload.success, true);
  assert.equal(events[1].payload.result.diff.linesAdded, events[1].payload.result.lineCount);
  assert.equal(events[1].payload.result.diff.linesRemoved, 0);
}

async function testToolRuntimeErrorContract() {
  const events = [];
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-error',
    onEvent: (eventType, payload) => events.push({ eventType, payload }),
    verifyBuild: async () => ({ success: true })
  });

  const result = await runtime.execute('create_file', {
    path: 'package.json',
    content: '{"scripts":{}}\n'
  });

  assert.equal(result.ok, false);
  assert.equal(result.modelResult.code, 'PROTECTED_FILE');
  assert.equal(runtime.getMutations().length, 0);
  assert.equal(events[1].eventType, 'tool_result');
  assert.equal(events[1].payload.success, false);
}

async function testToolRuntimeDeleteGuardContract() {
  // delete_file is exposed by default. The model can call it freely as a
  // normal workspace-write authoring tool, but must include the literal
  // confirmation token DELETE_FILE so it can't fire on a borderline read.
  const provider = createFakeProvider({
    'src/OldPanel.jsx': 'export default function OldPanel() { return null; }\n'
  });
  const runtime = createAgentToolRuntime({
    provider,
    sandboxId: 'sandbox-tool-delete-default',
    verifyBuild: async () => ({ success: true })
  });

  const missingConfirmation = await runtime.execute('delete_file', {
    path: 'src/OldPanel.jsx',
    reason: 'no longer used'
  });
  assert.equal(missingConfirmation.ok, false);
  assert.equal(missingConfirmation.modelResult.code, 'TOOL_CONFIRMATION_REQUIRED');

  const wrongConfirmation = await runtime.execute('delete_file', {
    path: 'src/OldPanel.jsx',
    reason: 'no longer used',
    confirmation: 'yes please'
  });
  assert.equal(wrongConfirmation.ok, false);
  assert.equal(wrongConfirmation.modelResult.code, 'TOOL_CONFIRMATION_REQUIRED');

  const deleteResult = await runtime.execute('delete_file', {
    path: 'src/OldPanel.jsx',
    reason: 'user asked to remove it',
    confirmation: 'DELETE_FILE'
  });

  assert.equal(deleteResult.ok, true);
  assert.equal(deleteResult.modelResult.success, true);
  assert.equal(runtime.getMutations().length, 1);
  assert.equal(runtime.getMutations()[0].type, 'delete');
  await assert.rejects(() => provider.readFile('src/OldPanel.jsx'), /ENOENT/);
}

function testSandboxDeleteProtectedCoreContract() {
  assert.equal(isDeleteProtectedFile('src/App.jsx'), true);
  assert.equal(isDeleteProtectedFile('/home/user/app/src/App.tsx'), true);
  assert.equal(isDeleteProtectedFile('index.html'), true);
  assert.equal(isDeleteProtectedFile('src/components/OldPanel.jsx'), false);
}

async function testToolRuntimePackageInstallGuardContract() {
  assert.deepEqual(validatePackageNames(['lucide-react', '@radix-ui/react-icons@1.3.0']), [
    'lucide-react',
    '@radix-ui/react-icons@1.3.0'
  ]);
  assert.throws(() => validatePackageNames(['https://example.com/pkg.tgz']), /Unsafe/);
  assert.throws(() => validatePackageNames(['left-pad;rm -rf /']), /Unsafe/);

  const hiddenRuntime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-install-hidden',
    verifyBuild: async () => ({ success: true })
  });
  const hiddenResult = await hiddenRuntime.execute('install_packages', {
    packages: ['lucide-react'],
    confirmation: 'INSTALL_PACKAGES'
  });

  assert.equal(hiddenResult.ok, false);
  assert.equal(hiddenResult.modelResult.code, 'TOOL_NOT_EXPOSED');

  const installCalls = [];
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider({}, {
      installPackages: async (packages) => {
        installCalls.push(packages);
        return { success: true, stdout: 'installed', stderr: '', exitCode: 0 };
      }
    }),
    sandboxId: 'sandbox-tool-install',
    enablePackageTools: true,
    permissionMode: TOOL_PERMISSION_MODES.PACKAGE_INSTALL,
    verifyBuild: async () => ({ success: true })
  });

  const missingConfirmation = await runtime.execute('install_packages', {
    packages: ['lucide-react']
  });
  assert.equal(missingConfirmation.ok, false);
  assert.equal(missingConfirmation.modelResult.code, 'TOOL_CONFIRMATION_REQUIRED');

  const result = await runtime.execute('install_packages', {
    packages: ['lucide-react'],
    confirmation: 'INSTALL_PACKAGES'
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelResult.success, true);
  assert.deepEqual(installCalls, [['lucide-react']]);
  assert.equal(runtime.getSideEffects()[0].type, 'package_install');
}

async function testToolRuntimeResetGuardContract() {
  const hiddenRuntime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-reset-hidden',
    verifyBuild: async () => ({ success: true })
  });
  const hiddenResult = await hiddenRuntime.execute('reset_sandbox_app', {
    confirmation: 'RESET_SANDBOX_APP'
  });

  assert.equal(hiddenResult.ok, false);
  assert.equal(hiddenResult.modelResult.code, 'TOOL_NOT_EXPOSED');

  let resetCount = 0;
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider({}, {
      setupViteApp: async () => {
        resetCount += 1;
      }
    }),
    sandboxId: 'sandbox-tool-reset',
    enableSandboxAdminTools: true,
    permissionMode: TOOL_PERMISSION_MODES.SANDBOX_ADMIN,
    verifyBuild: async () => ({ success: true })
  });

  const missingConfirmation = await runtime.execute('reset_sandbox_app', {});
  assert.equal(missingConfirmation.ok, false);
  assert.equal(missingConfirmation.modelResult.code, 'TOOL_CONFIRMATION_REQUIRED');

  const result = await runtime.execute('reset_sandbox_app', {
    confirmation: 'RESET_SANDBOX_APP',
    reason: 'test reset'
  });

  assert.equal(result.ok, true);
  assert.equal(resetCount, 1);
  assert.equal(runtime.getSideEffects()[0].type, 'sandbox_reset');
}

async function testSandboxResolverStrictIdentityContract() {
  const requestedProvider = createFakeProvider({}, { sandboxId: 'agent-requested' });
  const globalProvider = createFakeProvider({}, { sandboxId: 'agent-global' });

  sandboxManager.registerSandbox('agent-requested', requestedProvider);
  global.activeSandboxProvider = globalProvider;
  global.sandboxData = { sandboxId: 'agent-global', url: 'https://global.example' };

  const exact = await resolveSandboxProvider({
    sandboxId: 'agent-requested',
    allowGlobalFallback: false,
    allowReconnect: false
  });

  assert.equal(exact.ok, true);
  assert.equal(exact.provider, requestedProvider);
  assert.equal(exact.sandboxId, 'agent-requested');

  await sandboxManager.terminateSandbox('agent-requested');

  const missing = await resolveSandboxProvider({
    sandboxId: 'agent-missing',
    allowGlobalFallback: false,
    allowReconnect: false
  });

  assert.equal(missing.ok, false);
  assert.equal(missing.code, 'SANDBOX_MISSING');
  assert.equal(sandboxManager.getProvider('agent-missing'), null);

  global.activeSandboxProvider = null;
  global.sandboxData = null;
}

function testSandboxPathBoundaryContract() {
  assert.equal(normalizePath('src/App.jsx'), '/home/user/app/src/App.jsx');
  assert.throws(() => normalizePath('src/../App.jsx'), /directory traversal/);
  assert.throws(() => normalizePath('/etc/passwd'), /outside the sandbox root/);
  assert.throws(() => normalizePath(''), /empty/);
}

async function testToolRuntimeCatalogFetchParityContract() {
  const componentBundle = {
    files: [
      {
        path: 'src/components/PremiumHero.jsx',
        content: 'export default function PremiumHero() {\n  return <section>Premium</section>;\n}\n'
      }
    ]
  };
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-catalog',
    enableCatalogTools: true,
    getCatalog: async () => ({ components: [] }),
    getBundle: async (componentId) => componentId === 'hero.premium.v1' ? componentBundle : null,
    verifyBuild: async () => ({ success: true })
  });

  const directResult = await runtime.execute('fetch_component_bundle', {
    component_id: 'hero.premium.v1'
  });
  const { executors } = toGeminiToolExecutors(runtime);
  const geminiResult = await executors.fetch_component_bundle({
    component_id: 'hero.premium.v1'
  });

  assert.equal(directResult.ok, true);
  assert.deepEqual(geminiResult, directResult.modelResult);
  assert.equal(geminiResult.files[0].path, 'src/components/PremiumHero.jsx');
  assert.equal(runtime.getMutations().length, 0);
}

function testComponentTurnPolicyCatalogGateContract() {
  assert.equal(shouldEnableCatalogToolsForEdit({ prompt: 'make it darker' }), false);
  assert.equal(shouldEnableCatalogToolsForEdit({ prompt: 'fix mobile spacing' }), false);
  assert.equal(shouldEnableCatalogToolsForEdit({ prompt: 'add pricing section' }), true);
  assert.equal(shouldEnableCatalogToolsForEdit({ prompt: 'Add a models page' }), true);
  assert.equal(shouldEnableCatalogToolsForEdit({ prompt: 'create a gallery route' }), true);
  assert.equal(shouldEnableCatalogToolsForEdit({ prompt: 'use stronger components for the hero' }), true);
  assert.equal(shouldEnableCatalogToolsForEdit({ prompt: 'replace the dashboard cards' }), true);
  assert.equal(isLikelyMutatingEditPrompt('Add a models page'), true);
  assert.equal(isLikelyMutatingEditPrompt('what files are in this project?'), false);
  assert.equal(shouldEnableCatalogToolsForEdit({
    prompt: 'small color tweak',
    manualSelectionIds: ['component.manual.v1']
  }), true);
}

function testInitialComponentPromptManualIdsContract() {
  const list = buildInitialComponentSelectionList(
    [{ id: 'hero.premium.v1', name: 'Premium Hero' }],
    ['hero.premium.v1', 'footer.luxury.v1']
  );

  assert.match(list, /Premium Hero \(ID: hero\.premium\.v1\)/);
  assert.match(list, /Component ID: footer\.luxury\.v1/);
  assert.equal((list.match(/hero\.premium\.v1/g) || []).length, 1);

  const prompt = buildInitialComponentPrompt({
    prompt: 'Build a cinematic gaming landing page',
    manualSelectionIds: ['shader.hero.v1']
  });

  assert.match(prompt, /shader\.hero\.v1/);
  assert.match(prompt, /install_component_bundle/);
  assert.match(prompt, /Component plan:/);
  assert.match(prompt, /custom-code missing gaps/i);
}

async function testToolRuntimeBuildCheckContract() {
  const runtime = createAgentToolRuntime({
    provider: createFakeProvider(),
    sandboxId: 'sandbox-tool-build',
    verifyBuild: async () => ({
      success: true,
      exitCode: 0,
      summary: 'Vite build passed.',
      previewHealthy: true,
      runtimeHealthy: true,
      runtimeDiagnostics: {
        render: { hasContent: true, textLen: 42, mediaCount: 0 },
        browserConsole: { errorCount: 0, pageErrorCount: 0, requestFailureCount: 0, entries: [] }
      },
      stages: [{ name: 'vite_build', success: true, required: true }]
    })
  });

  const result = await runtime.execute('get_build_errors');

  assert.equal(result.ok, true);
  assert.equal(result.modelResult.buildPassed, true);
  assert.equal(result.modelResult.previewHealthy, true);
  assert.equal(result.modelResult.runtimeHealthy, true);
  assert.equal(result.modelResult.runtimeDiagnostics.browserConsole.errorCount, 0);
  assert.equal(result.modelResult.stages[0].name, 'vite_build');
  assert.equal(runtime.getBuildChecks().length, 1);
  assert.equal(runtime.getBuildChecks()[0].buildPassed, true);
}

async function testStagedBrowserRuntimeDiagnosticsContract() {
  const sandboxId = 'agent-harness-runtime-diagnostics';
  sandboxManager.registerSandbox(sandboxId, createVerificationProvider({
    buildPasses: true,
    previewPasses: true,
    url: 'https://runtime.example'
  }));

  const result = await verifySandboxBuild(sandboxId, {
    captureForVerificationFn: async () => ({
      hasContent: false,
      scrollHeight: 900,
      textLen: 0,
      bodyChildCount: 1,
      mediaCount: 0,
      browserConsole: {
        total: 3,
        errorCount: 1,
        warningCount: 1,
        pageErrorCount: 1,
        requestFailureCount: 0,
        returnedLines: 2,
        truncated: false,
        maxLines: 200,
        entries: [
          { source: 'pageerror', level: 'error', text: 'ReferenceError: ModelGallery is not defined' },
          { source: 'console', level: 'warn', text: 'Fallback route rendered' }
        ]
      }
    })
  });

  assert.equal(result.success, true);
  assert.equal(result.buildPassed, true);
  assert.equal(result.previewHealthy, false);
  assert.equal(result.runtimeHealthy, false);
  assert.match(result.summary, /browser runtime/i);
  assert.equal(result.runtimeDiagnostics.browserConsole.entries.length, 2);
  assert.match(result.logs, /ReferenceError: ModelGallery is not defined/);

  await sandboxManager.terminateSandbox(sandboxId);
}

function testComponentIntentDashboardContract() {
  const intent = inferComponentIntent('Create a dark premium dashboard to manage all my girlfriends with profile cards and a schedule.');

  assert.ok(intent.siteTypes.includes('dashboard'));
  assert.ok(intent.sectionRoles.includes('dashboard'));
  assert.ok(intent.sectionRoles.includes('profile'));
  assert.ok(intent.sectionRoles.includes('cards'));
  assert.ok(intent.sectionRoles.includes('calendar'));
  assert.ok(intent.moodTones.includes('premium'));
  assert.ok(intent.colorModes.includes('dark'));
}

function testComponentIntentWordBoundaryContract() {
  const intent = inferComponentIntent(
    'Build a King Von merchandise shop with a cart, checkout, and product cards.',
  );

  assert.ok(intent.siteTypes.includes('ecommerce'));
  assert.ok(intent.sectionRoles.includes('ecommerce'));
  assert.ok(!intent.siteTypes.includes('automotive'));
  assert.ok(!intent.sectionRoles.includes('pricing'));

  const productionIntent = inferComponentIntent(
    'Create a cinematic production story with strong performance photography.',
  );
  assert.ok(!productionIntent.siteTypes.includes('ecommerce'));
  assert.ok(!productionIntent.sectionRoles.includes('form'));
}

function testComponentFitRankingContract() {
  const components = [
    {
      id: 'hero.shader.cinematic.v1',
      name: 'Cinematic Shader Hero',
      category: 'hero',
      tags: ['webgl', 'landing'],
      description: 'Immersive landing page hero',
      qualityScore: 10,
      ratingAvg: 5
    },
    {
      id: 'dashboard.profile.cards.v1',
      name: 'Profile Management Dashboard Cards',
      category: 'dashboard',
      tags: ['admin', 'profile', 'cards', 'schedule'],
      description: 'Dashboard grid for managing people, profiles, notes, and calendar activity.',
      suitableFor: ['CRM dashboard', 'admin workspace'],
      moodTone: 'premium professional',
      colorProfile: { mode: 'dark', primary: 'teal' },
      qualityScore: 8.5,
      ratingAvg: 4.7
    },
    {
      id: 'footer.simple.v1',
      name: 'Simple Footer',
      category: 'footer',
      tags: ['links'],
      qualityScore: 9
    }
  ];

  const ranked = rankComponentsForPrompt(
    components,
    'Create a dark premium dashboard to manage all my girlfriends with profile cards and schedules.',
    { maxItems: 3 }
  );
  const dashboardFit = scoreComponentFit(components[1], 'Create a dark premium dashboard to manage all my girlfriends with profile cards and schedules.');
  const heroFit = scoreComponentFit(components[0], 'Create a dark premium dashboard to manage all my girlfriends with profile cards and schedules.');

  assert.equal(ranked[0].id, 'dashboard.profile.cards.v1');
  assert.ok(dashboardFit.score > heroFit.score);
  assert.ok(ranked[0].matchedRoles.includes('dashboard'));
  assert.ok(ranked[0].fitReasons.some((reason) => reason.startsWith('section:')));
}

function testComponentExactVerticalRankingContract() {
  const components = [
    {
      id: 'pricing.minimal.v1',
      name: 'Minimal Dark Pricing',
      category: 'pricing',
      tags: ['premium', 'dark', 'cards'],
      suitableFor: ['SaaS subscriptions'],
      qualityScore: 10,
    },
    {
      id: 'feature.code.integration.v1',
      name: 'Code Integration Feature',
      category: 'features',
      description: 'A production-ready product integration section.',
      suitableFor: ['Developer portfolios'],
      qualityScore: 10,
    },
    {
      id: 'header.ecommerce.v1',
      name: 'Premium Ecommerce Mega Menu',
      category: 'header',
      tags: ['ecommerce', 'cart'],
      suitableFor: ['Online stores', 'Fashion retailers'],
      qualityScore: 8,
    },
    {
      id: 'background.streetwear.v1',
      name: 'Underground Streetwear Background',
      category: 'background',
      keywords: ['fashion drop', 'sneaker drop'],
      suitableFor: ['Streetwear brands'],
      qualityScore: 8,
    },
    {
      id: 'product.showcase.v1',
      name: 'Editorial Product Showcase',
      category: 'features',
      tags: ['product', 'showcase'],
      qualityScore: 7,
    },
  ];

  const ranked = rankComponentsForPrompt(
    components,
    'Build a dedicated King Von merchandise ecommerce shop with a catalog, cart, limited drops, and streetwear styling.',
    { maxItems: 6 },
  );
  const ids = ranked.map((component) => component.id);

  assert.deepEqual(ids.sort(), [
    'background.streetwear.v1',
    'header.ecommerce.v1',
    'product.showcase.v1',
  ]);
  assert.ok(!ids.includes('pricing.minimal.v1'));
  assert.ok(!ids.includes('feature.code.integration.v1'));

  const noExactMatch = rankComponentsForPrompt(
    components.slice(0, 2),
    'Build a merchandise ecommerce shop with catalog and checkout.',
    { maxItems: 6 },
  );
  assert.deepEqual(noExactMatch, []);

  const industryTaggedMatch = rankComponentsForPrompt([
    {
      id: 'collection.editorial.v1',
      name: 'Editorial Collection',
      category: 'features',
      industryTags: ['ecommerce'],
      qualityScore: 7,
    },
  ], 'Build a merchandise ecommerce shop.', { maxItems: 6 });
  assert.equal(industryTaggedMatch[0]?.id, 'collection.editorial.v1');

  const negativeFit = scoreComponentFit({
    id: 'header.ecommerce.unsuitable.v1',
    name: 'Ecommerce Header',
    category: 'header',
    tags: ['ecommerce'],
    notSuitableFor: ['E-commerce product listings'],
    qualityScore: 8,
  }, 'Build a merchandise ecommerce shop with product listings.');
  assert.equal(negativeFit.penalty, 0.35);
  assert.ok(negativeFit.reasons.includes('penalty:not_suitable'));
}

function testComponentNotSuitablePenaltyContract() {
  const prompt = 'Create a dashboard for a professional CRM admin workspace.';
  const goodFit = scoreComponentFit({
    id: 'dashboard.crm.v1',
    name: 'CRM Dashboard',
    category: 'dashboard',
    suitableFor: ['CRM dashboard'],
    tags: ['admin', 'table', 'stats'],
    qualityScore: 7
  }, prompt);
  const badFit = scoreComponentFit({
    id: 'kids.playful.hero.v1',
    name: 'Playful Kids Hero',
    category: 'hero',
    tags: ['playful', 'landing'],
    notSuitableFor: ['dashboard', 'admin', 'CRM'],
    qualityScore: 10
  }, prompt);

  assert.ok(goodFit.score > badFit.score);
  assert.ok(badFit.reasons.includes('penalty:not_suitable'));
}

async function testStagedVerificationPassContract() {
  const sandboxId = 'agent-harness-verification-pass';
  sandboxManager.registerSandbox(sandboxId, createVerificationProvider({ buildPasses: true, previewPasses: true }));

  // Full production build path (opt-in, thorough).
  const result = await verifySandboxBuild(sandboxId, {
    fullBuild: true,
    captureForVerificationFn: async () => ({
      hasContent: true, scrollHeight: 900, textLen: 120, mediaCount: 2, bodyChildCount: 4,
      browserConsole: { total: 0, errorCount: 0, warningCount: 0, pageErrorCount: 0, requestFailureCount: 0, returnedLines: 0, truncated: false, maxLines: 200, entries: [] }
    })
  });

  assert.equal(result.success, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.buildPassed, true);
  assert.equal(result.previewHealthy, true);
  assert.ok(result.stages.some((stage) => stage.name === 'resolve_provider'));
  assert.ok(result.stages.some((stage) => stage.name === 'vite_build'));
  assert.ok(result.stages.some((stage) => stage.name === 'preview_health'));
  assert.match(result.logs, /VERIFICATION STAGES/);

  await sandboxManager.terminateSandbox(sandboxId);

  // Fast (default) path: no production build, verified against the live preview.
  const fastSandboxId = 'agent-harness-verification-fast';
  sandboxManager.registerSandbox(fastSandboxId, createVerificationProvider({ previewPasses: true, url: 'https://fast.example' }));
  const fast = await verifySandboxBuild(fastSandboxId, {
    captureForVerificationFn: async () => ({
      hasContent: true, scrollHeight: 1200, textLen: 240, mediaCount: 3, bodyChildCount: 6,
      screenshots: [{ label: 'desktop', base64: 'AAAA', mimeType: 'image/jpeg' }],
      browserConsole: { total: 0, errorCount: 0, warningCount: 0, pageErrorCount: 0, requestFailureCount: 0, returnedLines: 0, truncated: false, maxLines: 200, entries: [] }
    })
  });
  assert.equal(fast.success, true);
  assert.equal(fast.buildPassed, true);
  assert.equal(fast.previewHealthy, true);
  assert.ok(!fast.stages.some((stage) => stage.name === 'vite_build'), 'fast path must not run a production build');
  assert.ok(fast.stages.some((stage) => stage.name === 'preview_health'));
  assert.equal(fast.screenshots.length, 1, 'fast path surfaces reusable screenshots');
  await sandboxManager.terminateSandbox(fastSandboxId);

  // Fast path compile failure: Vite error overlay → buildPassed false.
  const overlaySandboxId = 'agent-harness-verification-overlay';
  sandboxManager.registerSandbox(overlaySandboxId, createVerificationProvider({ previewPasses: true, url: 'https://overlay.example' }));
  const overlay = await verifySandboxBuild(overlaySandboxId, {
    captureForVerificationFn: async () => ({
      hasContent: false, scrollHeight: 0, textLen: 0, mediaCount: 0, bodyChildCount: 1,
      viteOverlay: 'src/App.jsx: Unexpected token (12:3)',
      browserConsole: { total: 1, errorCount: 0, warningCount: 0, pageErrorCount: 0, requestFailureCount: 0, returnedLines: 1, truncated: false, maxLines: 200, entries: [{ source: 'vite_overlay', level: 'error', text: 'Vite compile error: Unexpected token' }] }
    })
  });
  assert.equal(overlay.buildPassed, false, 'vite overlay must fail the compile check');
  assert.match(overlay.summary, /compile error/i);
  await sandboxManager.terminateSandbox(overlaySandboxId);
}

async function testStagedVerificationFailureContract() {
  const sandboxId = 'agent-harness-verification-fail';
  sandboxManager.registerSandbox(sandboxId, createVerificationProvider({ buildPasses: false }));

  const result = await verifySandboxBuild(sandboxId, { fullBuild: true });

  assert.equal(result.success, false);
  assert.equal(result.exitCode, 1);
  assert.equal(result.buildPassed, false);
  assert.equal(result.previewHealthy, null);
  assert.ok(result.stages.some((stage) => stage.name === 'diagnostics_files'));
  assert.ok(result.stages.some((stage) => stage.name === 'diagnostics_dependencies'));
  assert.match(result.logs, /Vite build failed/);

  await sandboxManager.terminateSandbox(sandboxId);

  // Fast path failure: dev server not serving → buildPassed false.
  const downSandboxId = 'agent-harness-verification-down';
  sandboxManager.registerSandbox(downSandboxId, createVerificationProvider({ previewPasses: false, url: 'https://down.example' }));
  const down = await verifySandboxBuild(downSandboxId, { captureRuntime: false });
  assert.equal(down.success, false);
  assert.equal(down.buildPassed, false);
  assert.ok(!down.stages.some((stage) => stage.name === 'vite_build'));
  await sandboxManager.terminateSandbox(downSandboxId);
}

function testBenignConsoleErrorClassificationContract() {
  // A missing-asset 404 (console error) + a stylesheet asset failure must NOT
  // count as fatal errors, so they never block build verification.
  const benign = compactConsoleEntries([
    { source: 'console', level: 'error', text: 'Failed to load resource: the server responded with a status of 404 (Not Found)' },
    { source: 'asset', level: 'warn', text: 'GET https://x/tokens.css failed: net::ERR_ABORTED' },
    { source: 'console', level: 'error', text: 'GET https://fonts.googleapis.com/css2 net::ERR_FAILED' }
  ]);
  assert.equal(benign.errorCount, 0, 'asset 404s must not count as fatal errors');
  assert.ok(benign.assetErrorCount >= 1, 'asset 404s are surfaced as asset warnings');
  assert.equal(benign.requestFailureCount, 0);
  assert.equal(benign.pageErrorCount, 0);

  // A real JS error and an uncaught page error MUST stay fatal.
  const fatal = compactConsoleEntries([
    { source: 'console', level: 'error', text: 'Uncaught ReferenceError: ModelGallery is not defined' },
    { source: 'pageerror', level: 'error', text: 'TypeError: Cannot read properties of undefined (reading map)' }
  ]);
  assert.ok(fatal.errorCount >= 1, 'real JS console error stays fatal');
  assert.equal(fatal.pageErrorCount, 1, 'uncaught page error stays fatal');
}

function sseEvent(event, payload) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function chunkedSseStream(text, sizes = [5, 11, 1, 23, 4, 31, 8]) {
  const chunks = [];
  let index = 0;
  let sizeIndex = 0;
  while (index < text.length) {
    const size = sizes[sizeIndex % sizes.length];
    chunks.push(text.slice(index, index + size));
    index += size;
    sizeIndex += 1;
  }

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    }
  });
}

function createFakeProvider(seedFiles = {}, options = {}) {
  const root = '/home/user/app';
  const files = new Map();

  for (const [filePath, content] of Object.entries(seedFiles)) {
    files.set(toAbsolutePath(filePath), content);
  }

  function toAbsolutePath(filePath) {
    if (filePath.startsWith(`${root}/`)) return filePath;
    return `${root}/${filePath.replace(/^\/+/, '')}`;
  }

  return {
    async listFiles() {
      return [...files.keys()].map((filePath) => filePath.slice(root.length + 1));
    },
    async readFile(filePath) {
      const absolutePath = toAbsolutePath(filePath);
      if (!files.has(absolutePath)) {
        throw new Error(`ENOENT: ${filePath}`);
      }
      return files.get(absolutePath);
    },
    async writeFile(filePath, content) {
      files.set(toAbsolutePath(filePath), content);
    },
    async deleteFile(filePath) {
      files.delete(toAbsolutePath(filePath));
    },
    async runCommand(command) {
      if (options.runCommand) return options.runCommand(command);
      const rmMatch = command.match(/rm -f "([^"]+)"/);
      if (rmMatch) {
        files.delete(toAbsolutePath(rmMatch[1]));
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    },
    async installPackages(packages) {
      if (options.installPackages) return options.installPackages(packages);
      return { success: true, stdout: `installed ${packages.join(', ')}`, stderr: '', exitCode: 0 };
    },
    async setupViteApp() {
      if (options.setupViteApp) return options.setupViteApp();
      files.clear();
      files.set(toAbsolutePath('src/App.jsx'), 'export default function App() { return null; }\n');
    },
    async terminate() {
      files.clear();
    },
    getSandboxInfo() {
      return {
        sandboxId: options.sandboxId || 'fake-sandbox',
        url: options.url === null ? null : (options.url || 'https://fake.example'),
        provider: 'fake'
      };
    },
    isAlive() {
      return options.alive !== false;
    },
    getCapabilities() {
      return {
        fileRead: true,
        fileWrite: true,
        command: true,
        packageInstall: true,
        appReset: true,
        viteRestart: false,
        deleteFile: true,
        pathSafetyCheck: false
      };
    }
  };
}

function createVerificationProvider({ buildPasses = true, previewPasses = true, url = null } = {}) {
  return createFakeProvider({}, {
    url,
    runCommand: async (command) => {
      if (command.includes('npx vite build')) {
        return buildPasses
          ? { stdout: 'vite build ok', stderr: '', exitCode: 0, success: true }
          : { stdout: '', stderr: 'src/App.jsx: Unexpected token', exitCode: 1, success: false };
      }

      if (command.includes('127.0.0.1:5173')) {
        return previewPasses
          ? { stdout: '{"url":"http://127.0.0.1:5173","status":200,"ok":true,"bytes":1234}', stderr: '', exitCode: 0, success: true }
          : { stdout: '', stderr: 'fetch failed', exitCode: 1, success: false };
      }

      if (command.includes('npm list')) {
        return { stdout: 'sandbox-app@1.0.0', stderr: '', exitCode: 0, success: true };
      }

      if (command.includes('ls -la')) {
        return { stdout: 'package.json\nsrc', stderr: '', exitCode: 0, success: true };
      }

      return { stdout: 'ok', stderr: '', exitCode: 0, success: true };
    }
  });
}
