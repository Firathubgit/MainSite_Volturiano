import { generateObject } from 'ai';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { getModel } from '../lib/provider-helpers.js';
import { buildSelectionCodeAsync, getCatalogForPromptAsync, getCategoriesAsync, getBundleAsync, preflightBundleAssets } from '../lib/registry/registry.js';

import appConfig from '../config/app.config.js';

// ─── Schema for structured LLM output ─────────────────────
const selectedComponentSchema = z.object({
    componentId: z.string().describe('Exact component ID from the catalog, e.g. "hero.video.aurora.v1"'),
    confidence: z.number().min(0).max(1).describe('How well this component matches the user request (0-1)'),
    reason: z.string().describe('Why this component was selected'),
    propsOverrides: z.record(z.string()).optional().describe('Prop values to customize (strings only)'),
    fallbackAllowed: z.boolean().describe('Whether to fall back to LLM generation if asset preflight fails'),
});

const selectionResultSchema = z.object({
    selections: z.array(selectedComponentSchema).describe('Premium components selected for this request'),
    reasoning: z.string().describe('Overall reasoning for the selection strategy'),
    customComponentsNeeded: z.array(z.string()).describe('Description of components that need LLM generation (not covered by catalog)'),
});

/**
 * POST /api/select-components
 */
export default async function selectComponents(req, res) {
    const { prompt, model = 'openai/gpt-4o', overrides = {}, imageDescriptions = [], designSystem = null, buildId, premiumMode = 'hybrid' } = req.body;
    console.log(`[select-components] ROUTE HIT | BuildId: ${buildId} | Model: ${model} | PremiumMode: ${premiumMode}`);

    // STRICTURE: If premium mode is OFF, do not even touch the Supabase components table
    if (premiumMode === 'off') {
        console.log('[select-components] Premium Mode is OFF. Bypassing Supabase and returning empty selection.');
        return res.json({
            success: true,
            selection: {
                selections: [],
                reasoning: 'Premium Mode is OFF - Strictly using LLM generation.',
                customComponentsNeeded: ['Entire page structure'],
            }
        });
    }

    try {
        if (!prompt) {
            return res.status(400).json({ success: false, error: 'prompt is required' });
        }

        const selectionConfig = appConfig.selection || {};
        const adaptationThreshold = selectionConfig.adaptationThreshold || 0.55;
        const maxItems = selectionConfig.maxCatalogItemsInPrompt || 80;

        // 1. Fetch categories and components from Supabase
        console.log('[select-components] Fetching catalog and categories for LLM selection...');
        const [categories, catalog] = await Promise.all([
            getCategoriesAsync(),
            getCatalogForPromptAsync([], maxItems)
        ]);

        console.log(`[select-components] Supabase SUCCESS: Found ${catalog.components.length} components and ${categories.length} categories.`);
        console.log(`[select-components] Filtering and building prompt for: "${prompt.substring(0, 80)}..."`);

        // Build vision context if images provided
        const imageContext = imageDescriptions.length > 0
            ? `\n\nUser also provided these visual references:\n${imageDescriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
            : '';

        // Extract explicitly requested components from the prompt
        const explicitMatch = prompt.match(/EXPLICIT_COMPONENTS:\s*\[(.*?)\]/i);
        const explicitNames = explicitMatch && explicitMatch[1]
            ? explicitMatch[1].split(',').map(s => s.trim().replace(/['"`]/g, '')).filter(Boolean)
            : [];

        if (explicitNames.length > 0) {
            console.log(`[select-components] 🎯 Explicit components detected: ${explicitNames.join(', ')}`);
        }

        const mandatoryRule = explicitNames.length > 0
            ? `\n\n🎯 MANDATORY SELECTION (CRITICAL):\nThe user has EXPLICITLY requested these components by name: ${explicitNames.join(', ')}.\nYou MUST find and include them in your selections if they exist in the catalog above. Search by name (case-insensitive). Their confidence should be 1.0.`
            : '';

        console.log(`[select-components] Sending request to LLM (Model: ${model})...`);
        const result = await generateObject({
            model: getModel(model),
            schema: selectionResultSchema,
            messages: [
                {
                    role: 'system',
                    content: `You are a premium UI component selector.
CATEGORIES: ${JSON.stringify(categories.map(cat => ({ slug: cat.slug, name: cat.name, description: cat.description })))}
CATALOG: ${JSON.stringify(catalog.components)}

DESIGN SYSTEM FOR THIS PROJECT:
${designSystem ? JSON.stringify(designSystem, null, 2) : "None provided"}

COMPONENT SELECTION INTELLIGENCE:
For each component in the catalog, use these high-fidelity fields:
- visualDescription: Exact visual appearance and layout details.
- suitableFor: Specific industries or use cases it excels in.
- moodTone: The emotional and aesthetic vibe (e.g., "cinematic", "utilitarian").
- colorProfile: Mode (dark/light) and warmth.

YOUR DECISION PROCESS:
1. IDENTIFY CATEGORIES: Based on the user prompt, determine which categories are required (e.g., Header, Hero, Features, Pricing, Footer).
2. MATCH INDUSTRY/SUTIABILITY: Use 'suitableFor' to find components that align with the project's purpose.
3. ALIGN AESTHETICS: Match 'moodTone' and 'visualDescription' to the user's intent.
4. COORDINATE DESIGN: Ensure all selected components have a cohesive 'colorProfile' and 'design_personality'.
5. SCORE CONFIDENCE: High confidence means a perfect match across functionality and aesthetics.

ANTI-PATTERN WARNING:
- Do NOT select a holographic glare grid for a bakery website
- Do NOT select a smoke flame hero for a children's education site
- Do NOT select a dark-mode component for a bright, cheerful brand
- MATCH the component to the website's purpose, not just its category

AUTHOR PROVENANCE:
- Each component has an 'authorType' field: 'official' (curated by Volturiano team) or 'community' (user-submitted).
- Community components with high 'qualityScore' (>= 8) and 'ratingAvg' (>= 4) are production-grade.
- Prefer official components when confidence is equal, but do not exclude high-quality community components.
${mandatoryRule}

RULES: Maximize premium components. Confidence >= ${adaptationThreshold}.`,
                },
                {
                    role: 'user',
                    content: `Build a website based on this request:\n\n${prompt}${imageContext}`,
                },
            ],
        });

        const selection = result.object;
        console.log(`[select-components] LLM selection complete. Selected ${selection.selections.length} components.`);
        selection.selections.forEach((s, i) => {
            console.log(`  ${i + 1}. [${s.componentId}] Confidence: ${s.confidence} | Reason: ${s.reason}`);
        });

        if (selection.customComponentsNeeded?.length > 0) {
            console.log(`[select-components] LLM also requested ${selection.customComponentsNeeded.length} custom components.`);
        }

        res.json({ success: true, selection });

    } catch (error) {
        console.error('[select-components] CRITICAL ERROR:', error);
        if (error.stack) console.error(error.stack);

        const isOverloaded = error.name === 'AI_RetryError' || error.message?.includes('maxRetriesExceeded') || error.message?.includes('429') || error.message?.includes('503') || error.message?.includes('overload') || error.message?.includes('high demand');
        
        if (isOverloaded) {
            return res.status(503).json({
                success: false,
                error: 'AI Provider is currently experiencing high demand. Please try again later.'
            });
        }

        res.json({
            success: true,
            selection: {
                selections: [],
                reasoning: `Selection failed (${error.message}), falling back to full LLM generation`,
                customComponentsNeeded: ['Full page'],
            }
        });
    }
}
