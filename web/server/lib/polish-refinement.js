import { generateText } from 'ai';
import { getModel } from './provider-helpers.js';
import { parseFileBlocks } from './file-blocks.js';

/**
 * Runs a final polish on the generated code.
 * 
 * @param {Array} files - [{path, content}]
 * @param {string} prompt - Original user prompt
 * @param {string} buildErrors - (Optional) Logs from a failed build
 * @param {Object} options - { model, fileTree, isEdit, sandboxId }
 * @returns {Promise<Array>} - Refined files
 */
export async function runPolishStep(files, prompt, buildErrors = '', options = {}) {
    const { model = 'google/gemini-3.1-pro-preview', fileTree = [], isEdit = false, sandboxId = '' } = options;

    // Strip EXPLICIT_COMPONENTS tag from prompt as it's metadata, not vision context
    const visionPrompt = prompt.replace(/\[EXPLICIT_COMPONENTS:[^\]]*\]/g, '').trim();

    // ═══════════════════════════════════════════════════════════
    // TERMINAL DASHBOARD (SERVER SIDE)
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    console.log(' ✨  VOLTURIANO AI POLISH DASHBOARD  ✨ ');
    console.log('═'.repeat(60));
    console.log(` 🤖 MODEL   : ${model}`);
    console.log(` 📂 FILES   : ${files.length} (Context: ${fileTree.length} total files)`);
    console.log(` 🎯 PROMPT  : "${visionPrompt ? visionPrompt.substring(0, 120) : '⚠️ EMPTY - VISION WILL BE LOST'}"`);
    if (!visionPrompt || visionPrompt.trim().length === 0) {
        console.warn('⚠️⚠️⚠️ [POLISH] CRITICAL WARNING: Prompt is EMPTY. The polish step will have NO context about the user vision!');
    }
    console.log(` 🛠️  REPAIR  : ${buildErrors ? '🚨 Errors detected - fixing...' : '✅ Clean build - optimizing...'}`);
    if (sandboxId) console.log(` 🏝️  SANDBOXID: ${sandboxId}`);
    console.log('═'.repeat(60));
    console.log(' [process] Analyzing codebase structure...');

    // Prepare context: list of files and their summary
    const fileContext = files.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n');
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
3. COLOR SOPHISTICATION: Never use typical basic red, blue, or green. Use rich, curated, harmonious palettes. Ensure the Tailwind color palette is consistent across ALL files. No page should feel like a different site.
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
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for heavy polish pass

        const startTime = Date.now();
        let text;

        if (model.includes('openai/')) {
            console.log(' [process] Using OpenAI Native Responses API for Quality Mode...');
            const { generateWithQuality } = await import('./provider-helpers.js');
            text = await generateWithQuality(
                systemPrompt,
                `Perform a Final Polish on the following website files to perfectly match the vision of "${prompt}". Focus on specialization and premium aesthetics.\n\n${fileContext}`
            );
        } else {
            console.log(' [process] Using Standard AI SDK...');
            const result = await generateText({
                model: getModel(model),
                system: systemPrompt,
                prompt: `Perform a Final Polish on the following website files to perfectly match the vision of "${prompt}". Focus on specialization and premium aesthetics.\n\n${fileContext}`,
                temperature: 0,
                maxRetries: 7, // Highly resilient retry budget to combat Claude/anthropic '503 Overloaded'
                abortSignal: controller.signal
            });
            text = result.text;
        }

        clearTimeout(timeoutId);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(` [success] LLM response received in ${duration}s`);

        const refinedFiles = parseFileBlocks(text);

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
