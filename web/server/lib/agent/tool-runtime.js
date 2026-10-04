import { tool, generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../provider-helpers.js';
import { resolveLightweightModel } from '../llm-lightweight.js';
import { resolveModelRole } from '../../shared/model-registry.js';
import {
  listFiles,
  readFile,
  createFile,
  editFile,
  replaceFile,
  deleteFile,
  searchFiles,
  isProtectedFile
} from '../../shared/sandbox-fs.js';
import { verifySandboxBuild } from '../verify-sandbox-build.js';
import { getProviderCapabilities } from '../sandbox/provider-resolver.js';
import { getCatalogForPromptAsync, getBundleAsync, bundleToFileBlocks } from '../registry/registry.js';
import { recordComponentInstall } from '../community/usage-flywheel.js';
import {
  AgentToolPolicyError,
  TOOL_CATEGORIES,
  TOOL_PERMISSION_MODES,
  assertToolAllowed,
  makeToolPolicy,
  normalizeToolPolicyOptions,
  serializeToolPolicy,
  shouldExposeTool
} from './tool-policy.js';

export const SOURCE_SAFETY_LIMITS = Object.freeze({
  readDefaultLineLimit: 360,
  readMaxModelChars: 28000,
  searchMaxLineChars: 700,
  searchMaxModelChars: 32000,
  bundleInlineFileChars: 22000,
  bundleInlineTotalChars: 44000
});

// Packages preinstalled in the sandbox template — never reinstalled.
const SANDBOX_BASE_PACKAGES = new Set([
  'react', 'react-dom', 'framer-motion', 'lucide-react', 'react-icons',
  'react-router-dom', 'clsx', 'tailwind-merge', 'three',
  '@react-three/fiber', '@react-three/drei', '@radix-ui/react-icons'
]);

// Curated allowlist for agent-driven package installs (install_packages tool
// and automatic component `requires` installation). Quality, widely-used,
// design-relevant libraries only.
const AGENT_PACKAGE_ALLOWLIST = new Set([
  'gsap', '@gsap/react', 'recharts', 'lottie-react', 'embla-carousel-react',
  'swiper', 'react-countup', 'react-intersection-observer', 'zustand',
  'date-fns', '@react-spring/web', 'ogl', 'postprocessing', 'maath',
  'react-hook-form', 'zod', 'sonner', 'vaul', 'cmdk',
  'class-variance-authority', 'react-fast-marquee', 'simplex-noise',
  'canvas-confetti', 'react-parallax-tilt', 'react-type-animation',
  'react-wrap-balancer', 'split-type', 'lenis', 'matter-js'
]);
const ALLOWLISTED_SCOPE_PREFIXES = ['@radix-ui/'];

export function isAllowlistedPackage(packageName) {
  // Strip a trailing version spec ("pkg@1.2", "@scope/pkg@^2") but keep the
  // leading scope marker of scoped package names.
  const bare = String(packageName || '').trim()
    .replace(/(.+?)@[^@/]*$/, '$1');
  if (!bare) return false;
  if (SANDBOX_BASE_PACKAGES.has(bare)) return true;
  if (AGENT_PACKAGE_ALLOWLIST.has(bare)) return true;
  return ALLOWLISTED_SCOPE_PREFIXES.some((prefix) => bare.startsWith(prefix));
}

/**
 * Normalize a bundle's `requires` field (array of names, or object map of
 * name → version) into a deduped list of package names.
 */
export function extractRequiredPackages(requires) {
  let entries = [];
  const parsed = typeof requires === 'string' ? safeJsonParse(requires) : requires;
  if (Array.isArray(parsed)) {
    entries = parsed;
  } else if (parsed && typeof parsed === 'object') {
    entries = Array.isArray(parsed.packages) ? parsed.packages : Object.keys(parsed);
  }
  return [...new Set(entries
    .map((entry) => typeof entry === 'string' ? entry.trim() : entry?.name)
    .filter(Boolean))];
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ─── Page planning (multi-page architect) ───────────────────

const pagePlanSchema = z.object({
  buildMode: z.enum(['single_page_multi_section', 'multi_page'])
    .describe('multi_page only when distinct routes genuinely serve the user better'),
  reasoning: z.string().describe('One short sentence on why this structure fits'),
  sharedNav: z.object({
    links: z.array(z.object({
      label: z.string(),
      route: z.string().describe('Route path beginning with /')
    })).min(1).max(8)
  }),
  pages: z.array(z.object({
    route: z.string().describe('Route path, e.g. "/" or "/about"'),
    name: z.string().describe('Human page name, e.g. "Home"'),
    fileName: z.string().describe('Component file, e.g. "src/pages/Home.jsx"'),
    purpose: z.string().describe('What this page must accomplish'),
    sections: z.array(z.string()).min(1).max(8).describe('Ordered section roles, e.g. ["hero", "features", "cta"]')
  })).min(1).max(8)
});

const PAGE_PLAN_SYSTEM_PROMPT = `You are a senior information architect for premium marketing and product websites.
Given a site description, design the page structure:
- Prefer single_page_multi_section for simple brochure/landing briefs; choose multi_page when the content genuinely needs separate routes (shops, multi-service businesses, docs, dashboards, restaurants with menus, etc.).
- Every page gets a clear purpose and an ordered list of section roles.
- Routes are clean and lowercase. The home page is always "/".
- Shared navigation links cover every page (and key anchors for single-page builds).
- Never invent filler pages. 2-5 pages is the sweet spot for multi_page.`;

async function generatePagePlan({ siteDescription, pageCountHint = null }) {
  const modelId = resolveLightweightModel(resolveModelRole('generalGeneration')).id;
  const hint = pageCountHint ? `\nThe user wants roughly ${pageCountHint} pages.` : '';
  const result = await generateObject({
    model: getModel(modelId),
    schema: pagePlanSchema,
    maxRetries: 3,
    messages: [
      { role: 'system', content: PAGE_PLAN_SYSTEM_PROMPT },
      { role: 'user', content: `Plan the page architecture for this website:\n\n${String(siteDescription || '').slice(0, 4000)}${hint}` }
    ],
    temperature: 0
  });
  return result.object;
}

const BROWSE_MAX_RESULTS = 30;
const BROWSE_PREVIEW_IMAGE_COUNT = 6;
const PREVIEW_IMAGE_MAX_BYTES = 350_000; // skip oversized thumbnails to protect context
const PREVIEW_IMAGE_FETCH_TIMEOUT_MS = 6000;

/**
 * Download component preview thumbnails (Supabase storage URLs) as base64 so
 * the harness can attach them as image parts. Failures are silently skipped —
 * previews are an enhancement, never a blocker.
 */
async function fetchComponentPreviewImages(components = []) {
  const results = await Promise.all(components.map(async (component) => {
    try {
      const response = await fetch(component.thumbnailUrl, {
        signal: AbortSignal.timeout(PREVIEW_IMAGE_FETCH_TIMEOUT_MS)
      });
      if (!response.ok) return null;
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > PREVIEW_IMAGE_MAX_BYTES) return null;
      return {
        componentId: component.id,
        name: component.name,
        base64: buffer.toString('base64'),
        mimeType: contentType.split(';')[0]
      };
    } catch {
      return null;
    }
  }));
  return results.filter(Boolean);
}

export function bundleToFiles(bundle) {
  const fileBlocks = bundleToFileBlocks(bundle);
  const fileRegex = /<file path="([^"]+)">(\n?)([\s\S]*?)<\/file>/g;
  const files = [];
  let match;

  while ((match = fileRegex.exec(fileBlocks)) !== null) {
    files.push({ path: match[1], content: match[3].trim() });
  }

  return files;
}

