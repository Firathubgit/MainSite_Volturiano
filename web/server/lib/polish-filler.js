/**
 * Polish Filler — Async interim message generator
 *
 * Fires lightweight, contextually-aware LLM messages every 25-35 seconds
 * while the main polish step is waiting for a heavy model response.
 * Completely independent from the polish execution.
 *
 * Uses the same lightweight model pattern as enhance-prompt and cinematic-response:
 *   google/*    → gemini-2.5-flash
 *   openai/*    → gpt-5.4-mini  (via generateFast)
 *   anthropic/* → claude-haiku-4-5-20251001
 */

import { generateText } from 'ai';
import { getModel, generateFast } from './provider-helpers.js';

// ─── Lightweight model resolver (mirrors enhance-prompt.js exactly) ──
function getLightweightModel(model) {
    if (model.includes('openai/')) return { id: 'openai/gpt-5.4-mini', useFast: true };
    if (model.includes('anthropic/')) return { id: 'anthropic/claude-haiku-4-5-20251001', useFast: false };
    return { id: 'google/gemini-2.5-flash', useFast: false }; // Default: gemini flash
}

// ─── 4 rotating message angles ──────────────────────────────────────────
// Each fires contextually in sequence so messages feel like a natural
// progression rather than repeated unrelated loading thoughts.
const FILLER_ANGLES = [
    'contextual_progress',  // what's actively being refined in the content
    'design_attention',     // a specific visual/craft detail being calibrated
    'near_completion',      // subtle promise that the result is worth the wait
    'final_moments',        // quiet confidence — nearly done
];

function buildFillerPrompt(prompt, angleIndex, previousMessages) {
    const angle = FILLER_ANGLES[angleIndex % FILLER_ANGLES.length];

    const prevContext = previousMessages.length > 0
        ? `\n\nPrevious messages already sent (DO NOT repeat these themes or phrases):\n${previousMessages.map((m, i) => `${i + 1}. "${m}"`).join('\n')}`
        : '';

    const angleInstructions = {
        contextual_progress: `Write about what is actively being refined right now in the website content — the specific copy, headlines, or section being perfected for this project. Be specific to their niche.`,
        design_attention:    `Write about a specific visual or design detail being carefully calibrated — typography weight, color harmony, spacing, or the premium feel of a specific component. Sound like a craftsman at work.`,
        near_completion:     `Write something that makes the user feel the result is going to be worth the wait — a subtle promise of the quality about to be revealed. Reference what kind of website they're building.`,
        final_moments:       `Write one brief, calm, confident sentence. The work is nearly complete. Like a painter stepping back to look at the canvas one last time.`,
    };

    return `You are the Volturiano Builder AI, narrating the final phase of a website build.
The user's website vision: "${prompt}"

Context: The code files have all been written. Right now an AI model is performing a final pass — personalizing every word, color, and design detail specifically for this project. This is a slow but crucial step.

Your task: ${angleInstructions[angle]}

STRICT RULES:
- MAX 1-2 sentences. Never more.
- NO emojis, NO markdown, NO formatting.
- Sound human, natural, and specific to their project — never generic.
- Do NOT say "I'm working on..." or "I am..." — start with a verb or direct observation.
- Do NOT use the phrase "final polish" — that's obvious to no one here.
- Do NOT sound like a loading screen spinner. Sound like a thoughtful developer narrating their craft.
- Be casual but premium. Like a senior engineer quietly doing their best work.
${prevContext}

Write only the message, nothing else.`;
}

// ─── Single filler call (matches enhance-prompt.js pattern) ─────────────
async function generateFillerMessage(modelInfo, fillerPrompt) {
    const { id, useFast } = modelInfo;
    try {
        if (useFast) {
            // OpenAI path — uses generateFast (Responses API, gpt-5.4-mini)
            return await generateFast(
                'You are the Volturiano Builder AI. Generate brief, natural progress messages.',
                fillerPrompt
            );
        }

        // Anthropic + Google path — standard AI SDK
        const result = await generateText({
            model: getModel(id),
            prompt: fillerPrompt,
            maxTokens: 80,
            temperature: 0.85, // Slightly higher for natural variation between messages
        });
        return result.text?.trim() || null;
    } catch (e) {
        console.warn(`[PolishFiller] ${id} call failed (non-fatal):`, e.message);
        return null;
    }
}

// ─── Main export ─────────────────────────────────────────────────────────
/**
 * Runs async filler messages during the heavy polish LLM wait.
 * Call alongside runPolishStep() — stops automatically via cancelToken.
 *
 * @param {Object} options
 * @param {string}   options.model       - The user's selected heavy model (e.g. "anthropic/claude-sonnet-4-6")
 * @param {string}   options.prompt      - The original user prompt
 * @param {Function} options.onMessage   - Callback: (message: string) => void
 * @param {Object}   options.cancelToken - Mutable ref: { cancelled: false }
 */
export async function runPolishFillers({ model, prompt, onMessage, cancelToken }) {
    const modelInfo = getLightweightModel(model);
    const sentMessages = [];
    let angleIndex = 0;

    console.log(`[PolishFiller] Starting. Using lightweight model: ${modelInfo.id}`);

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    let lastInterval = 0;
    // Range: 47s - 72s. Implements "anti-periodic" logic: if the last delay was at the 
    // bottom end, we push this one towards the top end (and vice-versa) to ensure 
    // the chat doesn't feel like a recurring heartbeat.
    const getNextDelay = () => {
        const min = 47000;
        const max = 72000;
        const mid = 59500;
        let current = Math.floor(Math.random() * (max - min + 1)) + min;

        if (lastInterval > 0) {
            // If current random pick is too close to the last one (within 15s),
            // shift it by ~20s in the opposite direction of the last interval's position.
            if (Math.abs(current - lastInterval) < 15000) {
                if (lastInterval < mid) {
                    current = Math.min(max, current + 20000);
                } else {
                    current = Math.max(min, current - 20000);
                }
            }
        }

        lastInterval = current;
        return current;
    };

    const MAX_FILLERS = 6; // Safety cap — polish should resolve well before this

    await delay(getNextDelay());

    while (!cancelToken.cancelled && angleIndex < MAX_FILLERS) {
        const fillerPrompt = buildFillerPrompt(prompt, angleIndex, sentMessages);
        const message = await generateFillerMessage(modelInfo, fillerPrompt);

        // Check cancelToken again after the await — polish may have finished while generating
        if (cancelToken.cancelled) break;

        if (message) {
            sentMessages.push(message);
            onMessage(message);
            console.log(`[PolishFiller] Sent filler #${angleIndex + 1}: "${message.substring(0, 70)}..."`);
        }

        angleIndex++;
        await delay(getNextDelay());
    }

    console.log(`[PolishFiller] Done. Sent ${sentMessages.length} filler message(s).`);
}
