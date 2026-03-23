// server/routes/community/suggest-fix.js
// AI-powered code fix suggestion for preview errors
// Uses the same AI infrastructure as the rest of the builder

import { generateText } from 'ai';
import { getModel } from '../../lib/provider-helpers.js';

const SYSTEM_PROMPT = `You are a React component fixer. You receive a React component's source code and an error message from a live preview.

Your job is to fix the code so it renders without errors in a standalone preview (no props are passed — the component must work with default/fallback values).

Rules:
1. Return ONLY the fixed code — no explanations, no markdown fences, no commentary.
2. If the component expects props, add sensible defaults using destructuring with defaults or a fallback inside the function body.
3. For arrays, default to a reasonable demo array. For functions, default to no-op.
4. Do NOT change the component's visual design, only fix runtime errors.
5. Keep all imports exactly as they are.
6. The code must have \`export default\`.
7. Common fixes:
   - "Cannot read properties of undefined (reading 'map')" → add default empty array or demo data
   - "X is not defined" → add missing import or declare the variable
   - "Cannot read properties of null" → add null checks
   - Props destructuring without defaults → add defaults`;

export default async function suggestFix(req, res) {
    const { code, error: errorMessage, stage, line, model: requestedModel } = req.body;

    if (!code || !errorMessage) {
        return res.status(400).json({ success: false, error: 'Code and error message required' });
    }

    // Use requested model, fallback to 3.1-pro
    const model = getModel(requestedModel || 'google/gemini-3.1-pro');

    try {
        const prompt = `Fix this React component. It crashes with this error in the preview:

ERROR: ${errorMessage}
${stage ? `Stage: ${stage}` : ''}
${line ? `Line: ${line}` : ''}

SOURCE CODE:
${code}

Return ONLY the fixed source code, nothing else. No markdown, no explanations.`;

        const { text } = await generateText({
            model,
            system: SYSTEM_PROMPT,
            prompt,
            maxTokens: 4096,
            temperature: 0.1,
        });

        // Clean up: strip markdown fences if the model added them
        let fixedCode = text.trim();
        if (fixedCode.startsWith('```')) {
            fixedCode = fixedCode.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
        }

        console.log(`[suggest-fix] Fixed code for error: "${errorMessage.substring(0, 60)}..."`);

        return res.json({
            success: true,
            fixedCode,
            originalError: errorMessage,
        });
    } catch (err) {
        console.error('[suggest-fix] AI error:', err.message);
        return res.status(500).json({
            success: false,
            error: 'AI suggestion failed: ' + err.message,
        });
    }
}