export function createAgentToolRuntime({
  provider,
  sandboxId,
  projectId = null,
  sessionId = null,
  onEvent = () => {},
  enableCatalogTools = false,
  enablePackageTools = false,
  enableDestructiveTools = false,
  enableSandboxAdminTools = false,
  providerCapabilities = null,
  permissionMode = TOOL_PERMISSION_MODES.WORKSPACE_WRITE,
  verifyBuild = verifySandboxBuild,
  getCatalog = getCatalogForPromptAsync,
  getBundle = getBundleAsync,
  debugTimeline = null
} = {}) {
  const mutations = [];
  const buildChecks = [];
  const sideEffects = [];
  const toolCallLog = [];
  // Visual attachments (e.g. component preview thumbnails) queued by tools for
  // the harness to inject as image parts on the next model round.
  const visualAttachments = [];
  const policyOptions = normalizeToolPolicyOptions({
    permissionMode,
    enableCatalogTools,
    enablePackageTools,
    enableDestructiveTools,
    enableSandboxAdminTools,
    providerCapabilities: providerCapabilities || getProviderCapabilities(provider)
  });
  const allDefinitions = buildToolDefinitions();
  const definitions = allDefinitions.filter((definition) => shouldExposeTool(definition, policyOptions));
  const definitionMap = new Map(allDefinitions.map((definition) => [definition.name, definition]));

  async function execute(toolName, args = {}) {
    const startedAt = Date.now();
    const definition = definitionMap.get(toolName);
    if (!definition) {
      debugTimeline?.event?.('tool_result', {
        toolName,
        success: false,
        durationMs: 0,
        error: { code: 'UNKNOWN_TOOL', message: `Unknown tool: ${toolName}` }
      });
      return {
        ok: false,
        toolName,
        args,
        result: { error: `Unknown tool: ${toolName}` },
        modelResult: { error: `Unknown tool: ${toolName}` }
      };
    }

    const eventArgs = definition.eventArgs ? definition.eventArgs(args) : args;
    const serializedPolicy = serializeToolPolicy(definition);
    debugTimeline?.event?.('tool_start', {
      toolName,
      args: eventArgs || {},
      policy: serializedPolicy
    });
    emitToolEvent(onEvent, 'tool_start', {
      toolName,
      args: eventArgs || {},
      policy: serializedPolicy
    });

    try {
      assertToolAllowed(definition, args, policyOptions);

      const outcome = await definition.run({
        args,
        provider,
        sandboxId,
        projectId,
        sessionId,
        verifyBuild,
        getCatalog,
        getBundle
      });

      if (outcome.mutation) {
        mutations.push({
          tool: toolName,
          path: outcome.mutation.path,
          type: outcome.mutation.type || definition.policy?.category || 'mutation',
          timestamp: Date.now()
        });
      }

      if (outcome.visualAttachment?.images?.length) {
        visualAttachments.push(outcome.visualAttachment);
      }

      if (Array.isArray(outcome.mutations)) {
        for (const mutation of outcome.mutations) {
          if (!mutation?.path && !mutation?.filePath) continue;
          mutations.push({
            tool: toolName,
            path: mutation.path || mutation.filePath,
            type: mutation.type || definition.policy?.category || 'mutation',
            timestamp: Date.now()
          });
        }
      }

      if (outcome.sideEffect) {
        sideEffects.push({
          tool: toolName,
          type: outcome.sideEffect.type || definition.policy?.category || 'side_effect',
          summary: outcome.sideEffect.summary || null,
          timestamp: Date.now()
        });
      }

      if (outcome.buildCheck) {
        buildChecks.push({
          ...outcome.buildCheck,
          tool: toolName,
          timestamp: Date.now()
        });
      }

      toolCallLog.push({ name: toolName, args: eventArgs || args, success: true, timestamp: Date.now() });

      emitToolEvent(onEvent, 'tool_result', {
        toolName,
        result: outcome.eventResult ?? outcome.modelResult ?? outcome.result,
        success: true,
        policy: serializedPolicy
      });
      debugTimeline?.event?.('tool_result', {
        toolName,
        success: true,
        durationMs: Date.now() - startedAt,
        policy: serializedPolicy,
        result: outcome.eventResult ?? outcome.modelResult ?? outcome.result,
        mutation: outcome.mutation || null,
        sideEffect: outcome.sideEffect || null,
        buildCheck: outcome.buildCheck || null
      });

      return {
        ok: true,
        toolName,
        args,
        result: outcome.result,
        modelResult: outcome.modelResult ?? outcome.result,
        mutation: outcome.mutation || null,
        mutations: Array.isArray(outcome.mutations) ? outcome.mutations : [],
        sideEffect: outcome.sideEffect || null,
        uiSummary: outcome.uiSummary || null
      };
    } catch (error) {
      const result = normalizeToolError(error);
      toolCallLog.push({ name: toolName, args: eventArgs || args, success: false, timestamp: Date.now() });
      emitToolEvent(onEvent, 'tool_result', {
        toolName,
        result,
        success: false,
        policy: serializedPolicy
      });
      debugTimeline?.event?.('tool_result', {
        toolName,
        success: false,
        durationMs: Date.now() - startedAt,
        policy: serializedPolicy,
        error: result
      });
      return {
        ok: false,
        toolName,
        args,
        result,
        modelResult: result,
        error: result.error
      };
    }
  }

  return {
    definitions,
    allDefinitions,
    execute,
    getMutations: () => mutations,
    getBuildChecks: () => buildChecks,
    getSideEffects: () => sideEffects,
    getToolCalls: () => toolCallLog,
    drainVisualAttachments: () => visualAttachments.splice(0, visualAttachments.length),
    getPolicySummary: () => definitions.map((definition) => ({
      name: definition.name,
      ...serializeToolPolicy(definition)
    }))
  };
}

