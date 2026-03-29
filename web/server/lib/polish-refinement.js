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

    const systemPrompt = `You are a world-class UI/UX Engineer and Lead Architect.
Your ABSOLUTE TOP PRIORITY and ORIGINAL VISION is: "${prompt}".

Your task is to perform a "Final Polish" on a React website generated based on this vision: "${prompt}".

CONTEXT:
${fileTreeContext}

CRITICAL ANTI-DISTRACTION RULE:
You will see premium component names in the code like "Rivelon", "Atelier", "Leather", etc. 
These are generic brand shells. DO NOT let them distract you. 
The user is BUILDING: "${prompt}".
If the code mentions "Rivelon", change it to something relevant to "${prompt}".
If the code mentions "Leatherwork", change it to something relevant to "${prompt}".
STAY FOCUSED ON THE VISION: "${prompt}".
NO LEAKAGE (STRICT): Ensure generic brand names from component demos (e.g., Rivelon, Atelier, Qyvora, SolarScope, Zenity) are 100% removed. Replace with data specific to "${prompt}".
NO DEFAULT PLACEHOLDERS: Replace all "Example Brand", "Jane Doe", or generic addresses with contextual data relevant to "${prompt}".
NO "TECH DEMO" LEAKAGE: If a component is named "VortexPricing", do not assume the website is about "Vortex Energy" unless specified. Use the user's vision: "${prompt}".

BUILDING ENVIRONMENT & CONSTRAINTS:
- Framework: React 18, Vite, Tailwind CSS.
- Styling: STRICTLY Tailwind CSS only. NO inline styles (style={{}}).
- Icons: lucide-react (Premium icons). NEVER hallucinate icon names (e.g., NO 'Stitch', 'Leather', etc.).
- Animations: framer-motion.
- Composition: App.jsx handles the layout stack (Header -> Hero -> Sections -> Footer). Individual section files (in src/components/) should NOT render Header/Hero/Footer.

GOALS:
1. CONTEXTUAL FIDELITY: Every heading, paragraph, and image alt text MUST relate to "${prompt}".
2. ANTI-BRAINWASHING (CRITICAL): You will see references to other brands (Rivelon, Atelier, Qyvora, SolarScope, Zenity) in the provided design system or industry context. IGNORE THEM. 
   Your theme and ONLY theme is: "${prompt}". 
   DO NOT let generic luxury or tech branding leak into your copy. 
   If the prompt is about "Coffee", do not write about "Quantum Energy" or "Solar Solutions" just because the component had a tech demo name.
3. NO PLACEHOLDERS: Generate real, high-quality copy for the "${prompt}" industry.
4. COLOR HARMONY: Ensure the Tailwind color palette is consistent across ALL files. 
5. ERROR CORRECTION: If build errors are provided below, fix them SURGICALLY.
6. VISUAL WOW-FACTOR: 
   - Improve spacing (py-12 to py-24 for rhythm).
   - Add subtle entrance animations using Framer Motion (whileInView).

CONSTRAINTS:
- DO NOT change the file names or overall structure unless fixing a broken import.
- Output ONLY the files you modified.
- Wrap each updated file in <file path="path/to/file">...code...</file> tags.
- NO explanation text. NO markdown fences.

MULTI-PAGE POLISH RULES (if the project uses HashRouter/Routes):
- Each page should have distinct, page-specific content — do NOT duplicate the hero across pages.
- The Home page hero should be the strongest selling point for "${prompt}".
- Secondary pages (About, Pricing, Contact) should have focused, purposeful content.
- Navigation labels must be concise and clear (Home, About, Pricing — not "Our Amazing Homepage").
- Consistent color palette across ALL pages — no page should feel like a different site.
- Do NOT modify App.jsx routing structure, siteMap.js, or Route paths. Only polish visual content.

FINAL REMINDER: The user's goal is "${prompt}". Do not overwrite it with component brand names.
BUILD ERRORS/LOGS (If any):
${buildErrors || 'None - perform aesthetic optimizations and copy specialization only.'}
`;

    console.log(' [process] Sending request to LLM...');

    try {
        const startTime = Date.now();
        const result = await generateText({
            model: getModel(model),
            system: systemPrompt,
            prompt: `Perform a Final Polish on the following website files to perfectly match the vision of "${prompt}". Focus on specialization and premium aesthetics.\n\n${fileContext}`,
            temperature: 0,
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(` [success] LLM response received in ${duration}s`);

        const refinedFiles = parseFileBlocks(result.text);

        if (refinedFiles.length === 0) {
            console.log(' [warning] No files were modified during polish pass.');
            return files;
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
        return files; // Return originals on failure
    }
}
