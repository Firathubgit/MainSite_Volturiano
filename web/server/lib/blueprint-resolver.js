// Phase S7: Blueprint Resolver — Core intelligence module
// Resolves user prompts to website type blueprints (preset or AI-generated)
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from './provider-helpers.js';
import { supabaseAdmin } from './supabase-admin.js';
import { resolveModelRole } from '../shared/model-registry.js';

const sb = supabaseAdmin;

/**
 * Resolve a user prompt to a website type blueprint.
 * Step 1: Keyword matching against 100 presets
 * Step 2: AI dynamic generation if no confident match
 */
export async function resolveBlueprint(prompt, options = {}) {
    console.log(`[blueprint-resolver] Resolving: "${prompt.substring(0, 80)}..."`);

    // Step 1: Keyword matching
    const presetResult = await matchPresetBlueprint(prompt);
    if (presetResult && presetResult.confidence >= 0.6) {
        console.log(`[blueprint-resolver] Preset match: ${presetResult.blueprint.slug} (confidence: ${presetResult.confidence.toFixed(2)})`);
        return { blueprint: presetResult.blueprint, source: 'preset', confidence: presetResult.confidence };
    }

    // Step 2: AI dynamic generation
    console.log('[blueprint-resolver] No confident preset match, generating dynamic blueprint...');
    try {
        const dynamicResult = await generateDynamicBlueprint(prompt);
        console.log(`[blueprint-resolver] Dynamic blueprint generated: ${dynamicResult.slug}`);
        return { blueprint: dynamicResult, source: 'ai-generated', confidence: dynamicResult.generation_confidence || 0.7 };
    } catch (err) {
        console.error('[blueprint-resolver] Dynamic generation failed:', err.message);
        // Fallback: return best preset even if low confidence
        if (presetResult) {
            console.log(`[blueprint-resolver] Falling back to best preset: ${presetResult.blueprint.slug}`);
            return { blueprint: presetResult.blueprint, source: 'preset', confidence: presetResult.confidence };
        }
        throw err;
    }
}

/**
 * Match prompt against preseeded blueprints via keyword overlap
 */