export function toVercelTools(runtime) {
  const tools = {};
  for (const definition of runtime.definitions) {
    tools[definition.name] = tool({
      description: definition.description,
      parameters: definition.parameters,
      execute: async (args = {}) => {
        const result = await runtime.execute(definition.name, args);
        return result.modelResult;
      }
    });
  }
  return tools;
}

export function toGeminiToolExecutors(runtime) {
  const executors = {};
  for (const definition of runtime.definitions) {
    executors[definition.name] = async (args = {}) => {
      const result = await runtime.execute(definition.name, args);
      return result.modelResult;
    };
  }

  return {
    executors,
    declarations: runtime.definitions.map((definition) => ({
      name: definition.name,
      description: definition.description,
      parameters: definition.jsonSchema
    })),
    getMutations: runtime.getMutations,
    getBuildChecks: runtime.getBuildChecks,
    getSideEffects: runtime.getSideEffects
  };
}

export function normalizeToolError(error) {
  return {
    error: error?.message || String(error || 'Tool failed'),
    code: error?.code || null,
    ...(error instanceof AgentToolPolicyError ? { policy: error.metadata || {} } : {})
  };
}

export function applySourceSafetyToReadResult(result = {}, args = {}) {
  const content = String(result.content || '');
  const allLines = content.split('\n');
  const clippedByLine = allLines.length > SOURCE_SAFETY_LIMITS.readDefaultLineLimit;
  const lineWindow = clippedByLine
    ? allLines.slice(0, SOURCE_SAFETY_LIMITS.readDefaultLineLimit)
    : allLines;
  let safeContent = lineWindow.join('\n');
  let clippedByChars = false;

  if (safeContent.length > SOURCE_SAFETY_LIMITS.readMaxModelChars) {
    safeContent = safeContent.slice(0, SOURCE_SAFETY_LIMITS.readMaxModelChars);
    clippedByChars = true;
  }

  const returnedLines = safeContent.length > 0 ? safeContent.split('\n').length : 0;
  const startLine = result.startLine || 1;
  const lastReturnedLine = Math.max(startLine, startLine + returnedLines - 1);
  const hasMoreLines = Number(result.totalLines || 0) > lastReturnedLine;
  const truncated = clippedByLine || clippedByChars;
  const nextStartLine = (truncated || hasMoreLines) ? lastReturnedLine + 1 : null;

  return {
    ...result,
    content: safeContent,
    lineCount: returnedLines,
    sourceSafety: {
      truncated,
      originalReturnedChars: content.length,
      returnedChars: safeContent.length,
      originalSelectedLines: allLines.length,
      returnedLines,
      totalLines: result.totalLines || allLines.length,
      requestedRange: {
        startLine: args.start_line ?? null,
        endLine: args.end_line ?? null
      },
      appliedLineLimit: SOURCE_SAFETY_LIMITS.readDefaultLineLimit,
      appliedCharLimit: SOURCE_SAFETY_LIMITS.readMaxModelChars,
      hasMoreLines,
      nextStartLine,
      suggestedNextRead: nextStartLine
        ? { path: result.filePath, start_line: nextStartLine, end_line: nextStartLine + SOURCE_SAFETY_LIMITS.readDefaultLineLimit - 1 }
        : null,
      guidance: truncated
        ? 'Large source was clipped to protect the agent context. Continue with read_file using the suggested line range only if those lines are needed.'
        : hasMoreLines
          ? 'The requested line window was returned. More lines exist outside this window; read the next range only if needed.'
          : 'Full selected source was returned.'
    }
  };
}

export function applySourceSafetyToSearchResult(result = {}) {
  let modelChars = 0;
  let truncated = false;
  const safeResults = [];

  for (const fileResult of result.results || []) {
    if (modelChars >= SOURCE_SAFETY_LIMITS.searchMaxModelChars) {
      truncated = true;
      break;
    }

    const safeMatches = [];
    for (const match of fileResult.matches || []) {
      const safeMatch = {
        ...match,
        content: truncate(match.content, SOURCE_SAFETY_LIMITS.searchMaxLineChars),
        context: (match.context || []).map((line) => ({
          ...line,
          content: truncate(line.content, SOURCE_SAFETY_LIMITS.searchMaxLineChars)
        }))
      };
      modelChars += JSON.stringify(safeMatch).length;
      if (modelChars > SOURCE_SAFETY_LIMITS.searchMaxModelChars) {
        truncated = true;
        break;
      }
      safeMatches.push(safeMatch);
    }

    if (safeMatches.length > 0) {
      safeResults.push({
        ...fileResult,
        matches: safeMatches
      });
    }
  }

  return {
    ...result,
    results: safeResults,
    sourceSafety: {
      truncated,
      returnedFiles: safeResults.length,
      totalFiles: result.totalFiles || 0,
      appliedCharLimit: SOURCE_SAFETY_LIMITS.searchMaxModelChars,
      guidance: truncated
        ? 'Search output was clipped. Narrow the query or glob if more exact lines are needed.'
        : 'Search output stayed within the model-safe budget.'
    }
  };
}

export function applySourceSafetyToBundleFiles(files = [], componentId = '') {
  let inlineBudget = SOURCE_SAFETY_LIMITS.bundleInlineTotalChars;
  let totalChars = 0;
  let omittedFileCount = 0;

  const safeFiles = files.map((file) => {
    const content = String(file.content || '');
    const summary = summarizeSourceFile(file.path, content);
    totalChars += content.length;
    const shouldOmit = shouldOmitBundleSource(file.path, content, inlineBudget);

    if (shouldOmit) {
      omittedFileCount += 1;
      return {
        path: file.path,
        omitted: true,
        ...summary,
        sourceSafety: {
          omittedReason: summary.sourceKind === 'shader' ? 'large_shader_source' : 'large_source',
          guidance: 'Use install_component_bundle to write this component directly without loading full source into the model context.'
        }
      };
    }

    inlineBudget -= content.length;
    return {
      path: file.path,
      content,
      omitted: false,
      ...summary
    };
  });

  return {
    componentId,
    files: safeFiles,
    totalFiles: files.length,
    sourceSafety: {
      fullSourceReturned: omittedFileCount === 0,
      omittedFileCount,
      totalChars,
      inlineFileCharLimit: SOURCE_SAFETY_LIMITS.bundleInlineFileChars,
      inlineTotalCharLimit: SOURCE_SAFETY_LIMITS.bundleInlineTotalChars,
      guidance: omittedFileCount > 0
        ? 'Some component source was omitted to protect context. Prefer install_component_bundle, then import the installed files.'
        : 'All component source was small enough to return safely.'
    }
  };
}

