import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from './provider-helpers.js';
import { parseFileBlocks } from './file-blocks.js';
import { llmLog } from './llm-logger.js';
import { resolveDesignSpecModelId } from './llm-lightweight.js';
import { normalizePublicModelId, resolveModelRole } from '../shared/model-registry.js';

const USE_PARALLEL_POLISH = false; // Toggle for 2-Step Async Parallel execution instead of slow monolithic runs
const NON_POLISHABLE_SHELL_FILES = new Set(['src/App.jsx', 'src/main.jsx']);
const DEFAULT_POLISH_MODEL = resolveModelRole('premiumPolish');
/** Skip polish for tiny wrappers — not enough text to justify an LLM call (Phase 8). */
export const MIN_POLISH_CHAR_BYTES = 500;

/** Premium catalog components: full-rewrite polish breaks shaders/WebGL; use copy-only pass instead. */
export const PREMIUM_PATH_PREFIX = 'src/components/premium/';

/**
 * @param {{ path: string }} file
 * @param {{ premiumPaths?: Set<string> }} [options]
 */
function isPremiumFile(file, options = {}) {
    if (options.premiumPaths instanceof Set && options.premiumPaths.has(file.path)) {
        return true;
    }
    return file.path.startsWith(PREMIUM_PATH_PREFIX);
}

function buildPremiumCopySystemPrompt(visionPrompt, buildErrors = '') {
    return `You are editing a premium marketplace React component. Your ONLY job is to replace placeholder/demo text (company names, taglines, descriptions, CTAs, button labels, testimonial names, navigation labels where they are visible strings, and image alt text where it is literal in JSX) with real copy that serves this website vision:

"${visionPrompt}"

ALLOWED MEDIA UPDATE (SAFE): You may replace literal stock/demo media URL strings in JSX/data arrays (e.g. src="https://...", image: "https://...") when they conflict with the vision. Keep the same object/array/JSX shape and do not add runtime parsing/fetch logic.

DO NOT modify: imports, exports, default exports, function or component names, prop names, TypeScript types, CSS class names, Tailwind class strings as a whole, inline style objects, animation variants, shaders, WebGL, Three.js, canvas code, Framer Motion props (except string literals inside them if purely textual), or structural JSX/layout.

Preserve every animation, shader, and interaction exactly; change only user-visible text content plus safe literal media URL replacements.

Wrap the full updated file in <file path="EXACT_PATH_FROM_PROMPT">...</file>. No markdown fences. No explanations.

If build errors are shown below, do NOT "fix" them by refactoring code—only adjust literal strings if an error clearly points at a string. Otherwise leave code unchanged.
BUILD ERRORS/LOGS:
${buildErrors || 'None.'}`;
}

function buildPremiumCopyFilePrompt(file, visionPrompt) {
    return `FILE: ${file.path}

Replace demo/placeholder text so it matches the vision: "${visionPrompt}"

Output the complete file in one block:
<file path="${file.path}">
...full source...
</file>

--- SOURCE ---
${file.content}`;
}