async function matchPresetBlueprint(prompt) {
    const { data: blueprints, error } = await sb.from('website_type_blueprints')
        .select('*').eq('is_active', true);
    if (error || !blueprints?.length) return null;

    const tokens = prompt.toLowerCase().split(/[\s,.\-!?;:'"()]+/).filter(t => t.length > 2);

    let bestMatch = null;
    let bestScore = 0;

    for (const bp of blueprints) {
        const keywords = bp.prompt_keywords || [];
        let overlap = 0;
        for (const kw of keywords) {
            const kwLower = kw.toLowerCase();
            if (tokens.some(t => kwLower.includes(t) || t.includes(kwLower))) {
                overlap++;
            }
        }
        if (overlap === 0) continue;

        // Score = overlap ratio * 0.7 + normalized popularity * 0.3
        const overlapRatio = overlap / Math.max(keywords.length, 1);
        const popNorm = (bp.popularity_score || 5) / 10;
        const score = overlapRatio * 0.7 + popNorm * 0.3;

        if (score > bestScore) {
            bestScore = score;
            bestMatch = bp;
        }
    }

    if (!bestMatch) return null;
    return { blueprint: bestMatch, confidence: bestScore };
}

/**
 * Generate a dynamic blueprint using AI when no preset matches
 */
async function generateDynamicBlueprint(prompt) {
    // Fetch available categories and themes for the AI's context
    const [{ data: categories }, { data: themes }] = await Promise.all([
        sb.from('component_categories').select('slug, display_name, description').is('parent_id', null).eq('is_active', true),
        sb.from('color_themes').select('slug, name, mode, warmth').eq('is_active', true),
    ]);

    const categoryList = (categories || []).map(c => `- ${c.slug}: ${c.display_name} — ${c.description}`).join('\n');
    const themeList = (themes || []).map(t => `- ${t.slug}: ${t.name} (${t.mode}, ${t.warmth})`).join('\n');

    const schema = z.object({
        slug: z.string().describe('URL-safe slug for this blueprint, e.g. "marine-research-portal"'),
        name: z.string().describe('Human-readable name'),
        description: z.string().describe('Brief description of this website type'),
        required_categories: z.array(z.string()).describe('Required category slugs from the available list'),
        optional_categories: z.array(z.string()).describe('Optional category slugs'),
        recommended_component_count: z.number().describe('Ideal number of components (4-12)'),
        default_color_mode: z.enum(['dark', 'light', 'mixed']),
        default_color_theme: z.string().describe('A color theme slug from the available themes'),
        default_typography: z.enum(['modern-sans', 'serif', 'mono-tech']),
        primary_industries: z.array(z.string()).describe('Industry vertical slugs'),
        component_layout_order: z.array(z.string()).describe('Category slugs in display order'),
        generation_confidence: z.number().describe('Your confidence in this blueprint (0.0-1.0)'),
    });

    const systemPrompt = `You are a website architecture expert. Given a user's website description, assemble the perfect blueprint by selecting from available component categories, color themes, and industry verticals.

AVAILABLE CATEGORIES (select from these slugs):
${categoryList}

AVAILABLE COLOR THEMES:
${themeList}

RULES:
1. required_categories MUST include "header" and "footer" at minimum
2. Select 4-12 categories total based on what the website needs
3. component_layout_order should put header first, hero second, footer last
4. Choose the color theme that best fits the industry and mood
5. generation_confidence should reflect how well you understand the request (0.5-0.95)
6. slug must be lowercase, hyphenated, unique, and descriptive`;

    let result;
    try {
        result = await generateObject({
            model: getModel(resolveModelRole('componentSelection')),
            schema,
            system: systemPrompt,
            prompt: `Create a website blueprint for: "${prompt}"`,
            temperature: 0,
        });
    } catch (err) {
        console.warn('[blueprint-resolver] Gemini failed, trying fallback:', err.message);
        result = await generateObject({
            model: getModel(resolveModelRole('crossProviderFallbackFromGoogle')),
            schema,
            system: systemPrompt,
            prompt: `Create a website blueprint for: "${prompt}"`,
            temperature: 0,
        });
    }

    return {
        ...result.object,
        is_ai_generated: true,
        generated_from_prompt: prompt,
        is_active: true,
        prompt_keywords: prompt.toLowerCase().split(/[\s,.\-!?]+/).filter(t => t.length > 2),
        example_prompts: [prompt],
    };
}

/**
 * Persist a dynamically generated blueprint for future reuse
 */
export async function persistBlueprint(blueprint) {
    if ((blueprint.generation_confidence || 0) < 0.75) {
        console.log('[blueprint-resolver] Confidence too low to persist:', blueprint.generation_confidence);
        return null;
    }

    const { data, error } = await sb.from('website_type_blueprints')
        .upsert({
            slug: blueprint.slug,
            name: blueprint.name,
            description: blueprint.description,
            required_categories: blueprint.required_categories,
            optional_categories: blueprint.optional_categories || [],
            recommended_component_count: blueprint.recommended_component_count,
            default_color_mode: blueprint.default_color_mode,
            default_color_theme: blueprint.default_color_theme,
            default_typography: blueprint.default_typography,
            primary_industries: blueprint.primary_industries || [],
            prompt_keywords: blueprint.prompt_keywords || [],
            example_prompts: blueprint.example_prompts || [],
            component_layout_order: blueprint.component_layout_order || [],
            is_ai_generated: true,
            generated_from_prompt: blueprint.generated_from_prompt,
            generation_confidence: blueprint.generation_confidence,
            is_active: true,
        }, { onConflict: 'slug' })
        .select()
        .single();

    if (error) {
        console.error('[blueprint-resolver] Persist error:', error.message);
        return null;
    }
    console.log(`[blueprint-resolver] Persisted dynamic blueprint: ${blueprint.slug}`);
    return data;
}
