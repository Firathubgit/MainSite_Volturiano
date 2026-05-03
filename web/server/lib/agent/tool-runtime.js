import { tool } from 'ai';
import { z } from 'zod';
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
import { getCatalogForPromptAsync, getBundleAsync, bundleToFileBlocks } from '../registry/registry.js';
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
  onEvent = () => {},
  enableCatalogTools = false,
  enablePackageTools = false,
  enableDestructiveTools = false,
  enableSandboxAdminTools = false,
  permissionMode = TOOL_PERMISSION_MODES.WORKSPACE_WRITE,
  verifyBuild = verifySandboxBuild,
  getCatalog = getCatalogForPromptAsync,
  getBundle = getBundleAsync,
  debugTimeline = null
} = {}) {
  const mutations = [];
  const buildChecks = [];
  const sideEffects = [];
  const policyOptions = normalizeToolPolicyOptions({
    permissionMode,
    enableCatalogTools,
    enablePackageTools,
    enableDestructiveTools,
    enableSandboxAdminTools
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
      description: 'Edit a file by exact string replacement. old_string must match exactly including whitespace.',
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
        const buildResult = await verifyBuild(sandboxId);
        const result = {
          buildPassed: Boolean(buildResult.success),
          previewHealthy: buildResult.previewHealthy ?? null,
          stages: Array.isArray(buildResult.stages)
            ? buildResult.stages.map((stage) => ({
                name: stage.name,
                success: stage.success,
                required: stage.required,
                error: stage.error || null
              }))
            : [],
          summary: buildResult.summary || null,
          errors: buildResult.success ? null : buildResult.logs?.slice(0, 2000)
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
            exitCode: buildResult.exitCode,
            summary: buildResult.summary || null,
            stages: buildResult.stages || []
          }
        };
      }
    }
  ];

  definitions.push(
      {
        name: 'browse_components',
        policy: makeToolPolicy({
          permission: TOOL_PERMISSION_MODES.READ_ONLY,
          category: TOOL_CATEGORIES.CATALOG,
          requiresFeature: 'catalog'
        }),
        description: 'Browse the community component library. Returns component IDs, names, categories, and descriptions.',
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
          const catalog = await getCatalog(args.keywords || '', 50);
          const summary = (catalog.components || []).map((component) => ({
            id: component.id,
            name: component.name,
            category: component.category,
            description: component.description?.slice(0, 120) || '',
            fitScore: component.fitScore,
            fitReasons: component.fitReasons,
            matchedRoles: component.matchedRoles
          }));
          return {
            result: { components: summary, total: summary.length },
            modelResult: { components: summary, total: summary.length },
            eventResult: { count: summary.length }
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
        run: async ({ args, provider, getBundle }) => {
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

          const result = {
            success: true,
            componentId: args.component_id,
            fileCount: installedFiles.length,
            installedFiles,
            skippedFiles,
            diff,
            sourceSafety: {
              installedWithoutModelSource: true,
              guidance: 'The component files were written directly to the sandbox. Import the installed paths instead of asking for the full shader/source text.'
            }
          };

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
          permission: TOOL_PERMISSION_MODES.DESTRUCTIVE,
          category: TOOL_CATEGORIES.FILE_DELETE,
          mutating: true,
          sideEffect: true,
          requiresFeature: 'destructive',
          requiresConfirmation: true,
          confirmationToken: 'DELETE_FILE'
        }),
        description: 'Delete an obsolete generated project file. Only use when the user explicitly asked to remove that file and you have confirmation.',
        parameters: z.object({
          path: z.string().describe('Relative path to the file to delete.'),
          reason: z.string().nullable().describe('Short reason the file is obsolete.'),
          confirmation: z.string().describe('Must be exactly DELETE_FILE.')
        }),
        jsonSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative file path' },
            reason: { type: 'string', description: 'Reason the file is obsolete' },
            confirmation: { type: 'string', description: 'Must be exactly DELETE_FILE' }
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
