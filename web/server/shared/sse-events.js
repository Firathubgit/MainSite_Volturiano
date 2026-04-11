/**
 * SSE Event Contracts for Volturiano Builder
 * Combines typed technical events with AI-narrated conversational updates
 */

import { generateText } from 'ai';
import { getModel, generateFast } from '../lib/provider-helpers.js';
import { resolveLightweightModel } from '../lib/llm-lightweight.js';

// ─── Technical Event Contracts ───────────────────────────────────────
export const SSE_EVENTS = {
    // Build Lifecycle
    PLAN_STARTED: 'plan_started',
    APPLY_STARTED: 'apply_started',
    FILE_WRITTEN: 'file_written',
    VERIFY_STARTED: 'verify_started',
    VERIFY_PASSED: 'verify_passed',
    VERIFY_FAILED: 'verify_failed',
    REPAIR_STARTED: 'repair_started',
    REPAIR_DONE: 'repair_done',
    POLISH_STARTED: 'polish_started',
    POLISH_DONE: 'polish_done',
    ROLLBACK_STARTED: 'rollback_started',
    ROLLBACK_DONE: 'rollback_done',
    COMPLETE: 'complete',

    // AI Conversational Events (NEW)
    AI_THINKING: 'ai_thinking',      // AI is reasoning about the request
    AI_MESSAGE: 'ai_message',        // AI narrates what it's doing
    AI_THOUGHT: 'ai_thought',        // Shows internal reasoning (optional)

    // Progress
    PROGRESS: 'progress',

    // System
    ERROR: 'error',
    WARNING: 'warning',
    KEEPALIVE: 'keepalive'
};

// ─── Event Payload Schemas ───────────────────────────────────────
export const EVENT_SCHEMAS = {
    [SSE_EVENTS.PLAN_STARTED]: {
        buildId: 'string',
        prompt: 'string'
    },
    [SSE_EVENTS.APPLY_STARTED]: {
        buildId: 'string',
        files: 'number',
        components: 'array'
    },
    [SSE_EVENTS.FILE_WRITTEN]: {
        path: 'string',
        size: 'number'
    },
    [SSE_EVENTS.VERIFY_STARTED]: {
        cmd: 'string'
    },
    [SSE_EVENTS.VERIFY_PASSED]: {
        durationMs: 'number'
    },
    [SSE_EVENTS.VERIFY_FAILED]: {
        excerpt: 'string',
        logs: 'string'
    },
    [SSE_EVENTS.REPAIR_STARTED]: {
        strategy: 'string',
        files: 'array'
    },
    [SSE_EVENTS.REPAIR_DONE]: {
        changed: 'array'
    },
    [SSE_EVENTS.ROLLBACK_DONE]: {
        filesRestored: 'number'
    },
    [SSE_EVENTS.COMPLETE]: {
        filesCreated: 'array',
        verified: 'boolean',
        durationMs: 'number'
    },
    // AI Events
    [SSE_EVENTS.AI_THINKING]: {
        stage: 'string',        // "analyzing", "planning", "designing"
        durationMs: 'number?'   // optional elapsed time
    },
    [SSE_EVENTS.AI_MESSAGE]: {
        message: 'string',      // Natural language narration
        context: 'object?',     // Optional structured data
        style: 'string?'        // "casual", "technical", "excited"
    },
    [SSE_EVENTS.AI_THOUGHT]: {
        thought: 'string'       // Internal reasoning (like ChatGPT)
    },
    [SSE_EVENTS.PROGRESS]: {
        current: 'number',
        total: 'number',
        item: 'string'
    }
};

// ─── SSE Writer Utility ───────────────────────────────────────
export class SSEWriter {
    constructor(res, onHeartbeat = null) {
        this.res = res;
        this.onHeartbeat = onHeartbeat;
        this.lastPing = Date.now();
        this.startKeepalive();
    }

    /**
     * Send typed event with validation
     */
    send(eventType, payload = {}) {
        try {
            const data = {
                event: eventType,
                timestamp: Date.now(),
                ...payload
            };

            // Write both as `event:` and in `data:` for compatibility
            this.res.write(`event: ${eventType}\n`);
            this.res.write(`data: ${JSON.stringify(data)}\n\n`);
            this.lastPing = Date.now();
        } catch (e) {
            console.error('[SSEWriter] Send failed:', e.message);
        }
    }

    /**
     * Send AI-narrated conversational message
     */
    aiMessage(message, context = {}, style = 'casual') {
        this.send(SSE_EVENTS.AI_MESSAGE, { message, context, style });
    }

    /**
     * Show AI thinking indicator
     */
    aiThinking(stage = 'analyzing') {
        this.send(SSE_EVENTS.AI_THINKING, { stage });
    }

    /**
     * Show AI internal thought (like ChatGPT's reasoning)
     */
    aiThought(thought) {
        this.send(SSE_EVENTS.AI_THOUGHT, { thought });
    }