async function asyncPool(poolLimit, array, iteratorFn) {
    const ret = [];
    const executing = [];
    for (const item of array) {
        const p = Promise.resolve().then(() => iteratorFn(item, array));
        ret.push(p);
        if (poolLimit <= array.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= poolLimit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(ret);
}

export async function generateDesignSpec(prompt, fileContext, modelName) {
    try {
        console.log(' [process] Generating Global Design Spec for Parallel Policy...');
        const result = await generateObject({
            model: getModel(modelName),
            schema: z.object({
                brand_name: z.string(),
                color_palette_hexes: z.array(z.string()),
                typography_vibe: z.string(),
                copywriting_tone: z.string(),
                global_design_rules: z.string().describe("A summary of rules for all components to ensure cohesion")
            }),
            system: "You are an Executive Art Director. Create a cohesive design specification for a new website based on the vision.",
            prompt: `Website Vision: "${prompt}"\n\nAnalyze the following available components and extract a unifying design language that ties them all together perfectly.\n\n${fileContext.substring(0, 15000)}`,
            temperature: 0.1
        });
        return result.object;
    } catch (e) {
        console.warn(` [warning] Design spec failed: ${e.message}`);
        return null; // fallback gracefully without breaking the build
    }
}

const triageSchema = z.object({
    decisions: z.array(
        z.object({
            path: z.string(),
            action: z.enum(['skip', 'copy_only', 'full_polish']),
            reason: z.string().optional()
        })
    )
});

/**
 * One lightweight call: which standard (non-premium) files need full polish vs copy-only vs skip.
 * @returns {Map<string, 'skip'|'copy_only'|'full_polish'>}
 */
async function triageStandardFilesForPolish(standardFiles, visionPrompt, model, designSpec) {
    if (!standardFiles.length) return new Map();
    const triageModel = resolveDesignSpecModelId(model);
    const snippets = standardFiles.slice(0, 45).map((f) => ({
        path: f.path,
        bytes: (f.content || '').length,
        head: (f.content || '').slice(0, 220).replace(/\s+/g, ' ')
    }));
    const specHint = designSpec
        ? `Brand: ${designSpec.brand_name || ''}. Tone: ${designSpec.copywriting_tone || ''}.`
        : '';
    try {
        const result = await generateObject({
            model: getModel(triageModel),
            schema: triageSchema,
            system: `You triage React/Vite source files for a final polish pass. User vision (truncated): "${String(visionPrompt).slice(0, 1800)}"
${specHint}
For each file choose:
- skip: already on-brand, no demo placeholders, or negligible user-visible text; OR config-only.
- copy_only: only literal text/labels/alt need changing; preserve structure, Tailwind classes, shaders, motion.
- full_polish: needs broader layout/color/spacing/copy work beyond string swaps.
Bias toward skip when the file looks freshly generated with coherent copy.`,
            prompt: `Return one decision per path (same paths as input, same order):\n${JSON.stringify(snippets)}`,
            temperature: 0
        });
        const m = new Map();
        for (const d of result.object.decisions) {
            m.set(d.path, d.action);
        }
        for (const f of standardFiles) {
            if (!m.has(f.path)) m.set(f.path, 'full_polish');
        }
        return m;
    } catch (e) {
        console.warn('[polish] triage failed, defaulting standard files to full_polish:', e.message);
        return new Map();
    }
}

function salvageSingleFileCode(raw = '') {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Reject obvious non-code / meta replies
    if (/^no_changes$/i.test(trimmed)) return null;
    if (/^i (can't|cannot|won't)|^sorry\b/i.test(trimmed)) return null;

    // Strip markdown fences when model forgot XML wrapper.
    if (trimmed.startsWith('```')) {
        return trimmed
            .replace(/^```[a-z]*\n/i, '')
            .replace(/\n```$/i, '')
            .trim();
    }

    // Accept only when it looks like source code.
    if (/(import\s.+from|export\s+default|function\s+\w+|const\s+\w+\s*=|class\s+\w+)/.test(trimmed)) {
        return trimmed;
    }
    return null;
}

/**
 * Runs a final polish on the generated code.
 * 
 * @param {Array} files - [{path, content}]
 * @param {string} prompt - Original user prompt
 * @param {string} buildErrors - (Optional) Logs from a failed build
 * @param {Object} options - { model, fileTree, isEdit, sandboxId, premiumPaths?, skipPaths?, designSpec?, disableTriage? }
 * @returns {Promise<Array>} - Refined files
 */
export async function runPolishStep(files, prompt, buildErrors = '', options = {}) {
    const {
        model = DEFAULT_POLISH_MODEL,
        fileTree = [],
        isEdit = false,
        sandboxId = '',
        premiumPaths,
        designSpec: designSpecOption,
        disableTriage = false
    } = options;

    const effectiveModel = normalizePublicModelId(model);
    // Strip EXPLICIT_COMPONENTS tag from prompt as it's metadata, not vision context
    const visionPrompt = prompt.replace(/\[EXPLICIT_COMPONENTS:[^\]]*\]/g, '').trim();

    // ═══════════════════════════════════════════════════════════
    // TERMINAL DASHBOARD (SERVER SIDE)
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    console.log(' ✨  VOLTURIANO AI POLISH DASHBOARD  ✨ ');
    console.log('═'.repeat(60));
    console.log(` 🤖 MODEL   : ${effectiveModel}`);
    const skipPathSet = options.skipPaths instanceof Set ? options.skipPaths : new Set();
    let skippedTiny = 0;
    let skippedSkipPaths = 0;
    const polishableFiles = files.filter((f) => {
        if (NON_POLISHABLE_SHELL_FILES.has(f.path)) return false;
        if (skipPathSet.has(f.path)) {
            skippedSkipPaths++;
            return false;
        }
        if ((f.content || '').length < MIN_POLISH_CHAR_BYTES) {
            skippedTiny++;
            return false;
        }
        return true;
    });
    const standardPolishFiles = polishableFiles.filter((f) => !isPremiumFile(f, options));
    const premiumPolishFiles = polishableFiles.filter((f) => isPremiumFile(f, options));
    console.log(
        ` 📂 FILES   : ${files.length} total → polish ${polishableFiles.length} (standard ${standardPolishFiles.length}, premium copy-only ${premiumPolishFiles.length}; skipped ≤${MIN_POLISH_CHAR_BYTES}b=${skippedTiny} skipPaths=${skippedSkipPaths}; tree ${fileTree.length})`
    );
    console.log(
        '[BUILDER-VERIFY] polish filter: skippedTiny=%d skippedSkipPaths=%d polishable=%d',
        skippedTiny,
        skippedSkipPaths,
        polishableFiles.length
    );
    console.log(
        '[BUILDER-VERIFY] polish split: standard=%d premiumCopyOnly=%d premiumPathsOverride=%s',
        standardPolishFiles.length,
        premiumPolishFiles.length,
        options.premiumPaths instanceof Set ? options.premiumPaths.size : 0
    );
    console.log(` 🎯 PROMPT  : "${visionPrompt ? visionPrompt.substring(0, 120) : '⚠️ EMPTY - VISION WILL BE LOST'}"`);
    if (!visionPrompt || visionPrompt.trim().length === 0) {
        console.warn('⚠️⚠️⚠️ [POLISH] CRITICAL WARNING: Prompt is EMPTY. The polish step will have NO context about the user vision!');
    }
    console.log(` 🛠️  REPAIR  : ${buildErrors ? '🚨 Errors detected - fixing...' : '✅ Clean build - optimizing...'}`);
    if (sandboxId) console.log(` 🏝️  SANDBOXID: ${sandboxId}`);
    console.log('═'.repeat(60));
    console.log(' [process] Analyzing codebase structure...');

    // Prepare context: list of files and their summary
    const fileContext = polishableFiles.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n');
    const fileTreeContext = fileTree.length > 0
        ? `CURRENT SANDBOX FILE TREE:\n${fileTree.map(p => `  - ${p}`).join('\n')}`
        : 'File tree unavailable.';

    const systemPrompt = `You are a world-class UI/UX Engineer. You take great pride in keeping things simple and elegant.
Your task is to perform a "Final Polish" on a React website. The user's vision is: "${prompt}".
Every decision you make — every word, color, and spacing choice — must serve this vision exclusively.

CONTEXT:
${fileTreeContext}

COMPONENT TRANSLATION (CRITICAL):
The components contain demo brand names like "Rivelon", "Atelier", "Qyvora", "SolarScope", "Zenity", "Example Brand", "Jane Doe".
These are generic shells from a component marketplace. They have NOTHING to do with the user's website.
You MUST replace ALL of them with real, high-quality copy that serves "${prompt}".
If a component is named "VortexPricing", do not assume the website is about "Vortex Energy".
If the prompt is about "Coffee", do not write about "Quantum Energy" just because the component had a tech demo name.

BUILDING ENVIRONMENT & CONSTRAINTS:
- Framework: React 18, Vite, Tailwind CSS.
- Styling: STRICTLY Tailwind CSS only. NO inline styles (style={{}}).
- Icons: lucide-react (Premium icons). NEVER hallucinate icon names (e.g., NO 'Stitch', 'Leather', etc.).
- Animations: framer-motion.
- Composition: App.jsx handles the layout stack (Header -> Hero -> Sections -> Footer). Individual section files (in src/components/) should NOT render Header/Hero/Footer.

GOALS:
1. VISION FIDELITY: Every heading, paragraph, button label, and image alt text must directly serve the user's vision. No generic filler. No leftover demo text. No placeholder addresses or fake names.
2. MINIMALIST COPYWRITING (CRITICAL): Less is more. Every word must feel intentional, punchy, and high-end. Let the premium design breathe. Sometimes doing a small change is the biggest change that could be made.
   BAD: "Welcome to our amazing platform where we provide world-class solutions for all your needs. Our team of dedicated experts works tirelessly to deliver exceptional results that exceed expectations every single time."
   GOOD: "World-class magic. Taught by those who live it."
   BAD: A pricing card listing 12 features in tiny text with repetitive adjectives and buzzwords.
   GOOD: A pricing card with 3 sharp benefits and one bold CTA.
   BAD: Every section having a title, subtitle, AND a paragraph of explanation.
   GOOD: A section with just a powerful headline and whitespace.
3. COLOR SOPHISTICATION & NO COLOR BOMBING: Never use typical basic red, blue, or green. Use rich, curated, harmonious palettes. Do NOT color-bomb the UI by drowning every element in loud brand colors. Use clean, sleek, neutral bases (like deep slates or luxurious blacks) and apply brand colors SPARINGLY as premium accents (e.g. glowing borders, primary buttons, or subtle text highlights). Ensure the overall distribution of color feels even and tasteful. No page should feel like a different site.
4. ERROR CORRECTION: If build errors are provided below, fix them SURGICALLY.
6. DO NOT OVERENGINEER (CRITICAL IDENTITY RULE):
   - You take great pride in keeping things simple and elegant.
   - DO NOT do more than what is needed to match the user's vision.
   - Do NOT add features, sections, or text that the user didn't ask for.
   - Do NOT inject generic "enhancements" like testimonial carousels, FAQ sections, or newsletter signups unless the prompt specifically demands them.
   - If the components already look premium, your job is to translate the text and colors — not redesign the entire layout.
   - A subtle, confident change beats a loud, busy one every time.
7. INTENTIONALITY & ROLE VALIDATION (MINDSET):
   - Ask yourself: "Is this component truly appropriate for its role (Header, Hero, Footer)?"
   - Header: Must have functional navigation links that map correctly to the routes in App.jsx.
   - LandingPage/Hero: Must be high-impact and immediately communicate the vision.
   - Sections: Must flow logically from one to the next (Problem -> Solution -> Services -> CTA).
   - Footer: Must be professional, complete, and contextually relevant.
   - If a component feels misplaced, adjust its content and styling to "force" it into the correct intentionality without breaking its premium engine.
8. STRUCTURAL INTEGRITY (TOYOTA PHILOSOPHY):
   - The provided components are premium and already have solid, high-quality infrastructure (WebGL, complex Framer Motion logic, sticky scrolls, shaders). 
   - PRESERVE their original intention, layout, and specialized interactive logic. 
   - DO NOT BREAK SHADERS: When adapting WebGL/Shader code (vertexShader/fragmentShader) or Three.js setups, you may ONLY change color values (like uniforms, hex strings, or vec3 color arrays) to match the new theme. Do NOT alter the mathematical logic, noise functions, layout, or core mechanics.
   - ENSURE SHADER VISIBILITY: When using premium shader or WebGL components (especially backgrounds), ensure they remain completely VISIBLE. Do not accidentally cover them up by adding fully opaque backgrounds (like bg-black, bg-white) or incorrect z-indexes to overlying wrapper divs. Overlying text/content containers must have transparent backgrounds (like bg-transparent or bg-black/40) so the shader magic shines through.
   - Make ONLY necessary code changes to adapt the component perfectly to the user's vision (copy, images, theme colors). 
   - Do NOT add unnecessary complexity or generic "enhancements" that overwrite the component's unique magic.
   - EXCEPTION: If the user's prompt is overwhelmingly, aggressively custom and specifically demands a radical structural change, you have the full intelligence to rewrite the HTML/Tailwind styling layout. But even then, do NOT break the shader code.
9. NO SKELETON PAGES (CRITICAL):
   - If you are polishing a secondary page (e.g., /services or /about), it MUST be a "full-fledged attempt."
   - DO NOT leave a page as an empty <div> or just a single line of text.
   - Each page must have a minimum of 3-4 sections (e.g., SimpleHero -> FeatureGrid -> TextSection -> Contact/CTA).
   - If a page is empty or sparse, INJECT appropriate sections from the existing component library (check imports) or create clean Tailwind-based sections that maintain the site's premium feel.
10. PREMIUM DESIGN PHILOSOPHY:
   - WHITESPACE IS LUXURY: Use generous spacing. Cramped designs look cheap. Let elements breathe. If it feels like there's "too much space," it's probably just right.
   - DETAILS DEFINE QUALITY: Subtle touches (grain textures, soft shadows, gentle transitions) separate good from extraordinary. Don't add noise — add refinement.
   - DEPTH THROUGH LAYERS: Use shadows, blurs, and overlapping elements for visual hierarchy. Think glassmorphism where appropriate.
   - TYPOGRAPHY MATTERS: Never rely on system-UI defaults. Use the imported fonts (Inter, Outfit, etc.) intentionally with proper weight hierarchies (bold headlines, light body text).

CONSTRAINTS:
- DO NOT change the file names or overall structure unless fixing a broken import.
- NO MONOLITHIC APP.JSX: Do not write all your UI layout code directly into App.jsx. App.jsx MUST remain a clean, minimal shell that simply imports and renders the outer components. You must achieve your design by editing the INDIVIDUAL component files (in src/components/) directly.
- ZERO-TOLERANCE EXHAUSTIVE SWEEP (CRITICAL): You MUST edit and output EVERY SINGLE COMPONENT in the context that contains text. Do not just polish 1 or 2 files and get lazy. You MUST perform a full sweep of ALL components, replacing all placeholder text and demo branding (Rivelon, Qyvora, etc.) with real content that matches the user's vision. Returning components unmodified is a FATAL ERROR.
- Wrap each updated file in <file path="path/to/file">...code...</file> tags.
- NO explanation text. NO markdown fences.

MULTI-PAGE POLISH RULES (if the project uses HashRouter/Routes):
- Each page should have distinct, page-specific content — do NOT duplicate the hero across pages.
- The Home page hero should be the strongest selling point.
- Secondary pages (About, Pricing, Contact) should have focused, purposeful content.
- Navigation labels must be concise and clear (Home, About, Pricing — not "Our Amazing Homepage").
- Consistent color palette across ALL pages — no page should feel like a different site.
- Do NOT modify App.jsx routing structure, siteMap.js, or Route paths. Only polish visual content.
- NAVIGATION INTEGRITY:
    - Ensure all links in the Header and Footer actually correspond to real, populated pages.

FINAL REMINDER: The user's goal is "${prompt}". Do not leave any demo brand names behind. Every page must be a "wow" experience with real content.
BUILD ERRORS/LOGS (If any):
${buildErrors || 'None - perform aesthetic optimizations and copy specialization only.'}
`;

    console.log(' [process] Sending request to LLM...');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 300s timeout for parallel heavy polish pass

        const startTime = Date.now();
        let text;

        llmLog.request('POLISH', {
            model: effectiveModel,
            systemPrompt: systemPrompt,
            userPrompt: visionPrompt,
            temperature: 0
        });

        const isNativeOpenAI = effectiveModel.includes('openai/');

        let refinedFilesList = [];

        if (USE_PARALLEL_POLISH) {
            const poolLimit = effectiveModel.includes('anthropic') ? 2 : 3;
            console.log(` [process] Using Parallel Polish Engine (concurrency ${poolLimit})`);
            console.log('[BUILDER-VERIFY] polish concurrency poolLimit=%d', poolLimit);

            const specModel = resolveDesignSpecModelId(effectiveModel);
            let designSpec =
                designSpecOption !== undefined ? designSpecOption : await generateDesignSpec(visionPrompt, fileContext, specModel);

            console.log(' [process] Design Spec:', designSpec ? JSON.stringify(designSpec) : 'FAILED (Proceeding blindly)');
            if (designSpecOption !== undefined) {
                console.log('[BUILDER-VERIFY] polish designSpec=from_apply_cache');
            }

            const customSystemPrompt = designSpec
                ? `${systemPrompt}\n\nCRITICAL GLOBAL DESIGN SPEC (OBEY ACROSS ALL FILES):\n${JSON.stringify(designSpec, null, 2)}`
                : systemPrompt;

            let triageMap = new Map();
            if (!disableTriage && standardPolishFiles.length > 0) {
                triageMap = await triageStandardFilesForPolish(standardPolishFiles, visionPrompt, effectiveModel, designSpec);
                let skipN = 0;
                let copyN = 0;
                let fullN = 0;
                for (const f of standardPolishFiles) {
                    const a = triageMap.get(f.path) || 'full_polish';
                    if (a === 'skip') skipN++;
                    else if (a === 'copy_only') copyN++;
                    else fullN++;
                }
                console.log(
                    '[BUILDER-VERIFY] polish triage: standard=%d skip=%d copy_only=%d full_polish=%d',
                    standardPolishFiles.length,
                    skipN,
                    copyN,
                    fullN
                );
            }

            const workItems = [];
            for (const f of premiumPolishFiles) {
                workItems.push({ file: f, mode: 'copy-only' });
            }
            for (const f of standardPolishFiles) {
                const action = triageMap.get(f.path) || 'full_polish';
                if (action === 'skip') continue;
                workItems.push({
                    file: f,
                    mode: action === 'copy_only' ? 'copy-only' : 'full'
                });
            }

            const polishOneFile = async (workItem) => {
                const start = Date.now();
                const file = workItem.file;
                const isPremium = isPremiumFile(file, options);
                const isCopyOnly = isPremium || workItem.mode === 'copy-only';
                const tag = isPremium ? ' (premium copy-only)' : isCopyOnly ? ' (copy-only)' : '';
                console.log(` [parallel] Polishing ${file.path}${tag}...`);
                if (isPremium) {
                    console.log('[BUILDER-VERIFY] polish file mode=premiumCopyOnly path=%s', file.path);
                } else if (isCopyOnly) {
                    console.log('[BUILDER-VERIFY] polish file mode=copyOnly path=%s', file.path);
                }

                let systemForFile;
                let filePrompt;

                if (isCopyOnly) {
                    systemForFile = buildPremiumCopySystemPrompt(visionPrompt, buildErrors);
                    filePrompt = buildPremiumCopyFilePrompt(file, visionPrompt);
                } else {
                    systemForFile = customSystemPrompt;
                    let roleContext = 'UI Section';
                    const lowerPath = file.path.toLowerCase();
                    if (lowerPath.includes('hero') || lowerPath.includes('splash') || lowerPath.includes('landing')) {
                        roleContext = 'Hero / Landing Section (Highest visual impact, biggest headline, first impression)';
                    } else if (lowerPath.includes('footer')) {
                        roleContext = 'Footer (Bottom of page, social links, auxiliary navigation)';
                    } else if (lowerPath.includes('header') || lowerPath.includes('nav')) {
                        roleContext = 'Header / Navigation (Top bar, main navigation routes)';
                    } else if (lowerPath.includes('cta') || lowerPath.includes('calltoaction') || lowerPath.includes('particle')) {
                        roleContext = 'Call To Action (Driving the user to sign up, buy, or act NOW)';
                    } else if (lowerPath.includes('review') || lowerPath.includes('testimonial')) {
                        roleContext = 'Social Proof / Reviews (Building trust via testimonials)';
                    } else if (lowerPath.includes('feature')) {
                        roleContext = 'Features / Services (Explaining what the product/service does in detail)';
                    } else if (lowerPath.includes('app.')) {
                        roleContext = 'Main Application Shell (Routing, layout stacking, global structure)';
                    } else if (lowerPath.includes('main.')) {
                        roleContext = 'React Entry Point';
                    }

                    filePrompt = `YOUR TASK: Perform a Final Polish EXCLUSIVELY on this single file.
FILE ROLE: ${roleContext}
WEBSITE VISION: "${prompt}"

INSTRUCTIONS (CRITICAL):
1. MINIMALISM: "Less is more." Every word must feel intentional, punchy, and high-end. Let the premium design breathe.
2. WHITESPACE IS LUXURY: Ensure generous spacing. Subtlety and whitespace define premium layouts.
3. PRESERVE THE MAGIC: DO NOT alter core WebGL/Shader logic, framer-motion animations, or fundamental component structures. Only tune colors, arrays, images, and text.
4. NO GENERIC FILLER: Erase all standard marketplace placeholder text (e.g. "Welcome to our platform"). Make the copy surgically specific to "${prompt}".
5. NO COLOR BOMBING: Do not drown the UI in loud brand colors. Use a sleek, elegant neutral base (e.g., deep darks) and apply the Global Design Spec hex codes SPARINGLY as premium accents (buttons, subtle glows, active states). The goal is a tasteful, balanced distribution.
6. ISOLATION: DO NOT wrap this file with an overarching <Layout> or <App> container if it's just a section component.
7. FORMAT: You MUST provide the final output wrapped securely inside <file path="${file.path}">...code...</file>.

--- FILE TO POLISH: ${file.path} ---
${file.content}`;
                }

                let fileText = '';
                if (isNativeOpenAI) {
                    const { generateWithQuality } = await import('./provider-helpers.js');
                    fileText = await generateWithQuality(systemForFile, filePrompt);
                } else {
                    const res = await generateText({
                        model: getModel(effectiveModel),
                        system: systemForFile,
                        prompt: filePrompt,
                        temperature: 0,
                        maxRetries: effectiveModel.includes('anthropic') ? 6 : 3,
                        abortSignal: controller.signal
                    });
                    fileText = res.text;
                }

                console.log(` [parallel] Finished ${file.path} in ${((Date.now() - start) / 1000).toFixed(1)}s`);

                const parsed = parseFileBlocks(fileText);
                if (parsed.length > 0) {
                    const exact = parsed.find((p) => p.path === file.path) || parsed[0];
                    if (exact.path !== file.path) {
                        console.warn(` [parallel] Normalized model path "${exact.path}" -> "${file.path}"`);
                    }
                    return { ok: true, blocks: [{ path: file.path, content: exact.content }] };
                }

                const allowSalvage = !isCopyOnly && !buildErrors;
                if (allowSalvage) {
                    const salvaged = salvageSingleFileCode(fileText);
                    if (salvaged) {
                        console.warn(` [parallel] Salvaged raw code response for ${file.path} (missing <file> block).`);
                        return { ok: true, blocks: [{ path: file.path, content: salvaged }] };
                    }
                } else if (buildErrors) {
                    console.warn(` [parallel] Salvage disabled for ${file.path} (repair pass — avoid broken full-file salvage).`);
                } else if (isCopyOnly) {
                    console.warn(` [parallel] Copy-only polish: no <file> block for ${file.path} — skipping salvage (keeping original).`);
                }

                console.warn(` [parallel] ⚠️ No file block parsed for ${file.path}. Component bypassed.`);
                return { ok: false };
            };

            if (workItems.length === 0) {
                console.log('[BUILDER-VERIFY] polish triage: workItems=0 (nothing to polish)');
                refinedFilesList = [];
                text = '';
            } else {
                console.log('[BUILDER-VERIFY] polish workItems=%d (parallel batch)', workItems.length);
                await asyncPool(poolLimit, workItems, async (workItem) => {
                    try {
                        const result = await polishOneFile(workItem);
                        if (result.ok && result.blocks) {
                            refinedFilesList.push(...result.blocks);
                        }
                    } catch (e) {
                        console.error(` [parallel] 🚨 Failed on ${workItem.file.path}:`, e.message);
                    }
                });

                const donePaths = new Set(refinedFilesList.map((f) => f.path));
                const missed = workItems.filter((w) => !donePaths.has(w.file.path));
                if (missed.length > 0) {
                    console.log(` [parallel] Sequential retry for ${missed.length} file(s) without valid polish output...`);
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    for (const workItem of missed) {
                        await delay(400);
                        try {
                            const result = await polishOneFile(workItem);
                            if (result.ok && result.blocks) {
                                refinedFilesList.push(...result.blocks);
                                console.log(` [parallel] ✅ Retry succeeded for ${workItem.file.path}`);
                            }
                        } catch (e) {
                            console.error(` [parallel] 🚨 Retry failed for ${workItem.file.path}:`, e.message);
                        }
                    }
                }

                text = refinedFilesList.map((f) => `<file path="${f.path}">\n${f.content}\n</file>`).join('\n\n');
            }

        } else {
            // Monolithic path: full polish for non-premium files only; premium files get copy-only per-file passes.
            const standardFileContext = standardPolishFiles
                .map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
                .join('\n\n');

            refinedFilesList = [];

            if (standardPolishFiles.length > 0) {
                if (isNativeOpenAI) {
                    console.log(' [process] Using OpenAI Native Responses API for Quality Mode...');
                    const { generateWithQuality } = await import('./provider-helpers.js');
                    text = await generateWithQuality(
                        systemPrompt,
                        `Perform a Final Polish on the following website files to perfectly match the vision of "${prompt}". Focus on specialization and premium aesthetics.\n\n${standardFileContext}`
                    );
                } else {
                    console.log(' [process] Using Standard AI SDK...');
                    const result = await generateText({
                        model: getModel(effectiveModel),
                        system: systemPrompt,
                        prompt: `Perform a Final Polish on the following website files to perfectly match the vision of "${prompt}". Focus on specialization and premium aesthetics.\n\n${standardFileContext}`,
                        temperature: 0,
                        maxRetries: 7, // Highly resilient retry budget
                        abortSignal: controller.signal
                    });
                    text = result.text;
                }
                refinedFilesList.push(...parseFileBlocks(text));
            }

            for (const file of premiumPolishFiles) {
                const systemForFile = buildPremiumCopySystemPrompt(visionPrompt, buildErrors);
                const fp = buildPremiumCopyFilePrompt(file, visionPrompt);
                let fileText = '';
                if (isNativeOpenAI) {
                    const { generateWithQuality } = await import('./provider-helpers.js');
                    fileText = await generateWithQuality(systemForFile, fp);
                } else {
                    const res = await generateText({
                        model: getModel(effectiveModel),
                        system: systemForFile,
                        prompt: fp,
                        temperature: 0,
                        maxRetries: effectiveModel.includes('anthropic') ? 6 : 3,
                        abortSignal: controller.signal
                    });
                    fileText = res.text;
                }
                const parsed = parseFileBlocks(fileText);
                if (parsed.length > 0) {
                    const exact = parsed.find((p) => p.path === file.path) || parsed[0];
                    refinedFilesList.push({ path: file.path, content: exact.content });
                } else {
                    console.warn(` [polish] Premium monolithic: no <file> for ${file.path} — skipped (no salvage).`);
                }
            }

            text = refinedFilesList.map((f) => `<file path="${f.path}">\n${f.content}\n</file>`).join('\n\n');
        }

        llmLog.response('POLISH', {
            response: text,
            durationMs: Date.now() - startTime,
            fileCount: parseFileBlocks(text).length
        });

        clearTimeout(timeoutId);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(` [success] LLM response received in ${duration}s`);

        const refinedFiles = refinedFilesList;

        if (refinedFiles.length === 0) {
            console.log(' [warning] No files were modified during polish pass.');
            return [];
        }

        console.log(` [apply] Polished ${refinedFiles.length} files:`);
        refinedFiles.forEach(rf => console.log(`   └─ ✅ ${rf.path} (${rf.content.length} bytes)`));

        // Merge refined files back into the original list
        const fileMap = new Map(files.map(f => [f.path, f.content]));
        refinedFiles.forEach(rf => {
            fileMap.set(rf.path, rf.content);
        });

        console.log('═'.repeat(60) + '\n');
        return Array.from(fileMap.entries()).map(([path, content]) => ({ path, content }));
    } catch (e) {
        console.error(` [fatal] Polish analysis failed: ${e.message}`);
        console.log('═'.repeat(60) + '\n');
        return null; // Signal failure to caller; keep existing files untouched
    }
}