function summarizeSourceFile(path = '', content = '') {
  const lineCount = content.length ? content.split('\n').length : 0;
  return {
    lineCount,
    sizeBytes: content.length,
    sourceKind: detectSourceKind(path, content),
    exportHints: extractExportHints(content, path)
  };
}

function shouldOmitBundleSource(path = '', content = '', remainingBudget = SOURCE_SAFETY_LIMITS.bundleInlineTotalChars) {
  if (content.length > SOURCE_SAFETY_LIMITS.bundleInlineFileChars) return true;
  if (content.length > remainingBudget) return true;
  return detectSourceKind(path, content) === 'shader' && content.length > Math.floor(SOURCE_SAFETY_LIMITS.bundleInlineFileChars * 0.55);
}

function detectSourceKind(path = '', content = '') {
  const lowerPath = String(path || '').toLowerCase();
  if (/\.(glsl|frag|vert|wgsl)$/.test(lowerPath)) return 'shader';
  if (/(fragmentShader|vertexShader|gl_FragColor|gl_Position|precision\s+(highp|mediump|lowp)\s+float|uniform\s+\w+|varying\s+\w+|vec[234]\s*\()/i.test(content)) {
    return 'shader';
  }
  if (/(canvas|getContext\(['"]webgl|new\s+THREE\.ShaderMaterial|@react-three\/fiber|three\/)/i.test(content)) {
    return 'visual_runtime';
  }
  return 'source';
}

function extractExportHints(content = '', path = '') {
  const namedExports = new Set();
  const clean = String(content || '');

  let defaultExport = matchFirst(clean, /export\s+default\s+function\s+([A-Za-z_$][\w$]*)/);
  defaultExport ||= matchFirst(clean, /export\s+default\s+class\s+([A-Za-z_$][\w$]*)/);
  defaultExport ||= matchFirst(clean, /export\s+default\s+([A-Za-z_$][\w$]*)/);

  for (const regex of [
    /export\s+(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    /export\s*\{([^}]+)\}/g
  ]) {
    let match;
    while ((match = regex.exec(clean)) !== null) {
      if (regex.source.includes('\\{')) {
        for (const rawName of String(match[1] || '').split(',')) {
          const exportName = rawName.trim().split(/\s+as\s+/i).pop()?.trim();
          if (exportName && /^[A-Za-z_$][\w$]*$/.test(exportName)) namedExports.add(exportName);
        }
      } else if (match[1]) {
        namedExports.add(match[1]);
      }
    }
  }

  return {
    defaultExport: defaultExport || null,
    namedExports: Array.from(namedExports).slice(0, 12),
    suggestedImportName: defaultExport || inferComponentNameFromPath(path)
  };
}

function matchFirst(text, regex) {
  const match = regex.exec(text);
  return match?.[1] || null;
}

function inferComponentNameFromPath(path = '') {
  const fileName = String(path || '').split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Component';
  return fileName
    .replace(/[^A-Za-z0-9_$]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('') || 'Component';
}

function buildToolDefinitions() {
  const definitions = [
    {
      name: 'list_files',
      policy: makeToolPolicy({
        permission: TOOL_PERMISSION_MODES.READ_ONLY,
        category: TOOL_CATEGORIES.FILE_READ
      }),
      description: 'List all files in the project. Returns file paths, extensions, and whether files are protected.',
      parameters: z.object({}),
      jsonSchema: { type: 'object', properties: {} },
      run: async ({ provider }) => {
        const result = await listFiles(provider);
        return { result, eventResult: result, modelResult: result };
      }
    },
    {
      name: 'read_file',
      policy: makeToolPolicy({
        permission: TOOL_PERMISSION_MODES.READ_ONLY,
        category: TOOL_CATEGORIES.FILE_READ
      }),
      description: 'Read file contents with Claw-style bounded windows. Large files are clipped for model safety; use start_line/end_line to inspect the next slice.',
      parameters: z.object({
        path: z.string().describe('Relative file path, for example "src/components/Hero.jsx"'),
        start_line: z.number().int().min(1).nullable().describe('First line to read, 1-indexed. Use null to read from the beginning.'),
        end_line: z.number().int().min(1).nullable().describe('Last line to read, 1-indexed and inclusive. Use null to read to the end.')
      }),
      jsonSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path' },
          start_line: { type: 'integer', description: 'Start line, 1-indexed' },
          end_line: { type: 'integer', description: 'End line, 1-indexed and inclusive' }
        },
        required: ['path', 'start_line', 'end_line']
      },
      eventArgs: ({ path, start_line, end_line }) => ({ path, start_line, end_line }),
      run: async ({ provider, args }) => {
        const result = await readFile(provider, args.path, {
          startLine: args.start_line,
          endLine: args.end_line
        });
        const modelResult = applySourceSafetyToReadResult(result, args);
        return {
          result,
          modelResult,
          eventResult: {
            filePath: result.filePath,
            totalLines: result.totalLines,
            sizeBytes: result.sizeBytes,
            returnedLines: modelResult.lineCount,
            truncated: Boolean(modelResult.sourceSafety?.truncated)
          }
        };
      }
    },
    {
      name: 'create_file',
      policy: makeToolPolicy({
        permission: TOOL_PERMISSION_MODES.WORKSPACE_WRITE,
        category: TOOL_CATEGORIES.FILE_WRITE,
        mutating: true,
        sideEffect: true
      }),
      description: 'Create a new file. Fails if the file already exists.',
      parameters: z.object({
        path: z.string().describe('Relative path for the new file.'),
        content: z.string().describe('Full file content.')
      }),
      jsonSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path' },
          content: { type: 'string', description: 'File content' }
        },
        required: ['path', 'content']
      },
      eventArgs: ({ path, content = '' }) => ({ path, contentLength: content.length }),
      run: async ({ provider, args }) => {
        const result = await createFile(provider, args.path, args.content);
        return {
          result,
          modelResult: { success: true, filePath: result.filePath, lineCount: result.lineCount },
          eventResult: {
            filePath: result.filePath,
            lineCount: result.lineCount,
            sizeBytes: result.sizeBytes,
            diff: {
              linesAdded: result.lineCount,
              linesRemoved: 0
            }
          },
          mutation: { path: args.path }
        };
      }
    },
    {
      name: 'edit_file',
      policy: makeToolPolicy({
        permission: TOOL_PERMISSION_MODES.WORKSPACE_WRITE,
        category: TOOL_CATEGORIES.FILE_WRITE,
        mutating: true,
        sideEffect: true
      }),
      description: 'Edit a file by string replacement. Exact matches are preferred; small whitespace differences are tolerated automatically. If old_string matches multiple places the edit is REJECTED — include more surrounding context to make it unique, or set replace_all: true.',
      parameters: z.object({
        path: z.string().describe('Relative file path to edit.'),
        old_string: z.string().describe('Exact text currently in the file.'),
        new_string: z.string().describe('Replacement text.'),
        replace_all: z.boolean().describe('Replace all occurrences.')
      }),
      jsonSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path' },
          old_string: { type: 'string', description: 'Exact text to find' },
          new_string: { type: 'string', description: 'Replacement text' },
          replace_all: { type: 'boolean', description: 'Replace all occurrences' }
        },
        required: ['path', 'old_string', 'new_string', 'replace_all']
      },
      eventArgs: ({ path, old_string = '', new_string = '', replace_all }) => ({
        path,
        old_string: truncate(old_string, 300),
        new_string: truncate(new_string, 300),
        replace_all
      }),
      run: async ({ provider, args }) => {
        const result = await editFile(provider, args.path, args.old_string, args.new_string, args.replace_all);
        return {
          result,
          modelResult: {
            success: true,
            filePath: result.filePath,
            occurrencesReplaced: result.occurrencesReplaced
          },
          eventResult: {
            filePath: result.filePath,
            occurrencesReplaced: result.occurrencesReplaced,
            diff: result.diff
          },
          mutation: { path: args.path }
        };
      }
    },
    {
      name: 'replace_file',
      policy: makeToolPolicy({
        permission: TOOL_PERMISSION_MODES.WORKSPACE_WRITE,
        category: TOOL_CATEGORIES.FILE_WRITE,
        mutating: true,
        sideEffect: true
      }),
      description: 'Replace the entire content of a file. Use for major rewrites.',
      parameters: z.object({
        path: z.string().describe('Relative file path.'),
        content: z.string().describe('Complete new file content.')
      }),
      jsonSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path' },
          content: { type: 'string', description: 'New file content' }
        },
        required: ['path', 'content']
      },
      eventArgs: ({ path, content = '' }) => ({ path, contentLength: content.length }),
      run: async ({ provider, args }) => {
        const result = await replaceFile(provider, args.path, args.content);
        const oldLineCount = result.type === 'create' ? 0 : (result.patch?.oldLineCount || 0);
        const newLineCount = result.patch?.newLineCount || result.lineCount;
        return {
          result,
          modelResult: {
            success: true,
            filePath: result.filePath,
            type: result.type,
            lineCount: result.lineCount
          },
          eventResult: {
            filePath: result.filePath,
            type: result.type,
            lineCount: result.lineCount,
            oldLineCount,
            newLineCount,
            diff: {
              linesAdded: newLineCount,
              linesRemoved: oldLineCount
            }
          },
          mutation: { path: args.path }
        };
      }
    },
    {
      name: 'search_files',
      policy: makeToolPolicy({
        permission: TOOL_PERMISSION_MODES.READ_ONLY,
        category: TOOL_CATEGORIES.FILE_READ
      }),
      description: 'Search across project files for a text pattern.',
      parameters: z.object({
        pattern: z.string().describe('Regex pattern to search for.'),
        glob: z.string().nullable().describe('File filter, for example "*.jsx". Use null to search all files.'),
        case_sensitive: z.boolean().describe('Whether the search is case sensitive.')
      }),
      jsonSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern' },
          glob: { type: 'string', description: 'File filter, for example *.jsx' },
          case_sensitive: { type: 'boolean', description: 'Case-sensitive search' }
        },
        required: ['pattern', 'glob', 'case_sensitive']
      },
      eventArgs: ({ pattern, glob }) => ({ pattern, glob }),
      run: async ({ provider, args }) => {
        const result = await searchFiles(provider, args.pattern, {
          glob: args.glob,
          caseSensitive: args.case_sensitive
        });
        const modelResult = applySourceSafetyToSearchResult(result);
        return {
          result,
          modelResult,
          eventResult: {
            totalFiles: result.totalFiles,
            totalMatches: result.totalMatches,
            truncated: Boolean(modelResult.sourceSafety?.truncated)
          }
        };
      }
    },
    {
      name: 'get_build_errors',
      policy: makeToolPolicy({
        permission: TOOL_PERMISSION_MODES.READ_ONLY,
        category: TOOL_CATEGORIES.BUILD,
        sideEffect: true
      }),
      description: 'Check whether the project builds successfully. Use after completing edits.',
      parameters: z.object({}),
      jsonSchema: { type: 'object', properties: {} },
      run: async ({ sandboxId, verifyBuild }) => {
        if (!sandboxId) {
          const error = new Error('No sandbox ID available');
          error.code = 'NO_SANDBOX_ID';
          throw error;
        }
        // Capture a screenshot in the same pass so the visual-review judge can
        // reuse it instead of launching a second browser.
        const buildResult = await verifyBuild(sandboxId, { captureScreenshot: true });
        const result = {
          buildPassed: Boolean(buildResult.success),
          previewHealthy: buildResult.previewHealthy ?? null,
          runtimeHealthy: buildResult.runtimeHealthy ?? null,
          runtimeDiagnostics: buildResult.runtimeDiagnostics || null,
          stages: Array.isArray(buildResult.stages)
            ? buildResult.stages.map((stage) => ({
                name: stage.name,
                success: stage.success,
                required: stage.required,
                error: stage.error || null,
                details: stage.name === 'browser_runtime' ? stage.details || null : undefined
              }))
            : [],
          summary: buildResult.summary || null,
          errors: (buildResult.success && buildResult.previewHealthy !== false)
            ? null
            : buildResult.logs?.slice(0, 4000)
        };
        return {
          result,
          modelResult: result,
          eventResult: {
            buildPassed: result.buildPassed,
            previewHealthy: result.previewHealthy,
            stageCount: result.stages?.length || 0
          },
          buildCheck: {
            buildPassed: result.buildPassed,
            previewHealthy: result.previewHealthy,
            runtimeHealthy: result.runtimeHealthy,
            exitCode: buildResult.exitCode,
            summary: buildResult.summary || null,
            stages: buildResult.stages || [],
            screenshots: Array.isArray(buildResult.screenshots) ? buildResult.screenshots : []
          }
        };
      }
    }
  ];

  definitions.push(
      {
        name: 'plan_pages',
        policy: makeToolPolicy({
          permission: TOOL_PERMISSION_MODES.READ_ONLY,
          category: TOOL_CATEGORIES.PLANNING
        }),
        description: 'Plan the page architecture for a website BEFORE building it. Returns a page graph (routes, purposes, sections) and shared navigation plan. Use this when the user wants multiple pages (or the site clearly needs them), then implement with react-router-dom, src/pages/<Name>.jsx files, and a shared nav. For simple single-page sites you can skip this tool.',
        parameters: z.object({
          site_description: z.string().describe('What the website is for: industry, audience, goals, and any pages the user explicitly asked for.'),
          page_count_hint: z.number().nullable().describe('Approximate number of pages the user wants, or null to let the planner decide.')
        }),
        jsonSchema: {
          type: 'object',
          properties: {
            site_description: { type: 'string', description: 'What the website is for' },
            page_count_hint: { type: 'number', description: 'Approximate number of pages, optional' }
          },
          required: ['site_description']
        },
        eventArgs: ({ site_description, page_count_hint }) => ({ site_description: String(site_description || '').slice(0, 200), page_count_hint }),
        run: async ({ args }) => {
          const plan = await generatePagePlan({
            siteDescription: args.site_description,
            pageCountHint: args.page_count_hint || null
          });
          return {
            result: plan,
            modelResult: plan,
            eventResult: {
              buildMode: plan.buildMode,
              pages: plan.pages.map((page) => ({ route: page.route, name: page.name }))
            }
          };
        }
      },
      {
        name: 'browse_components',
        policy: makeToolPolicy({
          permission: TOOL_PERMISSION_MODES.READ_ONLY,
          category: TOOL_CATEGORIES.CATALOG,
          requiresFeature: 'catalog'
        }),
        description: 'Browse the community component library. Returns rich design metadata (visual description, mood, colors, suitability, quality) per component, and attaches preview screenshots of the top matches so you can judge them visually.',
        parameters: z.object({
          keywords: z.string().nullable().describe('Optional keywords to filter components. Use null if no keywords.')
        }),
        jsonSchema: {
          type: 'object',
          properties: {
            keywords: { type: 'string', description: 'Optional keywords to filter components' }
          },
          required: ['keywords']
        },
        eventArgs: ({ keywords }) => ({ keywords }),
        run: async ({ args, getCatalog }) => {
          const catalog = await getCatalog(args.keywords || '', BROWSE_MAX_RESULTS);
          const components = catalog.components || [];
          const summary = components.map((component) => ({
            id: component.id,
            name: component.name,
            category: component.category,
            description: component.description?.slice(0, 200) || '',
            visualDescription: component.visualDescription?.slice(0, 240) || '',
            moodTone: component.moodTone || null,
            tags: Array.isArray(component.tags) ? component.tags.slice(0, 6) : [],
            suitableFor: Array.isArray(component.suitableFor) ? component.suitableFor.slice(0, 4) : [],
            notSuitableFor: Array.isArray(component.notSuitableFor) ? component.notSuitableFor.slice(0, 3) : [],
            colorProfile: component.colorProfile || null,
            authorType: component.authorType || 'official',
            qualityScore: component.qualityScore ?? null,
            usageCount: component.usageCount ?? 0,
            hasPreviewImage: Boolean(component.thumbnailUrl),
            fitScore: component.fitScore,
            fitReasons: component.fitReasons,
            matchedRoles: component.matchedRoles
          }));

          // Fetch preview thumbnails for the top matches so the (multimodal)
          // model can choose by looking at the actual component, not just text.
          const previewImages = await fetchComponentPreviewImages(
            components.filter((component) => component.thumbnailUrl).slice(0, BROWSE_PREVIEW_IMAGE_COUNT)
          );

          const modelResult = {
            components: summary,
            total: summary.length,
            previewNote: previewImages.length > 0
              ? `Preview screenshots for the top ${previewImages.length} matches are attached as images on the next message, in this order: ${previewImages.map((image) => image.componentId).join(', ')}.`
              : 'No preview screenshots available for these matches; rely on visualDescription and metadata.'
          };

          return {
            result: modelResult,
            modelResult,
            eventResult: { count: summary.length, previews: previewImages.length },
            visualAttachment: previewImages.length > 0
              ? {
                text: [
                  `[Component previews] Screenshots of the top ${previewImages.length} catalog matches from your browse_components call, in order:`,
                  ...previewImages.map((image, index) => `${index + 1}. ${image.componentId} — ${image.name}`),
                  'Judge them visually: pick components whose actual look fits the user\'s brief and visual direction, not just the keyword match.'
                ].join('\n'),
                images: previewImages.map((image) => ({
                  base64: image.base64,
                  mimeType: image.mimeType,
                  label: image.componentId
                }))
              }
              : null
          };
        }
      },
      {
        name: 'fetch_component_bundle',
        policy: makeToolPolicy({
          permission: TOOL_PERMISSION_MODES.READ_ONLY,
          category: TOOL_CATEGORIES.CATALOG,
          requiresFeature: 'catalog'
        }),
        description: 'Fetch source code for a community component by ID. Large shader/WebGL files may be summarized instead of returned; use install_component_bundle to write large bundles directly without context overload.',
        parameters: z.object({
          component_id: z.string().describe('Component ID from browse_components.')
        }),
        jsonSchema: {
          type: 'object',
          properties: {
            component_id: { type: 'string', description: 'Component ID from browse_components' }
          },
          required: ['component_id']
        },
        eventArgs: ({ component_id }) => ({ component_id }),
        run: async ({ args, getBundle }) => {
          const bundle = await getBundle(args.component_id);
          if (!bundle) {
            const error = new Error(`Component not found: ${args.component_id}`);
            error.code = 'COMPONENT_NOT_FOUND';
            throw error;
          }
          const files = bundleToFiles(bundle);
          const modelResult = applySourceSafetyToBundleFiles(files, args.component_id);
          return {
            result: { files, componentId: args.component_id },
            modelResult,
            eventResult: {
              fileCount: files.length,
              paths: files.map((file) => file.path),
              omittedFileCount: modelResult.sourceSafety?.omittedFileCount || 0,
              totalChars: modelResult.sourceSafety?.totalChars || 0
            }
          };
        }
      },
      {
        name: 'install_component_bundle',
        policy: makeToolPolicy({
          permission: TOOL_PERMISSION_MODES.WORKSPACE_WRITE,
          category: TOOL_CATEGORIES.CATALOG,
          mutating: true,
          sideEffect: true,
          requiresFeature: 'catalog'
        }),
        description: 'Install a community component bundle directly into the sandbox without returning full source code to the model. Prefer this for large shader/WebGL components or pre-selected bundles you want to use as-is.',
        parameters: z.object({
          component_id: z.string().describe('Component ID from browse_components.'),
          reason: z.string().nullable().describe('Short reason this component should be installed.')
        }),
        jsonSchema: {
          type: 'object',
          properties: {
            component_id: { type: 'string', description: 'Component ID from browse_components' },
            reason: { type: 'string', description: 'Reason for installing this component' }
          },
          required: ['component_id', 'reason']
        },
        eventArgs: ({ component_id, reason }) => ({ component_id, reason }),
        run: async ({ args, provider, projectId, sessionId, getBundle }) => {
          const bundle = await getBundle(args.component_id);
          if (!bundle) {
            const error = new Error(`Component not found: ${args.component_id}`);
            error.code = 'COMPONENT_NOT_FOUND';
            throw error;
          }

          const files = bundleToFiles(bundle);
          const skippedFiles = files
            .filter((file) => isProtectedFile(file.path))
            .map((file) => ({ path: file.path, reason: 'protected_file' }));
          const writableFiles = files.filter((file) => !isProtectedFile(file.path));

          if (writableFiles.length === 0) {
            const error = new Error(`Component "${args.component_id}" has no writable files.`);
            error.code = 'NO_WRITABLE_COMPONENT_FILES';
            throw error;
          }

          const installedFiles = [];
          for (const file of writableFiles) {
            const result = await replaceFile(provider, file.path, file.content);
            const oldLineCount = result.type === 'create' ? 0 : (result.patch?.oldLineCount || 0);
            const newLineCount = result.patch?.newLineCount || result.lineCount;
            installedFiles.push({
              path: result.filePath,
              type: result.type,
              lineCount: result.lineCount,
              sizeBytes: result.sizeBytes,
              exportHints: extractExportHints(file.content, result.filePath),
              oldLineCount,
              newLineCount,
              diff: {
                linesAdded: newLineCount,
                linesRemoved: oldLineCount
              }
            });
          }

          const diff = installedFiles.reduce((acc, file) => ({
            linesAdded: acc.linesAdded + (file.diff?.linesAdded || 0),
            linesRemoved: acc.linesRemoved + (file.diff?.linesRemoved || 0)
          }), { linesAdded: 0, linesRemoved: 0 });

          // Honor the bundle's declared npm dependencies: auto-install
          // allowlisted packages so community components don't silently break.
          const requiredPackages = extractRequiredPackages(bundle.requires)
            .filter((packageName) => !SANDBOX_BASE_PACKAGES.has(packageName));
          const installablePackages = requiredPackages.filter((packageName) => isAllowlistedPackage(packageName));
          const blockedPackages = requiredPackages.filter((packageName) => !isAllowlistedPackage(packageName));
          let installedPackages = [];
          let packageInstallError = null;
          if (installablePackages.length > 0 && typeof provider.installPackages === 'function') {
            try {
              const installResult = await provider.installPackages(installablePackages.slice(0, 5));
              if (installResult?.success) {
                installedPackages = installablePackages.slice(0, 5);
              } else {
                packageInstallError = String(installResult?.stderr || installResult?.stdout || 'install failed').slice(0, 400);
              }
            } catch (installErr) {
              packageInstallError = installErr.message;
            }
          }

          const result = {
            success: true,
            componentId: args.component_id,
            fileCount: installedFiles.length,
            installedFiles,
            skippedFiles,
            diff,
            ...(requiredPackages.length > 0 ? {
              dependencies: {
                required: requiredPackages,
                installed: installedPackages,
                blocked: blockedPackages,
                ...(packageInstallError ? { error: packageInstallError } : {})
              }
            } : {}),
            sourceSafety: {
              installedWithoutModelSource: true,
              guidance: 'The component files were written directly to the sandbox. Import the installed paths instead of asking for the full shader/source text.'
            }
          };

          // Flywheel: every agent install counts as a real usage so catalog
          // ranking, survival stats, and author rewards learn from agent builds.
          recordComponentInstall({
            componentRef: args.component_id,
            projectId,
            sessionId,
            installedPaths: installedFiles.map((file) => file.path)
          }).catch(() => {});

          return {
            result,
            modelResult: result,
            eventResult: result,
            mutations: installedFiles.map((file) => ({
              path: file.path,
              type: 'component_install'
            })),
            sideEffect: {
              type: 'component_install',
              summary: `Installed ${installedFiles.length} file(s) from ${args.component_id}`
            }
          };
        }
      },
      {
        name: 'delete_file',
        policy: makeToolPolicy({
          // Treated as a normal workspace-write authoring tool. The
          // confirmation token below is the only deliberate-act guard so the
          // model can't delete a file by accident on a borderline read.
          // Protected core files (package.json, vite.config.js, src/main.jsx,
          // src/App.jsx, index.html, etc.) are still rejected at the
          // sandbox-fs layer regardless of what the model passes.
          permission: TOOL_PERMISSION_MODES.WORKSPACE_WRITE,
          category: TOOL_CATEGORIES.FILE_DELETE,
          mutating: true,
          sideEffect: true,
          requiresConfirmation: true,
          confirmationToken: 'DELETE_FILE'
        }),
        description: [
          'Permanently remove a project file from the sandbox (rm -f).',
          'USE THIS — instead of replace_file with an empty/placeholder stub —',
          'whenever the user asks to delete, remove, or get rid of a file, OR',
          'when a generated component is no longer referenced anywhere.',
          'After deleting, also remove any `import` statements and JSX usages',
          'that referenced the file in other source files (use edit_file).',
          'Pass confirmation: "DELETE_FILE" exactly. Core build files',
          '(package.json, vite.config.js, src/main.jsx, src/App.jsx,',
          'index.html, etc.) are protected and cannot be deleted.'
        ].join(' '),
        parameters: z.object({
          path: z.string().describe('Relative path to the file to delete (e.g. "src/components/Footer.jsx").'),
          reason: z.string().nullable().describe('Short reason for deletion (e.g. "User asked to remove the footer").'),
          confirmation: z.string().describe('Must be the exact string DELETE_FILE.')
        }),
        jsonSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative file path' },
            reason: { type: 'string', description: 'Reason the file is being removed' },
            confirmation: { type: 'string', description: 'Must be the exact string DELETE_FILE' }
          },
          required: ['path', 'reason', 'confirmation']
        },
        eventArgs: ({ path, reason }) => ({ path, reason }),
        run: async ({ provider, args }) => {
          const result = await deleteFile(provider, args.path);
          return {
            result,
            modelResult: {
              success: true,
              filePath: result.filePath,
              type: result.type
            },
            eventResult: {
              filePath: result.filePath,
              type: result.type,
              lineCount: result.lineCount,
              diff: {
                linesAdded: 0,
                linesRemoved: result.lineCount || 0
              }
            },
            mutation: { path: args.path, type: 'delete' }
          };
        }
      },
      {
        name: 'install_packages',
        policy: makeToolPolicy({
          permission: TOOL_PERMISSION_MODES.PACKAGE_INSTALL,
          category: TOOL_CATEGORIES.PACKAGE,
          sideEffect: true,
          requiresFeature: 'package',
          requiresConfirmation: true,
          confirmationToken: 'INSTALL_PACKAGES'
        }),
        description: 'Install npm packages in the sandbox. Use only when the user explicitly asks for a dependency that is not already available.',
        parameters: z.object({
          packages: z.array(z.string()).min(1).max(5).describe('npm packages to install.'),
          reason: z.string().nullable().describe('Why these packages are needed.'),
          confirmation: z.string().describe('Must be exactly INSTALL_PACKAGES.')
        }),
        jsonSchema: {
          type: 'object',
          properties: {
            packages: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 5,
              description: 'npm packages to install'
            },
            reason: { type: 'string', description: 'Why these packages are needed' },
            confirmation: { type: 'string', description: 'Must be exactly INSTALL_PACKAGES' }
          },
          required: ['packages', 'reason', 'confirmation']
        },
        eventArgs: ({ packages = [], reason }) => ({ packages, reason }),
        run: async ({ provider, args }) => {
          const packages = validatePackageNames(args.packages || []);
          const blocked = packages.filter((packageName) => !isAllowlistedPackage(packageName));
          if (blocked.length > 0) {
            const error = new Error(
              `Package(s) not on the allowlist: ${blocked.join(', ')}. Only curated design/animation/data libraries can be installed. Use the preinstalled libraries or an allowlisted alternative.`
            );
            error.code = 'PACKAGE_NOT_ALLOWLISTED';
            throw error;
          }
          if (!provider || typeof provider.installPackages !== 'function') {
            const error = new Error('Current sandbox provider does not support package installation');
            error.code = 'PACKAGE_INSTALL_UNSUPPORTED';
            throw error;
          }

          const result = await provider.installPackages(packages);
          const success = Boolean(result?.success);
          const output = String(result?.stdout || result?.stderr || '').slice(0, 2000);

          return {
            result: { success, packages, output },
            modelResult: { success, packages, output },
            eventResult: { success, packageCount: packages.length, packages },
            sideEffect: {
              type: 'package_install',
              summary: success ? `Installed ${packages.join(', ')}` : `Package install failed: ${packages.join(', ')}`
            }
          };
        }
      },
      {
        name: 'reset_sandbox_app',
        policy: makeToolPolicy({
          permission: TOOL_PERMISSION_MODES.SANDBOX_ADMIN,
          category: TOOL_CATEGORIES.SANDBOX,
          sideEffect: true,
          requiresFeature: 'sandbox-admin',
          requiresConfirmation: true,
          confirmationToken: 'RESET_SANDBOX_APP'
        }),
        description: 'Reset the sandbox to the starter Vite app. This destroys the current generated website in the sandbox and should only be used from an explicit reset flow.',
        parameters: z.object({
          reason: z.string().nullable().describe('Why the sandbox should be reset.'),
          confirmation: z.string().describe('Must be exactly RESET_SANDBOX_APP.')
        }),
        jsonSchema: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Why the sandbox should be reset' },
            confirmation: { type: 'string', description: 'Must be exactly RESET_SANDBOX_APP' }
          },
          required: ['reason', 'confirmation']
        },
        eventArgs: ({ reason }) => ({ reason }),
        run: async ({ provider, args }) => {
          if (!provider || typeof provider.setupViteApp !== 'function') {
            const error = new Error('Current sandbox provider does not support app reset');
            error.code = 'SANDBOX_RESET_UNSUPPORTED';
            throw error;
          }

          await provider.setupViteApp();
          return {
            result: { success: true, reason: args.reason || null },
            modelResult: { success: true, message: 'Sandbox app reset to starter Vite project.' },
            eventResult: { success: true },
            sideEffect: {
              type: 'sandbox_reset',
              summary: 'Reset sandbox app to starter Vite project'
            }
          };
        }
      }
  );

  return definitions;
}

