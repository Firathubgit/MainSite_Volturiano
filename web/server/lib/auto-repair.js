
import { generateText } from 'ai';
import { getModel } from './provider-helpers.js';

/**
 * Attempts to repair build errors using Gemini.
 * 
 * @param {object} context
 * @param {Array} context.files - Current list of files in the sandbox.
 * @param {string} context.buildErrors - Logs from the failed build.
 * @param {Array} context.repairLog - Previous repair attempts to avoid loops.
 * @returns {Promise<{success: boolean, fixedFiles: Array, strategy: string}>}
 */
export async function attemptRepair({ files, buildErrors, repairLog = [] }) {
    console.log('[auto-repair] Analyzing build errors with Gemini...');

    // Don't send huge file contents to the LLM if they are not relevant, 
    // but for context, we send the file structure and code lengths. 
    // We send full code of src/ files to let it propose exact replacements.
    const fileContext = files
        .filter(f => f.path.startsWith('src/'))
        .map(f => `--- ${f.path} ---\n${f.content}\n-------------------`)
        .join('\n\n');

    const previousRepairs = repairLog.length > 0
        ? `PREVIOUS EXPERIMENT LOG:\n${repairLog.map((log, i) => `Attempt ${i + 1}: ${log.strategy}`).join('\n')}\nDO NOT REPEAT THESE STRATEGIES.`
        : '';

    const systemPrompt = `You are an expert React/Vite debugging AI.
A build or runtime error occurred in the user's sandbox.

BUILD/RUNTIME ERROR LOGS:
${buildErrors.substring(0, 3000)}

${previousRepairs}

CURRENT SOURCE FILES:
${fileContext.substring(0, 50000)}

Your job is to fix the error. Return a JSON object with:
{
  "success": true, 
  "strategy": "Describe exactly what you are fixing and how",
  "fixedFiles": [
    { "path": "src/App.jsx", "content": "fully rewritten code here..." }
  ]
}

If the error is impossible to fix (e.g. related to sandbox infrastructure), return {"success": false, "strategy": "Unfixable Infrastructure Error"}.

CRITICAL RULES:
1. DO NOT invent new imports that are not available.
2. MISSING IMPORTS: If it's a "Failed to resolve import" or "Cannot find module" error, you MUST either remove the import or implement the missing component in a new file.
3. SYNTAX ERRORS: If it's a syntax error (e.g., unexpected token), fix the syntax precisely.
4. REACT HOOKS: If it's a "Hooks can only be called inside the body of a function component" error, ensure you are not calling hooks conditionally or outside a component.
5. TAILWIND/CSS: If it's a CSS module or PostCSS error, simplify the CSS or remove invalid Tailwind classes.
6. EXPORTS: If it's "does not provide an export named X", verify the export exists or change the import to default/named as appropriate.
7. Output ONLY valid JSON, no markdown blocks.`;

    try {
        const model = getModel('google/gemini-2.5-flash');

        const { text } = await generateText({
            model,
            system: systemPrompt,
            prompt: 'Analyze the build errors above and return the JSON fix object.',
            temperature: 0.2,
        });

        // Strip markdown fences if Gemini wraps the JSON
        let jsonText = text.trim();
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        const result = JSON.parse(jsonText);

        if (result.success && result.fixedFiles && result.fixedFiles.length > 0) {
            console.log(`[auto-repair] Gemini proposed strategy: ${result.strategy}`);
            return {
                success: true,
                fixedFiles: result.fixedFiles,
                strategy: result.strategy
            };
        }

        return { success: false, strategy: result.strategy || 'LLM could not resolve issue' };

    } catch (e) {
        console.error('[auto-repair] Gemini repair failed:', e);
        return { success: false, strategy: 'Repair engine failed' };
    }
}
