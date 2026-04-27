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

import { generateText, tool } from 'ai';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { getModel } from '../lib/provider-helpers.js';
import {
  listFiles, readFile, createFile, editFile, replaceFile,
  searchFiles, createSnapshot, restoreSnapshot,
  SandboxFsError
} from './sandbox-fs.js';
import { verifySandboxBuild } from '../lib/verify-sandbox-build.js';
import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';
import { getCatalogForPromptAsync, getBundleAsync, bundleToFileBlocks } from '../lib/registry/registry.js';

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

// ─── System Prompt ───────────────────────────────────────────

const AGENT_SYSTEM_PROMPT = `You are an expert frontend developer working inside a live React + Tailwind project sandbox powered by Vite.

## Workflow — ALWAYS follow this order:
1. **Understand**: Read the relevant file(s) to fully understand the current code before changing anything.
2. **Plan**: Decide exactly what changes to make. You get a limited number of steps, so plan carefully.
3. **Execute**: Make all your edits. Batch related changes together — don't make one tiny change per step.
4. **Verify**: Call get_build_errors once after all edits are done.
5. **Respond**: Explain what you changed and why.

## Critical Rules
- **Never experiment or trial-and-error.** Do not make a change just to test a theory, then revert it. Understand the code first, then make the correct fix once.
- **Never revert your own changes.** If you realize a previous edit was wrong, fix it forward — don't undo and retry.
- Read a file ONCE at the start. Do not re-read the same file between every edit.
- Use edit_file for targeted changes with exact string matching. Use replace_file only for major rewrites.
- After ALL edits are done, call get_build_errors exactly once. Do not build-check after every single edit.
- If a build fails, read the error carefully and fix it in one targeted edit.
- You have a maximum of ~20 tool calls. Use them wisely.

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
function buildTools(provider, sandboxId, onEvent, { enableCatalogTools = false } = {}) {
  const mutations = []; // Track all file mutations

  const tools = {
    list_files: tool({
      description: 'List all files in the project. Returns file paths, extensions, and whether they are protected system files. Use this to understand the project structure before making changes.',
      parameters: z.object({}),
      execute: async () => {
        console.log('[agent] 🔧 list_files');
        onEvent('tool_start', { toolName: 'list_files', args: {} });
        try {
          const result = await listFiles(provider);
          console.log(`[agent]   ✓ list_files → ${result.totalFiles} files`);
          onEvent('tool_result', { toolName: 'list_files', result, success: true });
          return result;
        } catch (e) {
          const err = { error: e.message, code: e.code };
          onEvent('tool_result', { toolName: 'list_files', result: err, success: false });
          return err;
        }
      }
    }),

    read_file: tool({
      description: 'Read the contents of a file. Returns the full content or a specific line range. Use this to understand existing code before editing.',
      parameters: z.object({
        path: z.string().describe('Relative path to the file (e.g. "src/components/Hero.jsx")'),
        start_line: z.number().int().min(1).optional().describe('First line to read (1-indexed). Omit to read entire file.'),
        end_line: z.number().int().min(1).optional().describe('Last line to read (1-indexed, inclusive). Omit to read to end.')
      }),
      execute: async ({ path, start_line, end_line }) => {
        console.log(`[agent] 🔧 read_file → ${path}${start_line ? ` (L${start_line}-${end_line || 'end'})` : ''}`);
        onEvent('tool_start', { toolName: 'read_file', args: { path, start_line, end_line } });
        try {
          const result = await readFile(provider, path, { startLine: start_line, endLine: end_line });
          console.log(`[agent]   ✓ read_file → ${result.totalLines} lines, ${result.sizeBytes}B`);
          onEvent('tool_result', {
            toolName: 'read_file',
            result: { filePath: result.filePath, totalLines: result.totalLines, sizeBytes: result.sizeBytes },
            success: true
          });
          return result;
        } catch (e) {
          const err = { error: e.message, code: e.code };
          onEvent('tool_result', { toolName: 'read_file', result: err, success: false });
          return err;
        }
      }
    }),

    create_file: tool({
      description: 'Create a new file. Fails if the file already exists — use edit_file or replace_file to modify existing files. Directories are created automatically.',
      parameters: z.object({
        path: z.string().describe('Relative path for the new file (e.g. "src/components/Footer.jsx")'),
        content: z.string().describe('Full content of the file to create')
      }),
      execute: async ({ path, content }) => {
        console.log(`[agent] 🔧 create_file → ${path} (${content.length} chars)`);
        onEvent('tool_start', {
          toolName: 'create_file',
          args: { path, contentLength: content.length }
        });
        try {
          const result = await createFile(provider, path, content);
          mutations.push({ tool: 'create_file', path, timestamp: Date.now() });
          console.log(`[agent]   ✓ create_file → ${result.filePath} (${result.lineCount} lines)`);
          onEvent('tool_result', {
            toolName: 'create_file',
            result: { filePath: result.filePath, lineCount: result.lineCount, sizeBytes: result.sizeBytes },
            success: true
          });
          return { success: true, filePath: result.filePath, lineCount: result.lineCount };
        } catch (e) {
          const err = { error: e.message, code: e.code };
          onEvent('tool_result', { toolName: 'create_file', result: err, success: false });
          return err;
        }
      }
    }),

    edit_file: tool({
      description: 'Edit an existing file by replacing an exact string match. This is the primary tool for making targeted changes — specify the exact text to find (old_string) and its replacement (new_string). IMPORTANT: old_string must exactly match text in the file, including whitespace and indentation.',
      parameters: z.object({
        path: z.string().describe('Relative path to the file to edit'),
        old_string: z.string().describe('The exact text currently in the file that should be replaced. Must match character-for-character including whitespace.'),
        new_string: z.string().describe('The replacement text to insert where old_string was found.'),
        replace_all: z.boolean().optional().default(false).describe('If true, replace ALL occurrences of old_string. Default: false.')
      }),
      execute: async ({ path, old_string, new_string, replace_all }) => {
        console.log(`[agent] 🔧 edit_file → ${path} (old: ${old_string.length} chars → new: ${new_string.length} chars)`);
        onEvent('tool_start', {
          toolName: 'edit_file',
          args: {
            path,
            old_string: old_string.length > 300 ? old_string.slice(0, 300) + '...' : old_string,
            new_string: new_string.length > 300 ? new_string.slice(0, 300) + '...' : new_string,
            replace_all
          }
        });
        try {
          const result = await editFile(provider, path, old_string, new_string, replace_all);
          mutations.push({ tool: 'edit_file', path, timestamp: Date.now() });
          console.log(`[agent]   ✓ edit_file → ${result.filePath} (${result.occurrencesReplaced} replaced)`);
          onEvent('tool_result', {
            toolName: 'edit_file',
            result: {
              filePath: result.filePath,
              occurrencesReplaced: result.occurrencesReplaced,
              diff: result.diff
            },
            success: true
          });
          return {
            success: true,
            filePath: result.filePath,
            occurrencesReplaced: result.occurrencesReplaced
          };
        } catch (e) {
          const err = { error: e.message, code: e.code };
          onEvent('tool_result', { toolName: 'edit_file', result: err, success: false });
          return err;
        }
      }
    }),

    replace_file: tool({
      description: 'Replace the entire content of a file. Use this for major rewrites where edit_file would be impractical. Also works to create new files.',
      parameters: z.object({
        path: z.string().describe('Relative path to the file to replace'),
        content: z.string().describe('The complete new content for the file')
      }),
      execute: async ({ path, content }) => {
        console.log(`[agent] 🔧 replace_file → ${path} (${content.length} chars)`);
        onEvent('tool_start', {
          toolName: 'replace_file',
          args: { path, contentLength: content.length }
        });
        try {
          const result = await replaceFile(provider, path, content);
          mutations.push({ tool: 'replace_file', path, timestamp: Date.now() });
          console.log(`[agent]   ✓ replace_file → ${result.filePath} (${result.lineCount} lines)`);
          onEvent('tool_result', {
            toolName: 'replace_file',
            result: { filePath: result.filePath, type: result.type, lineCount: result.lineCount },
            success: true
          });
          return { success: true, filePath: result.filePath, type: result.type, lineCount: result.lineCount };
        } catch (e) {
          const err = { error: e.message, code: e.code };
          onEvent('tool_result', { toolName: 'replace_file', result: err, success: false });
          return err;
        }
      }
    }),

    search_files: tool({
      description: 'Search across all project files for a text pattern (regex supported). Returns matching files with line numbers and context.',
      parameters: z.object({
        pattern: z.string().describe('Regex pattern to search for across project files'),
        glob: z.string().optional().describe('File extension filter (e.g. "*.jsx", "*.css")'),
        case_sensitive: z.boolean().optional().default(true).describe('Whether the search is case-sensitive.')
      }),
      execute: async ({ pattern, glob, case_sensitive }) => {
        console.log(`[agent] 🔧 search_files → "${pattern}"${glob ? ` (${glob})` : ''}`);
        onEvent('tool_start', { toolName: 'search_files', args: { pattern, glob } });
        try {
          const result = await searchFiles(provider, pattern, { glob, caseSensitive: case_sensitive });
          console.log(`[agent]   ✓ search_files → ${result.totalMatches} matches in ${result.totalFiles} files`);
          onEvent('tool_result', {
            toolName: 'search_files',
            result: { totalFiles: result.totalFiles, totalMatches: result.totalMatches },
            success: true
          });
          return result;
        } catch (e) {
          const err = { error: e.message, code: e.code };
          onEvent('tool_result', { toolName: 'search_files', result: err, success: false });
          return err;
        }
      }
    }),

    get_build_errors: tool({
      description: 'Check if the project builds successfully. Returns build pass/fail status and any error messages. Use this after making changes to verify they compile correctly.',
      parameters: z.object({}),
      execute: async () => {
        console.log('[agent] 🔧 get_build_errors → running vite build...');
        onEvent('tool_start', { toolName: 'get_build_errors', args: {} });
        try {
          if (!sandboxId) {
            const err = { buildPassed: false, error: 'No sandbox ID available' };
            onEvent('tool_result', { toolName: 'get_build_errors', result: err, success: false });
            return err;
          }
          const buildResult = await verifySandboxBuild(sandboxId);
          const result = {
            buildPassed: buildResult.success,
            errors: buildResult.success ? null : buildResult.logs?.slice(0, 2000)
          };
          console.log(`[agent]   ${result.buildPassed ? '✓' : '✗'} build ${result.buildPassed ? 'PASSED' : 'FAILED'}`);
          onEvent('tool_result', {
            toolName: 'get_build_errors',
            result: { buildPassed: result.buildPassed },
            success: true
          });
          return result;
        } catch (e) {
          const err = { error: e.message };
          onEvent('tool_result', { toolName: 'get_build_errors', result: err, success: false });
          return err;
        }
      }
    }),
  };

  // ─── Catalog tools (only for initial builds) ──────────────
  if (enableCatalogTools) {
    tools.browse_components = tool({
      description: 'Browse the community component library. Returns available premium components with IDs, names, categories, and descriptions. Use this to find existing high-quality components to use in the build instead of writing everything from scratch.',
      parameters: z.object({
        keywords: z.string().optional().describe('Optional comma-separated keywords to filter components (e.g. "hero, pricing, testimonial")')
      }),
      execute: async ({ keywords }) => {
        console.log(`[agent] 🔧 browse_components → "${keywords || 'all'}"`);
        onEvent('tool_start', { toolName: 'browse_components', args: { keywords } });
        try {
          const catalog = await getCatalogForPromptAsync(keywords || '', 50);
          const summary = (catalog.components || []).map(c => ({
            id: c.id,
            name: c.name,
            category: c.category,
            description: c.description?.slice(0, 120) || ''
          }));
          console.log(`[agent]   ✓ browse_components → ${summary.length} components`);
          onEvent('tool_result', { toolName: 'browse_components', result: { count: summary.length }, success: true });
          return { components: summary, total: summary.length };
        } catch (e) {
          const err = { error: e.message };
          onEvent('tool_result', { toolName: 'browse_components', result: err, success: false });
          return err;
        }
      }
    });

    tools.fetch_component_bundle = tool({
      description: 'Fetch the full source code of a community component by its ID. Returns an array of files (path + content) that you should write to the sandbox using create_file or replace_file. The component files go in src/components/premium/.',
      parameters: z.object({
        component_id: z.string().describe('The component ID from browse_components (e.g. "hero.video.aurora.v1")')
      }),
      execute: async ({ component_id }) => {
        console.log(`[agent] 🔧 fetch_component_bundle → ${component_id}`);
        onEvent('tool_start', { toolName: 'fetch_component_bundle', args: { component_id } });
        try {
          const bundle = await getBundleAsync(component_id);
          if (!bundle) {
            const err = { error: `Component not found: ${component_id}` };
            onEvent('tool_result', { toolName: 'fetch_component_bundle', result: err, success: false });
            return err;
          }
          const fileBlocks = bundleToFileBlocks(bundle);
          // Parse <file path="...">...</file> blocks into { path, content } array
          const fileRegex = /<file path="([^"]+)">(\n?)([\s\S]*?)<\/file>/g;
          const files = [];
          let match;
          while ((match = fileRegex.exec(fileBlocks)) !== null) {
            files.push({ path: match[1], content: match[3].trim() });
          }
          console.log(`[agent]   ✓ fetch_component_bundle → ${files.length} file(s)`);
          onEvent('tool_result', { toolName: 'fetch_component_bundle', result: { fileCount: files.length, paths: files.map(f => f.path) }, success: true });
          return { files, componentId: component_id };
        } catch (e) {
          const err = { error: e.message };
          onEvent('tool_result', { toolName: 'fetch_component_bundle', result: err, success: false });
          return err;
        }
      }
    });
  }

  return { tools, getMutations: () => mutations };
}

// ─── Native Gemini Tool Executors (for @google/genai) ────────

/**
 * Build tool executors and Google-format function declarations for native SDK.
 * Returns { declarations, executors } where executors is a map of name → async function.
 */
function buildNativeToolExecutors(provider, sandboxId, onEvent, { enableCatalogTools = false } = {}) {
  const mutations = []; // Track file mutations in native path

  const executors = {
    list_files: async () => {
      console.log('[agent] 🔧 list_files');
      onEvent('tool_start', { toolName: 'list_files', args: {} });
      try {
        const result = await listFiles(provider);
        console.log(`[agent]   ✓ list_files → ${result.totalFiles} files`);
        onEvent('tool_result', { toolName: 'list_files', result, success: true });
        return result;
      } catch (e) {
        onEvent('tool_result', { toolName: 'list_files', result: { error: e.message }, success: false });
        return { error: e.message };
      }
    },

    read_file: async ({ path, start_line, end_line }) => {
      console.log(`[agent] 🔧 read_file → ${path}`);
      onEvent('tool_start', { toolName: 'read_file', args: { path } });
      try {
        const result = await readFile(provider, path, { startLine: start_line, endLine: end_line });
        console.log(`[agent]   ✓ read_file → ${result.totalLines} lines, ${result.sizeBytes}B`);
        onEvent('tool_result', { toolName: 'read_file', result: { totalLines: result.totalLines, sizeBytes: result.sizeBytes }, success: true });
        return result;
      } catch (e) {
        onEvent('tool_result', { toolName: 'read_file', result: { error: e.message }, success: false });
        return { error: e.message };
      }
    },

    create_file: async ({ path, content }) => {
      console.log(`[agent] 🔧 create_file → ${path} (${content.length} chars)`);
      onEvent('tool_start', { toolName: 'create_file', args: { path, contentLength: content.length } });
      try {
        const result = await createFile(provider, path, content);
        mutations.push({ tool: 'create_file', path, timestamp: Date.now() });
        console.log(`[agent]   ✓ create_file → ${result.filePath} (${result.lineCount} lines)`);
        onEvent('tool_result', { toolName: 'create_file', result: { filePath: result.filePath, lineCount: result.lineCount }, success: true });
        return { success: true, filePath: result.filePath, lineCount: result.lineCount };
      } catch (e) {
        onEvent('tool_result', { toolName: 'create_file', result: { error: e.message }, success: false });
        return { error: e.message };
      }
    },

    edit_file: async ({ path, old_string, new_string, replace_all }) => {
      console.log(`[agent] 🔧 edit_file → ${path} (old: ${old_string.length} chars → new: ${new_string.length} chars)`);
      onEvent('tool_start', { toolName: 'edit_file', args: { path, old_string: old_string.slice(0, 300), new_string: new_string.slice(0, 300) } });
      try {
        const result = await editFile(provider, path, old_string, new_string, replace_all);
        mutations.push({ tool: 'edit_file', path, timestamp: Date.now() });
        console.log(`[agent]   ✓ edit_file → ${result.filePath} (${result.occurrencesReplaced} replaced)`);
        onEvent('tool_result', { toolName: 'edit_file', result: { filePath: result.filePath, occurrencesReplaced: result.occurrencesReplaced, diff: result.diff }, success: true });
        return { success: true, filePath: result.filePath, occurrencesReplaced: result.occurrencesReplaced };
      } catch (e) {
        onEvent('tool_result', { toolName: 'edit_file', result: { error: e.message }, success: false });
        return { error: e.message };
      }
    },

    replace_file: async ({ path, content }) => {
      console.log(`[agent] 🔧 replace_file → ${path} (${content.length} chars)`);
      onEvent('tool_start', { toolName: 'replace_file', args: { path, contentLength: content.length } });
      try {
        const result = await replaceFile(provider, path, content);
        mutations.push({ tool: 'replace_file', path, timestamp: Date.now() });
        console.log(`[agent]   ✓ replace_file → ${result.filePath} (${result.lineCount} lines)`);
        onEvent('tool_result', { toolName: 'replace_file', result: { filePath: result.filePath, lineCount: result.lineCount }, success: true });
        return { success: true, filePath: result.filePath, lineCount: result.lineCount };
      } catch (e) {
        onEvent('tool_result', { toolName: 'replace_file', result: { error: e.message }, success: false });
        return { error: e.message };
      }
    },

    search_files: async ({ pattern, glob, case_sensitive }) => {
      console.log(`[agent] 🔧 search_files → "${pattern}"`);
      onEvent('tool_start', { toolName: 'search_files', args: { pattern, glob } });
      try {
        const result = await searchFiles(provider, pattern, { glob, caseSensitive: case_sensitive });
        console.log(`[agent]   ✓ search_files → ${result.totalMatches} matches in ${result.totalFiles} files`);
        onEvent('tool_result', { toolName: 'search_files', result: { totalFiles: result.totalFiles, totalMatches: result.totalMatches }, success: true });
        return result;
      } catch (e) {
        onEvent('tool_result', { toolName: 'search_files', result: { error: e.message }, success: false });
        return { error: e.message };
      }
    },

    get_build_errors: async () => {
      console.log('[agent] 🔧 get_build_errors → running vite build...');
      onEvent('tool_start', { toolName: 'get_build_errors', args: {} });
      try {
        const buildResult = await verifySandboxBuild(sandboxId);
        const result = { buildPassed: buildResult.success, errors: buildResult.success ? null : buildResult.logs?.slice(0, 2000) };
        console.log(`[agent]   ${result.buildPassed ? '✓' : '✗'} build ${result.buildPassed ? 'PASSED' : 'FAILED'}`);
        onEvent('tool_result', { toolName: 'get_build_errors', result: { buildPassed: result.buildPassed }, success: true });
        return result;
      } catch (e) {
        onEvent('tool_result', { toolName: 'get_build_errors', result: { error: e.message }, success: false });
        return { error: e.message };
      }
    }
  };

  // Google GenAI function declarations format
  const declarations = [
    { name: 'list_files', description: 'List all files in the project.', parameters: { type: 'object', properties: {} } },
    { name: 'read_file', description: 'Read file contents. Always read before editing.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Relative file path' }, start_line: { type: 'integer', description: 'Start line (1-indexed, optional)' }, end_line: { type: 'integer', description: 'End line (1-indexed, optional)' } }, required: ['path'] } },
    { name: 'create_file', description: 'Create a new file. Fails if exists.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Relative file path' }, content: { type: 'string', description: 'File content' } }, required: ['path', 'content'] } },
    { name: 'edit_file', description: 'Edit file by exact string replacement. old_string must match exactly.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Relative file path' }, old_string: { type: 'string', description: 'Exact text to find' }, new_string: { type: 'string', description: 'Replacement text' }, replace_all: { type: 'boolean', description: 'Replace all occurrences' } }, required: ['path', 'old_string', 'new_string'] } },
    { name: 'replace_file', description: 'Replace entire file content. Use for major rewrites.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Relative file path' }, content: { type: 'string', description: 'New file content' } }, required: ['path', 'content'] } },
    { name: 'search_files', description: 'Search project files with regex pattern.', parameters: { type: 'object', properties: { pattern: { type: 'string', description: 'Regex pattern' }, glob: { type: 'string', description: 'File filter e.g. *.jsx' }, case_sensitive: { type: 'boolean', description: 'Case sensitive search' } }, required: ['pattern'] } },
    { name: 'get_build_errors', description: 'Check if project builds successfully.', parameters: { type: 'object', properties: {} } }
  ];

  // ─── Catalog tools (only for initial builds) ──────────────
  if (enableCatalogTools) {
    executors.browse_components = async ({ keywords }) => {
      console.log(`[agent] \ud83d\udd27 browse_components \u2192 "${keywords || 'all'}"`);
      onEvent('tool_start', { toolName: 'browse_components', args: { keywords } });
      try {
        const catalog = await getCatalogForPromptAsync(keywords || '', 50);
        const summary = (catalog.components || []).map(c => ({
          id: c.id, name: c.name, category: c.category,
          description: c.description?.slice(0, 120) || ''
        }));
        console.log(`[agent]   \u2713 browse_components \u2192 ${summary.length} components`);
        onEvent('tool_result', { toolName: 'browse_components', result: { count: summary.length }, success: true });
        return { components: summary, total: summary.length };
      } catch (e) {
        onEvent('tool_result', { toolName: 'browse_components', result: { error: e.message }, success: false });
        return { error: e.message };
      }
    };

    executors.fetch_component_bundle = async ({ component_id }) => {
      console.log(`[agent] \ud83d\udd27 fetch_component_bundle \u2192 ${component_id}`);
      onEvent('tool_start', { toolName: 'fetch_component_bundle', args: { component_id } });
      try {
        const bundle = await getBundleAsync(component_id);
        if (!bundle) {
          const err = { error: `Component not found: ${component_id}` };
          onEvent('tool_result', { toolName: 'fetch_component_bundle', result: err, success: false });
          return err;
        }
        const fileBlocks = bundleToFileBlocks(bundle);
        const fileRegex = /<file path="([^"]+)">(\n?)([\s\S]*?)<\/file>/g;
        const files = [];
        let match;
        while ((match = fileRegex.exec(fileBlocks)) !== null) {
          files.push({ path: match[1], content: match[3].trim() });
        }

        // AI_STABILITY_FIX_V6: Actually write the files to the sandbox as promised in the tool description
        const writtenPaths = [];
        for (const file of files) {
          try {
            await createFile(provider, file.path, file.content);
            writtenPaths.push(file.path);
          } catch (createErr) {
            // If file exists, we might want to replace it, but let's stick to safe creation for now
            // or just log it. The agent will handle existing files.
            console.warn(`[agent] fetch_component_bundle: failed to write ${file.path}:`, createErr.message);
          }
        }

        console.log(`[agent]   \u2713 fetch_component_bundle \u2192 ${files.length} file(s) (${writtenPaths.length} written)`);
        onEvent('tool_result', { toolName: 'fetch_component_bundle', result: { fileCount: files.length, writtenCount: writtenPaths.length, paths: files.map(f => f.path) }, success: true });
        return { files, writtenPaths, componentId: component_id };
      } catch (e) {
        onEvent('tool_result', { toolName: 'fetch_component_bundle', result: { error: e.message }, success: false });
        return { error: e.message };
      }
    };

    declarations.push(
      { name: 'browse_components', description: 'Browse community component library. Returns component IDs, names, categories, descriptions.', parameters: { type: 'object', properties: { keywords: { type: 'string', description: 'Optional keywords to filter' } } } },
      { name: 'fetch_component_bundle', description: 'Fetch full source code of a community component by ID. Write returned files to sandbox.', parameters: { type: 'object', properties: { component_id: { type: 'string', description: 'Component ID from browse_components' } }, required: ['component_id'] } }
    );
  }

  return { executors, declarations, getMutations: () => mutations };
}

// ─── Native Gemini Loop ──────────────────────────────────────

/**
 * Run agent loop using @google/genai directly (for Gemini 3.x models).
 * Handles thought signatures transparently.
 */
async function runNativeGeminiLoop({ modelId, systemPrompt, messages, toolExecutors, maxSteps, onEvent }) {
  const { executors, declarations, getMutations: getNativeMutations } = toolExecutors;

  // Convert messages to Google GenAI format
  const googleMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
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
  let response = await chat.sendMessage(
    { message: lastMsg.parts[0].text }, 
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

    // Execute all function calls
    const functionResponses = [];
    for (const fc of functionCalls) {
      const executor = executors[fc.name];
      if (!executor) {
        console.warn(`[agent-native] Unknown tool: ${fc.name}`);
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
    toolCalls: allToolCalls
  };
}

// ─── Context Assembly ────────────────────────────────────────

/**
 * Build the initial context for the agent.
 */
function assembleMessages(userPrompt, conversationHistory = [], fileTree = null) {
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

  // Add file tree context if available
  let contextPrefix = '';
  if (fileTree) {
    const fileListStr = fileTree.files
      .map(f => `  ${f.protected ? '🔒 ' : ''}${f.path}`)
      .join('\n');
    contextPrefix = `[Current project files]\n${fileListStr}\n\n`;
  }

  // Add user's new message
  messages.push({
    role: 'user',
    content: contextPrefix + userPrompt
  });

  return messages;
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
    enableCatalogTools = false
  } = options;

  const effectiveMaxSteps = maxStepsOverride || MAX_STEPS;
  const effectiveSystemPrompt = systemPromptOverride || AGENT_SYSTEM_PROMPT;

  // Resolve sandbox provider
  const provider = sandboxId
    ? (sandboxManager.getProvider(sandboxId) || global.activeSandboxProvider)
    : (sandboxManager.getActiveProvider() || global.activeSandboxProvider);

  if (!provider) {
    throw new Error('No active sandbox. Create one first.');
  }

  const activeSandboxId = sandboxId || provider.getSandboxInfo()?.sandboxId;

  // Get file tree for context
  let fileTree = null;
  try {
    fileTree = await listFiles(provider);
  } catch (e) {
    console.warn('[agent-loop] Could not list files for context:', e.message);
  }

  console.log(`\n[agent] ═══════════════════════════════════════════`);
  console.log(`[agent] 🚀 Agent loop starting`);
  console.log(`[agent]    Prompt: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
  console.log(`[agent]    Model: ${modelId}`);
  console.log(`[agent]    Files in sandbox: ${fileTree?.totalFiles || 0}`);
  console.log(`[agent] ═══════════════════════════════════════════\n`);

  // Create pre-mutation snapshot of all src/ files
  let snapshot = null;
  try {
    if (fileTree) {
      const srcFiles = fileTree.files
        .filter(f => f.path.startsWith('src/'))
        .map(f => f.path);
      snapshot = await createSnapshot(provider, srcFiles);
    }
  } catch (e) {
    console.warn('[agent-loop] Could not create pre-mutation snapshot:', e.message);
  }

  // Build tool instances (used by Vercel SDK path; native path builds its own)
  let { tools, getMutations } = buildTools(provider, activeSandboxId, onEvent, { enableCatalogTools });

  // Assemble messages
  const messages = assembleMessages(prompt, conversationHistory, fileTree);

  onEvent('agent_start', {
    prompt,
    modelId,
    fileCount: fileTree?.totalFiles || 0
  });

  // ─── Call model with auto tool execution ─────────────────

  let result;
  const useNativeSDK = GEMINI_3X_MODELS.has(modelId);

  if (useNativeSDK) {
    // ─── NATIVE GOOGLE SDK PATH (Gemini 3.x) ─────────────────
    console.log(`[agent] Using native @google/genai SDK for ${modelId}`);
    try {
        const nativeToolExec = buildNativeToolExecutors(provider, sandboxId, onEvent, { enableCatalogTools });
      result = await runNativeGeminiLoop({
        modelId: modelId.replace('google/', ''),
        systemPrompt: effectiveSystemPrompt,
        messages,
        toolExecutors: nativeToolExec,
        maxSteps: effectiveMaxSteps,
        onEvent
      });
      // Use native mutations for the summary
      getMutations = nativeToolExec.getMutations;
    } catch (modelError) {
      console.error('[agent-loop] ✗ Native Gemini call failed:', modelError.message);
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
      onEvent('agent_error', { message: `Model error: ${modelError.message}` });
      throw modelError;
    }
  }

  const finalResponse = result.text || '';
  const allMutations = getMutations();

  onEvent('agent_text', { text: finalResponse });
  onEvent('agent_complete', {
    steps: result.steps || 1,
    mutationCount: allMutations.length,
    hasSnapshot: !!snapshot
  });

  console.log(`\n[agent] ═══════════════════════════════════════════`);
  console.log(`[agent] ✅ Agent loop complete`);
  console.log(`[agent]    Steps: ${result.steps || 1}`);
  console.log(`[agent]    Mutations: ${allMutations.length} file(s) changed`);
  console.log(`[agent]    Response: "${finalResponse.slice(0, 120)}${finalResponse.length > 120 ? '...' : ''}"`);
  console.log(`[agent] ═══════════════════════════════════════════\n`);

  return {
    response: finalResponse,
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