export function validatePackageNames(packages = []) {
  if (!Array.isArray(packages) || packages.length === 0) {
    const error = new Error('At least one package is required');
    error.code = 'INVALID_PACKAGES';
    throw error;
  }

  const normalized = [];
  for (const raw of packages) {
    const packageName = String(raw || '').trim();
    if (!isSafePackageName(packageName)) {
      const error = new Error(`Unsafe or unsupported package name: ${packageName || '(empty)'}`);
      error.code = 'UNSAFE_PACKAGE_NAME';
      throw error;
    }
    if (!normalized.includes(packageName)) normalized.push(packageName);
  }

  return normalized;
}

function isSafePackageName(packageName) {
  if (!packageName || packageName.length > 120) return false;
  if (/[\s;&|`$<>(){}\[\]\\]/.test(packageName)) return false;
  if (/^(?:https?:|git\+|file:|link:|workspace:|\/|\.{1,2}\/)/i.test(packageName)) return false;
  if (packageName.startsWith('-') || packageName.includes('..')) return false;

  const scoped = /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*(?:@[a-z0-9._~^*+-][a-z0-9._~^*+-]*)?$/i;
  const unscoped = /^[a-z0-9][a-z0-9._-]*(?:@[a-z0-9._~^*+-][a-z0-9._~^*+-]*)?$/i;
  return scoped.test(packageName) || unscoped.test(packageName);
}

function emitToolEvent(onEvent, eventType, payload) {
  try {
    onEvent(eventType, payload);
  } catch (error) {
    console.warn('[agent-tool-runtime] event skipped:', error?.message || error);
  }
}

function truncate(text = '', maxLength = 300) {
  const clean = String(text || '');
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 3))}...`;
}
