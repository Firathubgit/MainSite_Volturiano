/**
 * Mini Polish — single fast-model pass after main polish (navigation, routes, UX sanity).
 * Uses the same lightweight routing as polish-filler: OpenAI mini, Anthropic Haiku, Google Flash-Lite.
 * Intentionally conservative: no output / NO_CHANGES means zero file writes.
 */

import { generateText } from 'ai';
import { getModel, generateFast } from './provider-helpers.js';
import { parseFileBlocks } from './file-blocks.js';
import { llmLog } from './llm-logger.js';
import { resolveLightweightModel } from './llm-lightweight.js';
import { resolveModelRole } from '../shared/model-registry.js';

const MINI_POLISH_TIMEOUT_MS = 180000;
/** Soft cap so one request stays within typical context limits; tail truncation per file if needed */
const MAX_TOTAL_CONTEXT_CHARS = 220000;

function normalizePathToken(str = '') {
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveKnownPath(modelPath, knownPaths = []) {
    if (!modelPath || knownPaths.length === 0) return null;
    if (knownPaths.includes(modelPath)) return modelPath;

    const wantedNorm = normalizePathToken(modelPath);
    const byNormFull = knownPaths.find((p) => normalizePathToken(p) === wantedNorm);
    if (byNormFull) return byNormFull;

    const wantedBase = normalizePathToken(modelPath.split('/').pop() || modelPath);
    const baseMatches = knownPaths.filter((p) => normalizePathToken(p.split('/').pop() || p) === wantedBase);
    if (baseMatches.length === 1) return baseMatches[0];

    return null;
}

function buildBoundedFileContext(files) {
    const parts = [];
    let total = 0;
    for (const f of files) {
        const header = `\n\n--- FILE: ${f.path} ---\n`;
        let body = f.content || '';
        const room = MAX_TOTAL_CONTEXT_CHARS - total - header.length;
        if (room <= 0) {
            parts.push(`${header}[TRUNCATED: context limit reached; file omitted]`);
            break;
        }
        if (body.length > room) {
            body = body.slice(0, room) + '\n/* …truncated… */';
        }
        parts.push(header + body);
        total += header.length + body.length;
        if (total >= MAX_TOTAL_CONTEXT_CHARS) break;
    }
    return parts.join('');
}

const SYSTEM_PROMPT = `You are a senior React (Vite + Tailwind) release QA engineer. This is a **single** reliability pass on code that already went through a heavy "final polish". The user's product vision (for tone only):

{{VISION}}

YOUR MINDSET — MINIMAL SURFACE AREA:
- **Default: make NO edits.** Only change files when you find a concrete defect below.
- Prefer small, surgical diffs. Do not refactor for style. Do not rename files.
- If everything is acceptable, respond with exactly: NO_CHANGES
- If you must change code, output ONLY modified files as XML blocks. Wrap each in:
  <file path="relative/path/from/src">...</file>
- No markdown fences. No explanations outside the file blocks (or NO_CHANGES).

CHECKLIST (only act when clearly broken or harmful to UX):

1) **Routes & navigation**
   - Read App.jsx / router setup and nav components (Header, Footer, Navbar).
   - Nav links (Link, NavLink, <a href="#/...">, etc.) must target routes that exist and render real content—not an empty shell.
   - If a route exists but the page is effectively empty while nav still advertises it: add minimal purposeful content OR remove/hide that nav entry (prefer fixing content if quick).
   - If nav points to a path with no matching Route: remove the link or add the Route + page—whichever is smaller and consistent with the rest of the site.

2) **Duplicate chrome**
   - If two navbars/headers (or two footers) render on the same view, remove the duplicate import/render.

3) **Landing / hero copy (not backgrounds)**
   - The main landing/hero should have a readable **title**, short **description/subtitle**, and a non-placeholder **hero image** (img src + meaningful alt)—when the design slot expects them. Do not redesign backgrounds, shaders, or WebGL; only fix missing/obviously empty text or clearly broken image props.

4) **Layout sanity (light touch)**
   - If something marked sticky/fixed is obviously never sticky when it should be, or z-index causes main content to be fully covered, apply a minimal fix.
   - Do not rewrite animation or shader code.

5) **Images**
   - Fix clearly empty src, literal "placeholder" URLs, or alt="" on important hero images where a sensible alt is obvious.

6) **Build hygiene**
   - Keep lucide-react imports valid (only real icon names). Do not add new dependencies.

When in doubt, respond NO_CHANGES.`;

/**
 * @param {Array<{path: string, content: string}>} files
 * @param {string} prompt - user vision
 * @param {Object} options - { model: heavy model id, fileTree?: string[], sandboxId?: string }
 * @returns {Promise<Array<{path: string, content: string}>|null>} - refined files to merge, [] if none, null on hard failure
 */
export async function runMiniPolishStep(files, prompt, options = {}) {
    const { model: heavyModel = resolveModelRole('generalGeneration'), fileTree = [], sandboxId = '' } = options;
    const visionPrompt = (prompt || '').replace(/\[EXPLICIT_COMPONENTS:[^\]]*\]/g, '').trim();

    const lm = resolveLightweightModel(heavyModel);
    const fileTreeContext =
        fileTree.length > 0 ? `SANDBOX FILE TREE:\n${fileTree.map((p) => `  - ${p}`).join('\n')}` : 'File tree unavailable.';

    const fileContext = buildBoundedFileContext(files);
    const system = SYSTEM_PROMPT.replace('{{VISION}}', visionPrompt || '(not provided)');
    const userPrompt = `${fileTreeContext}

PROJECT FILES (full stack context):
${fileContext}

Respond with NO_CHANGES or with <file path="..."> blocks only.`;

    console.log('\n' + '─'.repeat(52));
    console.log(' 🔍  MINI POLISH (reliability pass)');
    console.log('─'.repeat(52));
    console.log(` Model: ${lm.id}  |  Files: ${files.length}  |  Sandbox: ${sandboxId || 'n/a'}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MINI_POLISH_TIMEOUT_MS);
    const startTime = Date.now();

    llmLog.request('MINI-POLISH', {
        model: lm.id,
        systemPrompt: system,
        userPrompt: userPrompt.slice(0, 12000) + (userPrompt.length > 12000 ? '\n…[user prompt truncated for log]' : ''),
        temperature: 0
    });

    try {
        let text = '';
        if (lm.useFast) {
            text = await generateFast(system, userPrompt);
        } else {
            const res = await generateText({
                model: getModel(lm.id),
                system,
                prompt: userPrompt,
                temperature: 0,
                maxRetries: 2,
                maxTokens: 16384,
                abortSignal: controller.signal
            });
            text = res.text || '';
        }

        clearTimeout(timeoutId);

        const trimmed = (text || '').trim();
        if (/^NO_CHANGES\s*$/i.test(trimmed) || trimmed.length === 0) {
            console.log(' [mini-polish] NO_CHANGES (or empty) — skipping writes.');
            llmLog.response('MINI-POLISH', { response: 'NO_CHANGES', durationMs: Date.now() - startTime, fileCount: 0 });
            return [];
        }

        const parsed = parseFileBlocks(trimmed);
        if (parsed.length === 0) {
            console.log(' [mini-polish] No <file> blocks parsed — treating as no changes.');
            llmLog.response('MINI-POLISH', { response: trimmed.slice(0, 500), durationMs: Date.now() - startTime, fileCount: 0 });
            return [];
        }

        const fileMap = new Map(files.map((f) => [f.path, f.content]));
        const merged = [];
        const knownPaths = [...fileMap.keys()];
        for (const pf of parsed) {
            const resolvedPath = fileMap.has(pf.path) ? pf.path : resolveKnownPath(pf.path, knownPaths);
            if (resolvedPath) {
                if (resolvedPath !== pf.path) {
                    console.warn(` [mini-polish] Normalized model path "${pf.path}" -> "${resolvedPath}"`);
                }
                merged.push({ path: resolvedPath, content: pf.content });
            } else {
                console.warn(` [mini-polish] Ignoring unknown path from model: ${pf.path}`);
            }
        }

        console.log(` [mini-polish] ${merged.length} file(s) to apply (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);
        llmLog.response('MINI-POLISH', {
            response: trimmed.slice(0, 2000),
            durationMs: Date.now() - startTime,
            fileCount: merged.length
        });

        return merged;
    } catch (e) {
        clearTimeout(timeoutId);
        console.error(` [mini-polish] Failed: ${e.message}`);
        llmLog.error('MINI-POLISH', e);
        return null;
    }
}
