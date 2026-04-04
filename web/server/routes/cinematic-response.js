import { generateText } from 'ai';
import { getModel } from '../lib/provider-helpers.js';
import { llmLog } from '../lib/llm-logger.js';

export default async function cinematicResponse(req, res) {
    try {
        const { prompt, model = 'google/gemini-3.1-pro-preview' } = req.body;

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ success: false, error: 'prompt is required' });
        }

        const systemPrompt = `You are a Digital Experience Architect. 
Translate the user's request into a short, high-fidelity architectural vision that precedes the final reveal.

STRICT REQUIREMENTS:
1. Write exactly ONE SHORT PARAGRAPH.
2. The paragraph MUST contain exactly 2 or 3 sentences.
3. Total word count: 50 to 70 words maximum.
4. DO NOT use any labels, headers, or bullet points.
5. TONE: Serious, technical, premium, and visionary.

Narrative:
Summarize the visual soul and the kinetic physics of the site build in a single, dense, sophisticated breath.`;

        console.log(`[cinematic-response] Synthesizing short architecture for: "${prompt}"`);
        llmLog.request('CINEMATIC', {
            model,
            systemPrompt,
            userPrompt: prompt,
            temperature: 0.75
        });

        const startMs = Date.now();
        let text = '';
        if (model.includes('openai/')) {
            const { generateFast } = await import('../lib/provider-helpers.js');
            text = await generateFast(
                systemPrompt,
                `Execute a 2-sentence architectural vision for: "${prompt}". Stay under 70 words.`
            );
        } else {
            const result = await generateText({
                model: getModel(model),
                system: systemPrompt,
                prompt: `Execute a 2-sentence architectural vision for: "${prompt}". Stay under 70 words.`,
                maxTokens: 1000,
                temperature: 0.75,
            });
            text = result.text;
        }

        llmLog.response('CINEMATIC', {
            response: text,
            durationMs: Date.now() - startMs
        });

        const cleanedResponse = text.trim();
        console.log(`[cinematic-response] LLM returned (${cleanedResponse.length} chars / ${cleanedResponse.split(' ').length} words).`);

        res.json({ success: true, response: cleanedResponse });
    } catch (error) {
        console.error('[cinematic-response] Error:', error.message || error);
        // Fallback response if the LLM fails so the transition doesn't break
        res.json({
            success: true,
            response: "Architecting a premium, high-performance layout with dynamic visuals and precise typography."
        });
    }
}