    /**
     * Send keepalive ping every 15s
     */
    startKeepalive() {
        this.keepaliveInterval = setInterval(() => {
            if (Date.now() - this.lastPing > 15000) {
                try {
                    this.res.write(': keepalive\n\n');
                    this.lastPing = Date.now();
                    if (this.onHeartbeat) this.onHeartbeat();
                } catch (e) {
                    clearInterval(this.keepaliveInterval);
                }
            }
        }, 15000);
    }

    /**
     * Close stream and cleanup
     */
    end() {
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
        }
        try {
            this.res.end();
        } catch (e) {
            // Already closed
        }
    }
}

// ─── AI Narrator ───────────────────────────────────────────
/**
 * Generates conversational AI messages for build stages
 */
export class AIBuildNarrator {
    constructor() {
        // Narration uses the same lightweight routing as polish fillers (mini / flash / haiku),
        // keyed off the user's selected build model — not a hardcoded OpenAI mini.
    }

    /**
     * Generate natural language explanation of what's happening
     * @param {string} stage
     * @param {object} context
     * @param {{ buildModelId?: string }} [options] — e.g. anthropic/claude-sonnet-4-6 → Haiku narration
     */
    async narrate(stage, context = {}, options = {}) {
        const buildModelId = options.buildModelId || 'google/gemini-3.1-pro-preview';
        const lm = resolveLightweightModel(buildModelId);

        const prompts = {
            planning: `You're building a website. The user asked: "${context.prompt}". 
You've analyzed it and will create ${context.componentCount} components.
Write a brief, friendly 1-2 sentence message explaining what you're about to build. Be specific about the design style you chose. Like: "I'll create a sleek SaaS landing page with deep navy tones and clean geometric typography."`,

            thinking: `The user asked: "${context.prompt}". Think for a moment about the best approach. What design system fits? What components are needed? Write 1 sentence of internal reasoning.`,

            installing: `You're installing dependencies: ${context.packages?.join(', ')}. Write a quick 1-sentence casual explanation of why these are needed.`,

            applying: `You're ${context.isEdit ? 'updating' : 'creating'} ${context.filesCount} files. Write a 1-sentence update.`,

            building: `You're generating component "${context.componentName}" (${context.current}/${context.total}). Write a 1-sentence update about what this component does.`,

            verifying: `Build verification ${context.passed ? 'passed' : 'failed'}. ${context.passed ? 'Write a brief celebratory message.' : 'Write a brief message explaining what went wrong in simple terms.'}`,

            repairing: `You're auto-repairing using strategy: "${context.strategy}". Fixed ${context.filesFixed} files. Explain briefly what was fixed.`,

            repair_success: `Auto-repair succeeded! Write a brief excited message.`,

            polishing: `You're performing a "Final Polish" on the website. You're specialized the text, titles, and colors to perfectly match the user's niche prompt: "${context.prompt}". Explain that you're adding those final premium touches.`,

            polish_success: `The final polish is complete! Everything looks perfect. Write a brief professional confirmation.`,

            rollback: `Build failed and repair failed. Rolling back to previous state. Write a brief apologetic message.`,

            complete: `The website is live! ${context.filesCreated} files created. Write an enthusiastic 1-2 sentence summary of what was built, including key features.`
        };

        try {
            const systemPrompt = `You are the Volturiano Builder AI. You narrate the build process conversationally. Keep messages:
- Brief (1-2 sentences max)
- Casual and friendly
- Specific (mention actual components/colors/features)
- Enthusiastic but not over-the-top
NO markdown, NO emojis unless it's the final celebration.`;

            const userContent = prompts[stage] || `Describe what you're doing: ${stage}`;
            let text = '';

            if (lm.useFast) {
                text = await generateFast(systemPrompt, userContent);
            } else {
                const res = await generateText({
                    model: getModel(lm.id),
                    system: systemPrompt,
                    prompt: userContent,
                    maxTokens: 120,
                    temperature: 0.7
                });
                text = res.text || '';
            }

            const trimmed = (text || '').trim();
            if (trimmed) return trimmed;
            return this.getFallbackMessage(stage, context);
        } catch (e) {
            console.error('[AIBuildNarrator] Error:', e.message);
            return this.getFallbackMessage(stage, context);
        }
    }

    /**
     * Fallback messages if LLM fails
     */
    getFallbackMessage(stage, context) {
        const fallbacks = {
            planning: `Planning ${context.componentCount || 0} components for your project...`,
            thinking: `Analyzing the design approach...`,
            installing: `Installing ${context.packages?.length || 0} dependencies...`,
            applying: `Applying ${context.filesCount} files...`,
            building: `Building ${context.componentName}...`,
            verifying: context.passed ? `Build verified successfully!` : `Build verification encountered issues.`,
            repairing: `Auto-repairing build issues...`,
            repair_success: `Repair successful!`,
            rollback: `Rolling back to valid state...`,
            polishing: `Applying final polish to match your vision...`,
            polish_success: `Polish complete — your preview is ready.`,
            complete: `Your project is ready with ${context.filesCreated} files!`
        };
        return fallbacks[stage] || `Working on ${stage}...`;
    }
}
