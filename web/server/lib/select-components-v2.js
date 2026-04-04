// select-components-v2.js — The ULTRA Pipeline (Phase S8)
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from './provider-helpers.js';
import { supabaseAdmin } from './supabase-admin.js';
import { llmLog } from './llm-logger.js';

const sb = supabaseAdmin;

// Smart Caching Strategy
const CACHE_TTL = {
    blueprints: 3600,       // 1 hour
    categories: 3600,       // 1 hour  
    verticals: 3600,        // 1 hour
    colorThemes: 3600,      // 1 hour
};

// In-memory cache
const cache = new Map();

async function cachedQuery(key, ttl, queryFn) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.time < ttl * 1000) {
        return cached.data;
    }
    const data = await queryFn();
    cache.set(key, { data, time: Date.now() });
    return data;
}

function normalizeToken(value = '') {
    return String(value || '').trim().toLowerCase();
}

function inferStructuralRole(component = {}) {
    const category = normalizeToken(component.category);
    const componentId = normalizeToken(component.component_id || component.id);
    const name = normalizeToken(component.name);
    const description = normalizeToken(component.description || component.visual_description || '');
    const haystack = `${category} ${componentId} ${name} ${description}`;

    if (/(^|\b)(header|navbar|navigation|topbar|menu)(\b|$)/.test(haystack)) return 'header';
    if (/(^|\b)(hero|masthead|splash|landing|banner)(\b|$)/.test(haystack)) return 'hero';
    if (/(^|\b)(footer|copyright|site-footer)(\b|$)/.test(haystack)) return 'footer';
    return 'feature';
}

function matchesCategoryHint(component = {}, categoryHint = '') {
    const hint = normalizeToken(categoryHint);
    if (!hint) return false;

    const category = normalizeToken(component.category);
    const componentId = normalizeToken(component.component_id || component.id);
    const name = normalizeToken(component.name);
    const description = normalizeToken(component.description || component.visual_description || '');
    const text = `${category} ${componentId} ${name} ${description}`;

    if (hint === 'header') return inferStructuralRole(component) === 'header';
    if (hint === 'hero') return inferStructuralRole(component) === 'hero';
    if (hint === 'footer') return inferStructuralRole(component) === 'footer';
    if (hint === 'testimonials') return /(testimonial|review|marquee)/.test(text);
    if (hint === 'services') return /(service|feature|offering|cards|grid)/.test(text);
    if (hint === 'booking') return /(booking|calendar|appointment|schedule)/.test(text);
    if (hint === 'pricing') return /(pricing|price|plan|tier)/.test(text);
    if (hint === 'gallery') return /(gallery|showcase|portfolio|carousel)/.test(text);
    if (hint === 'contact') return /(contact|form|inquiry|reach)/.test(text);
    if (hint === 'stats') return /(stat|metric|counter|kpi)/.test(text);
    if (hint === 'faq') return /(faq|question|accordion)/.test(text);
    return text.includes(hint);
}

function pickStructuredFallback(candidates = [], requiredCategories = [], explicitComponents = []) {
    const sorted = [...candidates].sort((a, b) => (b.computed_score || 0) - (a.computed_score || 0));
    const selected = [];
    const usedIds = new Set();
    const roleCount = { header: 0, hero: 0, footer: 0 };

    const tryAdd = (component) => {
        if (!component?.component_id || usedIds.has(component.component_id)) return false;
        const role = inferStructuralRole(component);
        if ((role === 'header' || role === 'hero' || role === 'footer') && roleCount[role] >= 1) return false;
        selected.push(component.component_id);
        usedIds.add(component.component_id);
        if (roleCount[role] !== undefined) roleCount[role] += 1;
        return true;
    };

    for (const explicit of explicitComponents) {
        const hit = sorted.find(c =>
            normalizeToken(c.component_id) === normalizeToken(explicit) ||
            normalizeToken(c.id) === normalizeToken(explicit) ||
            normalizeToken(c.name) === normalizeToken(explicit)
        );
        if (hit) tryAdd(hit);
    }

    ['header', 'hero', 'footer'].forEach(role => {
        const hit = sorted.find(c => inferStructuralRole(c) === role);
        if (hit) tryAdd(hit);
    });

    for (const cat of requiredCategories) {
        const hit = sorted.find(c => !usedIds.has(c.component_id) && matchesCategoryHint(c, cat));
        if (hit) tryAdd(hit);
    }

    const targetSize = Math.min(9, Math.max(6, requiredCategories.length + 1));
    for (const c of sorted) {
        if (selected.length >= targetSize) break;
        tryAdd(c);
    }

    return selected;
}

// Helper to wrap AI LLM logic for specific pipeline steps
const llm = {
    /**
     * AI Step 1: Match prompt against available blueprints
     */
    matchWebsiteType: async (prompt, designSystem, blueprints, aiModel = 'google/gemini-3.1-pro-preview') => {
        const schema = z.object({
            slug: z.string().describe('The slug of the best matching blueprint, or "" if no good match'),
            confidence: z.number().describe('Confidence score from 0.0 to 1.0. Use < 0.6 if it is a poor match for the user request.'),
            reasoning: z.string().describe('Why this blueprint matches or why none match well')
        });

        const list = blueprints.map(b => `- ${b.slug}: ${b.name} (${b.description})`).join('\n');

        const systemPrompt = `You are a master website architect. Match the user's website request to the closest available website type blueprint.
Available blueprints:
${list}

Return the slug of the best match and your confidence score. If no blueprint is a good fit, return a low confidence (< 0.6) so we can trigger a custom dynamic generation.
Important: A high confidence (>0.8) means the preset closely covers all the user's core needs.`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            llmLog.request('WEBSITE-TYPE', {
                model: aiModel,
                systemPrompt,
                userPrompt: prompt,
                schema,
                temperature: 0
            });

            const startMs = Date.now();
            const { object } = await generateObject({
                model: getModel(aiModel),
                schema,
                system: systemPrompt,
                prompt: `User Prompt: "${prompt}"\nDesign System Industry Context: ${designSystem?.industry || 'None'}`,
                temperature: 0,
                abortSignal: controller.signal
            });
            clearTimeout(timeoutId);

            llmLog.response('WEBSITE-TYPE', {
                response: object,
                durationMs: Date.now() - startMs
            });

            return object;
        } catch (e) {
            llmLog.error('WEBSITE-TYPE', e);
            console.warn('[Pipeline] LLM match failed, returning low confidence:', e.message);
            return { slug: '', confidence: 0 };
        }
    },

    /**
     * AI Step 3: Refine explicit category payload based on unique constraints 
     */
    refineCategories: async (prompt, designSystem, categoryDetails, blueprint, aiModel = 'google/gemini-3.1-pro-preview') => {
        const schema = z.object({
            refined_categories: z.array(z.string()).describe('Final list of exact category slugs to include'),
            reasoning: z.string().describe('Explain why you kept, added, or removed specific categories')
        });

        const list = categoryDetails.map(c => `- ${c.slug}: ${c.name} (${c.description})`).join('\n');
        const reqStr = blueprint.required_categories.join(', ');
        const optStr = (blueprint.optional_categories || []).join(', ');

        const systemPrompt = `You are a website architect finalizing the list of component categories needed for a website.
Based on the user's unique text prompt, prune unnecessary optional categories or add requested ones from the available list.
Do NOT remove core required categories unless explicitly countermanded by the prompt. Keep the final list focused (usually 5-10 items).

Website Type: ${blueprint.name}
Base Required Categories: ${reqStr}
Optional Categories Allowed: ${optStr}

Category Glossary Check (Only use existing slugs):
${list}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            llmLog.request('CATEGORY-REFINE', {
                model: aiModel,
                systemPrompt,
                userPrompt: prompt,
                schema,
                temperature: 0
            });

            const startMs = Date.now();
            const { object } = await generateObject({
                model: getModel(aiModel),
                schema,
                system: systemPrompt,
                prompt: `User Prompt: "${prompt}"\nRefine the categories to perfectly match this request.`,
                temperature: 0,
                abortSignal: controller.signal
            });
            clearTimeout(timeoutId);

            llmLog.response('CATEGORY-REFINE', {
                response: object,
                durationMs: Date.now() - startMs
            });

            return object.refined_categories;
        } catch (e) {
            llmLog.error('CATEGORY-REFINE', e);
            console.warn('[Pipeline] Refinement LLM failed, falling back to required categories:', e.message);
            return blueprint.required_categories;
        }
    },

    /**
     * AI Step 5: Final component selection from the top 30 filtered candidates
     */
    selectFinalComponents: async (prompt, designSystem, candidates, explicitComponents = [], requestedCategories = [], aiModel = 'google/gemini-3.1-pro-preview') => {
        const schema = z.object({
            selected_component_ids: z.array(z.string()).describe('List of component_ids chosen for the final build'),
            reasoning: z.string().describe('Explain why this particular mix of components was chosen')
        });

        const list = candidates.map(c => `- [QUALITY: ${c.quality_score || 5}/10] ${c.component_id}: ${c.name} (${c.visual_description || c.description}). Style: ${c.color_mode}, Warmth: ${c.color_warmth}`).join('\n');

        const explicitInprompt = explicitComponents.length > 0
            ? `\n\n🎯 MANDATORY SELECTION:\nThe user has EXPLICITLY requested these components. You MUST include them in your selected_component_ids array if they appear in the candidate list below:\n${explicitComponents.join(', ')}`
            : '';

        const systemPrompt = `You are a Master Website Architect. Pick the absolute best 5-11 components to construct a cohesive, multi-page website experience.
You have been provided with up to 50 highly-scored candidates that have already been vetted for quality and industry fit.${explicitInprompt}

CANDIDATES:
${list}

RULES:
1. QUALITY IS KING: A component with a high Quality Score (8, 9, 10) MUST heavily outweigh a theoretically "better fitting" component with a lower score. Always prioritize peak engineering and premium feel.
2. SHADER & INTERACTIVE BIAS: Strongly prefer Hero sections that feature WebGL, shaders, particle effects, or 3D interactive physics. If available and high-quality, select these over basic static designs.
3. Select exactly one component per requested category type whenever possible.
4. Ensure visual consistency (try to pick components with matching color_mode and warmth if indicated).
5. Do not select two "hero" components or two "footer" components unless they serve different pages (e.g. A massive homepage hero, and a smaller secondary hero).
6. Return only the EXACT component_ids from the list above.`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s instead of 15s to withstand load peaks

            llmLog.request('FINAL-SELECT', {
                model: aiModel,
                systemPrompt,
                userPrompt: prompt,
                schema,
                temperature: 0
            });

            const startMs = Date.now();
            const { object } = await generateObject({
                model: getModel(aiModel),
                schema,
                system: systemPrompt,
                prompt: `User Request: "${prompt}"\nDesign Context: ${JSON.stringify(designSystem)}\n\nSelect the best 5-11 components to build out all requested pages.`,
                temperature: 0,
                abortSignal: controller.signal
            });
            clearTimeout(timeoutId);

            llmLog.response('FINAL-SELECT', {
                response: object,
                durationMs: Date.now() - startMs
            });

            return object.selected_component_ids;
        } catch (e) {
            llmLog.error('FINAL-SELECT', e);
            console.warn('[Pipeline] Final selection LLM failed, using structured fallback selector:', e.message);
            const fallbackIds = pickStructuredFallback(candidates, requestedCategories, explicitComponents);
            console.log('[Pipeline] Structured fallback selected IDs:', fallbackIds);
            return fallbackIds;
        }
    },
    /**
     * AI Step 0: Match prompt against available community templates
     */
    matchTemplate: async (prompt, designSystem, templates, aiModel = 'google/gemini-3.1-pro-preview') => {
        console.log('[LLM matchTemplate] 🏗️ PIPELINE STEP 0a: TEMPLATE MATCHING ════════════════════════════════');
        console.log('[LLM matchTemplate] 🧠 Called with', templates.length, 'templates');
        console.log('[LLM matchTemplate] User prompt (first 100 chars):', prompt?.substring(0, 100));

        const schema = z.object({
            template_id: z.string().describe('The id of the best matching template, or "" if no good match'),
            confidence: z.number().describe('Confidence 0.0-1.0. Use >= 0.75 only if the template is an excellent structural fit'),
            reasoning: z.string().describe('Why this template matches or why none match well'),
        });

        const list = templates.map(t => `- ${t.id}: "${t.name}" (${t.description || 'No description'}). Category: ${t.category}. Quality: ${t.composite_weight?.toFixed(1)}`).join('\n');

        console.log('[LLM matchTemplate] Template list sent to LLM:');
        console.log(list);

        const systemPrompt = `You are a website architect. Check if any of these pre-built Community Templates is an excellent structural match for the user's request.
A template is a pre-assembled ordered set of components (hero, features, pricing, etc.) that forms a complete website.

AVAILABLE TEMPLATES:
${list}

Rules:
- Only return confidence >= 0.75 if the template's purpose and structure closely match the user's needs.
- If the user wants something very custom, niche, or unrelated to any template, return confidence < 0.5.
- Prefer templates with higher composite_weight (they are higher quality).
- Return "" for template_id if no template is a good match.`;

        const userPrompt = `User Request: "${prompt}"\nDesign Context: ${JSON.stringify(designSystem)}`;
        console.log('[LLM matchTemplate] 📤 Sending to LLM (model: ' + aiModel + ')');
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s instead of 15s

            llmLog.request('TEMPLATE-MATCH', {
                model: aiModel,
                systemPrompt,
                userPrompt,
                schema,
                temperature: 0
            });

            const startMs = Date.now();
            console.time('[LLM matchTemplate] LLM call duration');
            const { object } = await generateObject({
                model: getModel(aiModel),
                schema,
                system: systemPrompt,
                prompt: userPrompt,
                temperature: 0,
                abortSignal: controller.signal
            });
            clearTimeout(timeoutId);
            console.timeEnd('[LLM matchTemplate] LLM call duration');

            llmLog.response('TEMPLATE-MATCH', {
                response: object,
                durationMs: Date.now() - startMs
            });

            console.log('[LLM matchTemplate] 📥 LLM returned:', JSON.stringify(object, null, 2));
            console.log('[LLM matchTemplate] ✅ LLM call succeeded');
            return object;
        } catch (e) {
            console.timeEnd('[LLM matchTemplate] LLM call duration');
            llmLog.error('TEMPLATE-MATCH', e);
            console.error('[LLM matchTemplate] ❌ LLM CALL FAILED:', e.message);
            console.error('[LLM matchTemplate] Error name:', e.name);
            console.error('[LLM matchTemplate] Stack:', e.stack?.substring(0, 300));
            console.log('[LLM matchTemplate] 💡 Returning no-match fallback');
            return { template_id: '', confidence: 0, reasoning: 'LLM call failed or timed out' };
        }
    },
};

/**
 * Step 1: Detect website type from user prompt + fallback
 */
async function detectWebsiteType(prompt, designSystem, aiModel = 'google/gemini-3.1-pro-preview') {
    const blueprints = await cachedQuery('blueprints_active', CACHE_TTL.blueprints, async () => {
        const { data } = await sb
            .from('website_type_blueprints')
            .select('slug, name, prompt_keywords, primary_industries, description')
            .eq('is_active', true)
            .order('popularity_score', { ascending: false });
        return data || [];
    });

    // 1a: Send compact blueprint list to LLM for matching
    const match = await llm.matchWebsiteType(prompt, designSystem, blueprints, aiModel);

    // 1b: DYNAMIC BLUEPRINT GENERATION FALLBACK
    if (!match || match.confidence < 0.6) {
        console.log('[Pipeline] No confident blueprint match — entering Dynamic Blueprint Generation');
        const dynamicBlueprint = await generateDynamicBlueprint(prompt, designSystem, aiModel);
        return dynamicBlueprint; // returns properly shaped custom blueprint
    }

    return { slug: match.slug, confidence: match.confidence, isDynamic: false };
}

/**
 * Dynamic Blueprint Generation
 * Creates a custom blueprint on-the-fly when preselected presets don't fit well.
 */
async function generateDynamicBlueprint(prompt, designSystem, aiModel = 'google/gemini-3.1-pro-preview') {
    const allCategories = await cachedQuery('categories_top_level', CACHE_TTL.categories, async () => {
        const { data } = await sb.from('component_categories')
            .select('slug, name, description')
            .eq('is_active', true)
            .is('parent_id', null)
            .order('sort_order');
        return data || [];
    });

    const verticals = await cachedQuery('verticals_all', CACHE_TTL.verticals, async () => {
        const { data } = await sb.from('industry_verticals')
            .select('slug, name')
            .eq('is_active', true);
        return data || [];
    });

    const themes = await cachedQuery('themes_all', CACHE_TTL.colorThemes, async () => {
        const { data } = await sb.from('color_themes')
            .select('slug, name, mode, warmth')
            .eq('is_active', true);
        return data || [];
    });

    const schema = z.object({
        slug: z.string().describe('URL-safe slug starting with "ai-generated-"'),
        name: z.string().describe('Human-readable name'),
        description: z.string().describe('Brief description'),
        required_categories: z.array(z.string()).describe('Required category slugs'),
        optional_categories: z.array(z.string()).describe('Optional category slugs'),
        recommended_component_count: z.number().describe('Ideal number of components (4-12)'),
        default_color_mode: z.enum(['dark', 'light', 'mixed']),
        default_color_theme: z.string().describe('A color theme slug'),
        default_typography: z.enum(['modern-sans', 'serif', 'mono-tech']),
        primary_industries: z.array(z.string()).describe('Industry vertical slugs'),
        component_layout_order: z.array(z.string()).describe('Category slugs in display order'),
        generation_confidence: z.number().describe('Confidence in this blueprint (0.0-1.0)'),
    });

    const catList = allCategories.map(c => `- ${c.slug}: ${c.name}`).join('\n');
    const indList = verticals.map(v => `- ${v.slug}: ${v.name}`).join('\n');
    const themeList = themes.map(t => `- ${t.slug}: ${t.name} (${t.mode}, ${t.warmth})`).join('\n');

    const systemPrompt = `You are a Master AI Architect. The user's request is highly novel and doesn't match standard templates.
Assemble a brand new completely custom blueprint from the exact glossary of parts provided.

AVAILABLE CATEGORIES:
${catList}

AVAILABLE INDUSTRIES:
${indList}

AVAILABLE THEMES:
${themeList}

REQUIREMENTS:
1. required_categories MUST include "header" and "footer".
2. Pick 4-12 categories total.
3. layout order should put header first, footer last.
4. Pick the perfect color theme & mode.
5. Slug MUST start with "ai-generated-".`;

    let dynamicBlueprint;
    try {
        llmLog.request('BLUEPRINT-GEN', {
            model: aiModel,
            systemPrompt,
            userPrompt: `User Request requiring dynamic blueprint: "${prompt}"`,
            schema,
            temperature: 0
        });

        const startMs = Date.now();
        const { object } = await generateObject({
            model: getModel(aiModel),
            schema,
            system: systemPrompt,
            prompt: `User Request requiring dynamic blueprint: "${prompt}"`,
            temperature: 0
        });
        dynamicBlueprint = object;

        llmLog.response('BLUEPRINT-GEN', {
            response: dynamicBlueprint,
            durationMs: Date.now() - startMs
        });
    } catch (e) {
        llmLog.error('BLUEPRINT-GEN', e);
        console.warn('[Pipeline] AI blueprint generation failed', e.message);
        throw e;
    }

    const finalBlueprint = {
        ...dynamicBlueprint,
        is_ai_generated: true,
        generated_from_prompt: prompt,
        is_active: true,
        prompt_keywords: prompt.toLowerCase().split(/[\s,.\-!?]+/).filter(t => t.length > 2)
    };

    console.log(`[Pipeline] Custom AI blueprint generated: "${finalBlueprint.name}"`);
    console.log(`[Pipeline] Required Categories: ${finalBlueprint.required_categories.join(', ')}`);

    // Persist high quality AI blueprints to DB
    if (finalBlueprint.generation_confidence >= 0.7) {
        const { error } = await sb.from('website_type_blueprints')
            .upsert(finalBlueprint, { onConflict: 'slug' });
        if (!error) console.log(`[Pipeline] Persisted dynamic blueprint: ${finalBlueprint.slug}`);
        else console.error('[Pipeline] Failed to persist dynamic blueprint:', error.message);
    }

    return {
        slug: finalBlueprint.slug,
        confidence: finalBlueprint.generation_confidence || 0.8,
        isDynamic: true,
        blueprintData: finalBlueprint
    };
}

/**
 * Step 2: Load blueprint
 */
async function loadBlueprint(blueprintSlug, dynamicData) {
    if (dynamicData) return dynamicData;

    const { data: blueprint, error } = await sb
        .from('website_type_blueprints')
        .select('*')
        .eq('slug', blueprintSlug)
        .single();

    if (error || !blueprint) {
        throw new Error(`Failed to load blueprint: ${blueprintSlug}`);
    }
    return blueprint;
}

/**
 * Step 3: Refine categories with LLM
 */
async function refineCategories(blueprint, prompt, designSystem, aiModel = 'google/gemini-3.1-pro-preview') {
    const allCategories = [
        ...(blueprint.required_categories || []),
        ...(blueprint.optional_categories || [])
    ];

    const { data: categoryDetails } = await sb
        .from('component_categories')
        .select('slug, name, component_count, description')
        .in('slug', allCategories)
        .eq('is_active', true);

    if (!categoryDetails || categoryDetails.length === 0) {
        console.warn('[Pipeline] No category details found, using blueprint defaults');
        return blueprint.required_categories;
    }

    const refined = await llm.refineCategories(prompt, designSystem, categoryDetails, blueprint, aiModel);

    // Ensure header and footer are always included as safety
    const safeRefined = new Set(refined);
    safeRefined.add('header');
    safeRefined.add('footer');

    return Array.from(safeRefined);
}

/**
 * Step 4: Industry-aware filtering
 */
async function filterByIndustry(categories, industrySlug) {
    try {
        let query = sb.from('components')
            .select('component_id, name, description, visual_description, mood_tone, color_mode, color_warmth, suitable_for, quality_score, usage_count, variant_of, variant_label')
            .in('category', categories)
            .eq('status', 'active')
            .is('variant_of', null)
            .order('quality_score', { ascending: false })
            .limit(100); // Fetch more to allow JS filtering if needed

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) return [];

        // Apply industry filtering in Javascript if slug provided, 
        // to avoid "invalid input syntax for type json" DB errors
        if (industrySlug) {
            const slugLower = industrySlug.toLowerCase();
            return data.filter(c => {
                const suitable = typeof c.suitable_for === 'string'
                    ? (c.suitable_for.startsWith('[') ? JSON.parse(c.suitable_for) : [])
                    : (c.suitable_for || []);
                return suitable.some(s => s.toLowerCase().includes(slugLower));
            });
        }

        return data;
    } catch (err) {
        console.error('[Pipeline] Filter error in filterByIndustry:', err.message);
        return [];
    }
}

function enforceStructuralSelection(selectedComponents = [], candidatePool = []) {
    const sanitized = [];
    const seen = new Set();
    const roleSeen = { header: false, hero: false, footer: false };

    for (const component of selectedComponents) {
        if (!component?.component_id || seen.has(component.component_id)) continue;
        const role = inferStructuralRole(component);
        
        if ((role === 'header' || role === 'hero' || role === 'footer') && roleSeen[role]) {
            console.log(`[Pipeline] 🚫 Dropping duplicate structural role "${role}": ${component.component_id} (already have ${Array.from(seen).find(id => inferStructuralRole({component_id: id}) === role)})`);
            continue;
        }
        
        sanitized.push(component);
        seen.add(component.component_id);
        if (roleSeen[role] !== undefined) {
            roleSeen[role] = true;
            console.log(`[Pipeline] ✅ Structural role confirmed: ${role} -> ${component.component_id}`);
        }
    }

    for (const requiredRole of ['header', 'hero', 'footer']) {
        if (roleSeen[requiredRole]) continue;
        const fallback = candidatePool.find(c => !seen.has(c.component_id) && inferStructuralRole(c) === requiredRole);
        if (fallback) {
            sanitized.push(fallback);
            seen.add(fallback.component_id);
            roleSeen[requiredRole] = true;
            console.log(`[Pipeline] Structural enforcement added missing ${requiredRole}: ${fallback.component_id}`);
        }
    }

    try {
        // Force strict architectural layout order so if polish fails, the baseline website isn't broken
        const roleOrder = { 'header': 1, 'hero': 2, 'feature': 3, 'footer': 4 };
        
        sanitized.sort((a, b) => {
            const roleA = (inferStructuralRole(a) || 'feature').toLowerCase();
            const roleB = (inferStructuralRole(b) || 'feature').toLowerCase();
            return (roleOrder[roleA] || 3) - (roleOrder[roleB] || 3);
        });
    } catch (err) {
        console.warn('[Pipeline] ⚠️ Non-fatal: Failed to sort final layout structure:', err.message);
    }

    return sanitized;
}

/**
 * Step 5: Theme & style scoring + LLM final selection
 */
async function scoreAndSelect(candidates, designSystem, prompt, explicitComponents = [], requiredCategories = [], aiModel = 'google/gemini-3.1-pro-preview') {
    if (!candidates || candidates.length === 0) return [];

    // Score each candidate
    const scored = candidates.map(c => {
        // MASSIVELY weight quality score as per user request
        let score = (c.quality_score || 5) * 1.5;

        // Color mode match
        if (designSystem.colorMode && c.color_mode === designSystem.colorMode) score += 2.0;

        // Warmth match
        if (designSystem.warmth && c.color_warmth === designSystem.warmth) score += 1.5;

        // Usage popularity (normalize to max 1.5)
        score += Math.min((c.usage_count || 0) / 100, 1.5);

        // EXTRA BOOST for explicit components to ensure they stay in top 30
        const isExplicit = explicitComponents.some(name =>
            c.name?.toLowerCase() === name.toLowerCase() ||
            c.component_id?.toLowerCase() === name.toLowerCase() ||
            c.id?.toLowerCase() === name.toLowerCase()
        );
        if (isExplicit) score += 100; // Force to the top

        return { ...c, computed_score: score };
    });

    // Sort by computed score, take top 50
    scored.sort((a, b) => b.computed_score - a.computed_score);
    const top50 = scored.slice(0, 50);

    // Map explicit components to their component_id so the LLM prompt recognizes UUIDs
    const mappedExplicit = explicitComponents.map(reqId => {
        const match = top50.find(c =>
            c.name?.toLowerCase() === reqId.toLowerCase() ||
            c.component_id?.toLowerCase() === reqId.toLowerCase() ||
            c.id?.toLowerCase() === reqId.toLowerCase()
        );
        return match ? match.component_id : reqId;
    });

    // LLM picks final 8-14 from top 50
    const selectedIds = await llm.selectFinalComponents(prompt, designSystem, top50, mappedExplicit, requiredCategories, aiModel);

    // Map IDs back to full component objects with robust case-insensitive matching
    const selectedComponents = selectedIds
        .map(id => {
            const found = top50.find(c => c.component_id.toLowerCase() === id.toLowerCase());
            if (!found) console.warn(`[Pipeline] ⚠️ LLM returned component_id "${id}" which was not in top 50 pool!`);
            return found;
        })
        .filter(Boolean); // remove any LLM hallucinations

    return enforceStructuralSelection(selectedComponents, top50);
}

/**
 * Step 6: Compatibility validation
 */
async function validateCompatibility(selectedComponents) {
    if (!selectedComponents || selectedComponents.length < 2) return selectedComponents;

    const selectedIds = selectedComponents.map(c => c.component_id);

    const { data: conflicts } = await sb
        .from('component_compatibility')
        .select('component_a_id, component_b_id, relationship, compatibility_score')
        .in('component_a_id', selectedIds)
        .in('component_b_id', selectedIds)
        .in('relationship', ['style-clash', 'incompatible']);

    if (conflicts && conflicts.length > 0) {
        console.warn(`[Pipeline] ⚠️ Compatibility conflicts detected: ${conflicts.length}`);

        let validComponents = [...selectedComponents];

        for (const conflict of conflicts) {
            const indexA = validComponents.findIndex(c => c.component_id === conflict.component_a_id);
            const indexB = validComponents.findIndex(c => c.component_id === conflict.component_b_id);

            if (indexA !== -1 && indexB !== -1) {
                const compA = validComponents[indexA];
                const compB = validComponents[indexB];

                // Auto-swap logic: drop the one with the lower score
                if ((compA.computed_score || 0) >= (compB.computed_score || 0)) {
                    console.log(`[Pipeline]   └─ Dropping ${compB.component_id} in favor of ${compA.component_id}`);
                    validComponents.splice(indexB, 1);
                } else {
                    console.log(`[Pipeline]   └─ Dropping ${compA.component_id} in favor of ${compB.component_id}`);
                    validComponents.splice(indexA, 1);
                }
            }
        }
        return validComponents;
    }

    return selectedComponents;
}

/**
 * Step 7: Fetch actual React code bundles for the finalized components
 */
async function fetchBundles(componentIds) {
    if (!componentIds || componentIds.length === 0) return [];

    const { data, error } = await sb
        .from('components')
        .select('component_id, bundle_code, requires')
        .in('component_id', componentIds);

    if (error) {
        console.error('[Pipeline] Bundle fetch error:', error.message);
        throw new Error('Failed to fetch component code bundles');
    }

    return data || [];
}

/**
 * Step 0a: Fetch top templates from weighted_templates view
 */
async function matchTemplateFromDB(prompt, designSystem, aiModel = 'google/gemini-3.1-pro-preview') {
    console.group('[Pipeline Step 0a] ════════════════════════════════════');
    console.log('[Step 0a] 🚀 matchTemplateFromDB called at', new Date().toISOString());
    console.log('[Step 0a] Prompt:', prompt?.substring(0, 100) + '...');
    console.log('[Step 0a] Design system:', JSON.stringify(designSystem));

    // Fetch top 10 templates by composite weight
    console.log('[Step 0a] 🔍 Querying weighted_templates view (top 10 by composite_weight)...');
    const { data: templates, error } = await sb
        .from('weighted_templates')
        .select('id, name, description, category, color_mode_type, suitable_for, quality_score, rating_avg, usage_count, composite_weight')
        .order('composite_weight', { ascending: false })
        .limit(10);

    if (error) {
        console.error('[Step 0a] ❌ SUPABASE QUERY FAILED on weighted_templates');
        console.error('[Step 0a] Error message:', error.message);
        console.error('[Step 0a] Error details:', JSON.stringify(error));
        console.log('[Step 0a] 💡 This could mean:');
        console.log('[Step 0a]   1. The weighted_templates VIEW does not exist yet (run migration 011)');
        console.log('[Step 0a]   2. The templates table has no rows with status=active');
        console.log('[Step 0a]   3. RLS is blocking the query');
        console.groupEnd();
        return null;
    }

    if (!templates || templates.length === 0) {
        console.log('[Step 0a] ⚠️ No active templates found in weighted_templates view');
        console.log('[Step 0a] 💡 This means NO templates have status = "active" in the templates table');
        console.log('[Step 0a] 💡 Templates start as "draft" and need LLM analysis to become "active"');
        console.groupEnd();
        return null;
    }

    console.log('[Step 0a] ✅ Found', templates.length, 'candidate templates:');
    templates.forEach((t, i) => {
        console.log(`[Step 0a]   ${i + 1}. "${t.name}" (id: ${t.id.substring(0, 8)}...) weight: ${t.composite_weight?.toFixed(2)} quality: ${t.quality_score} rating: ${t.rating_avg} usage: ${t.usage_count}`);
    });

    console.log('[Step 0a] 📤 Sending', templates.length, 'templates to LLM for matching...');
    const match = await llm.matchTemplate(prompt, designSystem, templates, aiModel);

    console.log('[Step 0a] 📥 LLM response:', JSON.stringify(match, null, 2));

    if (!match || !match.template_id || match.confidence < 0.75) {
        console.log('[Step 0a] ❌ NO confident match — LLM did NOT pick a template');
        console.log('[Step 0a] Confidence:', match?.confidence?.toFixed(2) || '0');
        console.log('[Step 0a] Threshold: 0.75 (need >= 0.75 for match)');
        console.log('[Step 0a] Reasoning:', match?.reasoning || 'N/A');
        console.log('[Step 0a] 💡 Pipeline will fall through to individual component selection (Steps 1-7)');
        console.groupEnd();
        return null;
    }

    console.log('[Step 0a] ✅✅ TEMPLATE MATCHED!');
    console.log('[Step 0a] Template ID:', match.template_id);
    console.log('[Step 0a] Confidence:', (match.confidence * 100).toFixed(0) + '%');
    console.log('[Step 0a] Reasoning:', match.reasoning);
    console.groupEnd();

    return match;
}

/**
 * Step 0b: Load the template's component blueprint (ordered sections)
 */
async function getTemplateBlueprint(templateId) {
    console.group('[Pipeline Step 0b] ════════════════════════════════════');
    console.log('[Step 0b] 🔍 getTemplateBlueprint called for template:', templateId);

    console.log('[Step 0b] Querying template_sections with component JOIN...');
    const { data: sections, error } = await sb
        .from('template_sections')
        .select(`
            section_order,
            section_label,
            component_id,
            components (
                component_id,
                name,
                description,
                visual_description,
                mood_tone,
                color_mode,
                color_warmth,
                suitable_for,
                quality_score,
                usage_count,
                category
            )
        `)
        .eq('template_id', templateId)
        .order('section_order', { ascending: true });

    if (error) {
        console.error('[Step 0b] ❌ TEMPLATE SECTIONS QUERY FAILED:', error.message);
        console.error('[Step 0b] Error details:', JSON.stringify(error));
        console.log('[Step 0b] 💡 This could mean:');
        console.log('[Step 0b]   1. template_sections table does not exist (run migration 011)');
        console.log('[Step 0b]   2. The template has no sections (submit-template may have failed)');
        console.log('[Step 0b]   3. RLS is blocking the query');
        console.groupEnd();
        return null;
    }

    if (!sections || sections.length === 0) {
        console.error('[Step 0b] ❌ TEMPLATE HAS NO SECTIONS for id:', templateId);
        console.log('[Step 0b] 💡 template_sections table returned 0 rows for this template_id');
        console.groupEnd();
        return null;
    }

    console.log('[Step 0b] ✅ Found', sections.length, 'template sections:');
    sections.forEach((s, i) => {
        const comp = s.components;
        console.log(`[Step 0b]   ${i + 1}. Order: ${s.section_order} | Label: "${s.section_label}" | ComponentID: ${s.component_id}`);
        if (comp) {
            console.log(`[Step 0b]      → Name: ${comp.name} | Category: ${comp.category} | Quality: ${comp.quality_score}`);
        } else {
            console.warn(`[Step 0b]      ⚠️ Component data is NULL — component may have been deleted or is not active`);
        }
    });

    // Flatten into component array preserving template order
    const nullComponents = sections.filter(s => !s.components);
    if (nullComponents.length > 0) {
        console.warn(`[Step 0b] ⚠️ ${nullComponents.length} section(s) have NULL component data (component deleted/inactive?)`);
    }

    const components = sections
        .map(s => s.components)
        .filter(Boolean)
        .map(comp => ({
            ...comp,
            computed_score: (comp.quality_score || 5) * 0.5,
        }));

    console.log(`[Step 0b] ✅ Blueprint assembled: ${components.length} valid components`);
    components.forEach((c, i) => console.log(`[Step 0b]   ${i + 1}. ${c.name} (${c.category}) score: ${c.computed_score?.toFixed(2)}`));
    console.groupEnd();

    return components;
}

/**
 * MAIN PIPELINE ORCHESTRATOR
 * Orchestrates the full 7-step process (with Step 0: Template Matching).
 */
export async function selectComponentsV2(prompt, designSystem = {}, explicitNames = [], strictMode = false, aiModel = 'google/gemini-3.1-pro-preview') {
    console.log('\n======================================================');
    console.log('🚀 ULTRA PIPELINE V2: STARTED');
    console.log('======================================================');
    console.time('[Pipeline] Total execution time');

    try {
        // -----------------------------------------------------------------
        // STEP 0: Community Template Matching (NEW — Phase S10)
        // Before individual component selection, check if a high-quality
        // community template matches the user's prompt.
        // -----------------------------------------------------------------
        console.log('\n[Step 0] ════════════════════════════════════════════');
        console.log('[Step 0] 🔍 Starting Community Template Matching...');
        console.log('[Step 0] Prompt:', prompt?.substring(0, 120) + (prompt?.length > 120 ? '...' : ''));
        console.log('[Step 0] DesignSystem:', JSON.stringify(designSystem));

        let templateMatch = null;
        let templateComponents = null;
        try {
            templateMatch = await matchTemplateFromDB(prompt, designSystem, aiModel);
            console.log('[Step 0] matchTemplateFromDB result:', templateMatch ? `MATCH (${templateMatch.template_id})` : 'NO MATCH');

            if (templateMatch) {
                console.log('[Step 0] 🔍 Template matched! Now loading blueprint...');
                templateComponents = await getTemplateBlueprint(templateMatch.template_id);
                console.log('[Step 0] getTemplateBlueprint result:', templateComponents ? `${templateComponents.length} components` : 'FAILED/NULL');
            } else {
                console.log('[Step 0] 💡 No template matched — will proceed to standard component selection');
            }
        } catch (e) {
            console.error('[Step 0] 💥 STEP 0 EXCEPTION (non-fatal):', e.message);
            console.error('[Step 0] Stack:', e.stack);
            console.log('[Step 0] 💡 Falling back to individual component selection (Steps 1-7)');
        }

        // If we have a matching template, short-circuit Steps 1-5
        if (templateMatch && templateComponents && templateComponents.length >= 2) {
            console.log('\n[Step 0] ✅✅✅ COMMUNITY TEMPLATE SHORT-CIRCUIT ACTIVATED!');
            console.log('[Step 0] Template:', templateMatch.template_id);
            console.log('[Step 0] Components:', templateComponents.length);
            console.log('[Step 0] Confidence:', (templateMatch.confidence * 100).toFixed(0) + '%');
            console.log('[Step 0] ⏭️ SKIPPING Steps 1-5 (website type, blueprint, categories, filtering, scoring)');
            console.log('[Step 0] ▶️ Going directly to Step 6 (compatibility) + Step 7 (bundles)');

            // Step 6: Compatibility validation (still run)
            console.log('\n[Step 6 — template path] Running compatibility validation...');
            let validatedComponents = templateComponents;
            try {
                validatedComponents = await validateCompatibility(templateComponents);
                const removed = templateComponents.length - validatedComponents.length;
                console.log(`[Step 6 — template path] ✅ Validation complete. ${removed > 0 ? `Removed ${removed} incompatible component(s)` : 'All components compatible'}`);
            } catch (e) {
                console.warn('[Step 6 — template path] ⚠️ Validation failed, using raw template components:', e.message);
            }

            // Step 7: Fetch bundles
            const finalIds = validatedComponents.map(c => c.component_id);
            console.log('\n[Step 7 — template path] Fetching code bundles for', finalIds.length, 'components...');
            console.log('[Step 7 — template path] Component IDs:', finalIds);
            const bundles = await fetchBundles(finalIds);
            console.log('[Step 7 — template path] ✅ Fetched', bundles.length, '/', finalIds.length, 'bundles');

            const missingBundles = finalIds.filter(id => !bundles.find(b => b.component_id === id));
            if (missingBundles.length > 0) {
                console.warn('[Step 7 — template path] ⚠️ MISSING BUNDLES for:', missingBundles);
            }

            const enrichedComponents = validatedComponents.map(meta => {
                const codeBundle = bundles.find(b => b.component_id === meta.component_id);
                return {
                    ...meta,
                    bundle_code: codeBundle?.bundle_code,
                    requires: codeBundle?.requires || []
                };
            });

            const returnPayload = {
                components: enrichedComponents,
                websiteType: 'template-based',
                blueprint: `Template: ${templateMatch.template_id}`,
                templateUsed: {
                    templateId: templateMatch.template_id,
                    confidence: templateMatch.confidence,
                    reasoning: templateMatch.reasoning,
                },
                stats: {
                    totalCandidates: templateComponents.length,
                    finalSelected: enrichedComponents.length,
                    pipelineVersion: 'v2-ultra-template',
                    source: 'community-template',
                }
            };

            console.log('\n[Step 0] 🏁 TEMPLATE PIPELINE COMPLETE');
            console.log('[Step 0] Final component count:', enrichedComponents.length);
            console.log('[Step 0] Pipeline version:', returnPayload.stats.pipelineVersion);
            enrichedComponents.forEach((c, i) => console.log(`[Step 0]   ${i + 1}. ${c.name} (${c.category}) bundle: ${c.bundle_code ? 'YES' : 'MISSING'}`));

            return returnPayload;
        }

        // Template did NOT match — explain why
        console.log('\n[Step 0] ⏩ No template short-circuit. Reasons:');
        if (!templateMatch) {
            console.log('[Step 0]   → matchTemplateFromDB returned null (no match or query error)');
        } else if (!templateComponents) {
            console.log('[Step 0]   → getTemplateBlueprint returned null (sections query failed)');
        } else if (templateComponents.length < 2) {
            console.log('[Step 0]   → Template has only', templateComponents.length, 'component(s) (need >= 2)');
        }
        console.log('[Step 0] ▶️ Proceeding with individual component selection (Steps 1-7)');
        console.log('[Step 0] ════════════════════════════════════════════\n');

        // -----------------------------------------------------------------
        // STRICT MODE SHORT-CIRCUIT (Phase S11)
        // -----------------------------------------------------------------
        if (strictMode && explicitNames.length > 0) {
            console.log('\n[Strict Mode] ⚡ STRICT MODE SHORT-CIRCUIT ACTIVATED!');
            console.log('[Strict Mode] Only using explicit IDs:', explicitNames);

            // Format IDs for Supabase .or() with bracketed quoting
            const formattedIds = explicitNames.map(id => `"${id}"`).join(',');
            const { data: strictComponents, error } = await sb
                .from('components')
                .select('component_id, id, name, description, visual_description, mood_tone, color_mode, color_warmth, suitable_for, quality_score, usage_count, category, bundle_code, requires')
                .or(`component_id.in.(${formattedIds}),id.in.(${formattedIds})`);

            if (error) throw error;

            console.log('[Strict Mode] ✅ Fetched', strictComponents.length, 'components explicitly.');

            const enriched = strictComponents.map(c => ({
                ...c,
                source: 'premium',
                bundleId: c.component_id || c.id // Fallback to 'id' (UUID) for community components
            }));

            return {
                components: enriched,
                websiteType: 'strict-selection',
                blueprint: 'Strict User Selection',
                stats: {
                    totalCandidates: enriched.length,
                    finalSelected: enriched.length,
                    pipelineVersion: 'v2-ultra-strict',
                    source: 'strict-user-selection',
                }
            };
        }

        // -----------------------------------------------------------------
        // STEP 1: Website Type Detection & Dynamic Generation
        // -----------------------------------------------------------------
        let websiteType;
        try {
            websiteType = await detectWebsiteType(prompt, designSystem, aiModel);
        } catch (e) {
            console.warn(`[Pipeline] Step 1 Failed. Falling back to default landing preset:`, e.message);
            websiteType = { slug: 'saas-landing', confidence: 0.5, isDynamic: false };
        }

        console.log(`\n[Step 1] Website Type Detection ✅`);
        console.log(`  └─ Blueprint: ${websiteType.slug}`);
        console.log(`  └─ Source:    ${websiteType.isDynamic ? 'AI Dynamic Generator' : 'Standard Preset'}`);
        console.log(`  └─ Auth-Conf: ${(websiteType.confidence * 100).toFixed(0)}%`);

        // -----------------------------------------------------------------
        // STEP 2: Blueprint Category Loading
        // -----------------------------------------------------------------
        let blueprint;
        try {
            blueprint = await loadBlueprint(websiteType.slug, websiteType.blueprintData);
        } catch (e) {
            console.warn(`[Pipeline] Step 2 Failed. Using safe fallback categories.`, e.message);
            blueprint = { name: 'Fallback', required_categories: ['header', 'hero', 'feature', 'cta', 'footer'] };
        }

        console.log(`\n[Step 2] Blueprint Schema Loaded ✅`);
        console.log(`  └─ Required: ${blueprint.required_categories?.join(', ')}`);
        if (blueprint.optional_categories?.length > 0) {
            console.log(`  └─ Optional: ${blueprint.optional_categories?.join(', ')}`);
        }

        // -----------------------------------------------------------------
        // STEP 3: Contextual Category Refinement
        // -----------------------------------------------------------------
        let finalCategories = [...blueprint.required_categories];
        try {
            finalCategories = await refineCategories(blueprint, prompt, designSystem, aiModel);
        } catch (e) {
            console.warn(`[Pipeline] Step 3 Failed. Using blueprint categories directly.`, e.message);
        }

        console.log(`\n[Step 3] AI Category Refinement ✅`);
        console.log(`  └─ Final list: ${finalCategories.join(', ')}`);

        // -----------------------------------------------------------------
        // STEP 4: Industry-aware filtering
        // -----------------------------------------------------------------
        const industry = designSystem.industry || websiteType.slug.split('-')[0];

        // Extract explicit components from the prompt if present, and merge with passed explicitNames
        let currentExplicit = [...explicitNames];

        // DEBUG: Log prompt excerpts to see if enhancement marker is present
        console.log(`[Pipeline] Prompt head: "${prompt.substring(0, 300).replace(/\n/g, ' ')}..."`);
        console.log(`[Pipeline] Prompt tail: "...${prompt.substring(prompt.length - 200).replace(/\n/g, ' ')}"`);

        // Robust regex for EXPLICIT_COMPONENTS in various formats (markdown, brackets, cases)
        const explicitMatch = prompt.match(/(?:\*\*|__)?EXPLICIT_COMPONENTS(?:\*\*|__)?[:\s\-=]+\[(.*?)\]/i);
        if (explicitMatch && explicitMatch[1]) {
            const found = explicitMatch[1].split(',').map(s => s.trim().replace(/['"`]/g, '')).filter(Boolean);
            currentExplicit = [...new Set([...currentExplicit, ...found])];
        }

        if (currentExplicit.length > 0) {
            console.log(`\n[Pipeline] 🎯 Active explicit components:`, currentExplicit);
        }

        const explicitNamesForQuery = currentExplicit; // For the DB query below

        let candidates = await filterByIndustry(finalCategories, industry);

        // Ensure explicit components are in the candidate pool even if they failed industry filtering
        if (explicitNamesForQuery.length > 0) {
            console.log(`[Pipeline] 🔍 Fetching explicit components from DB to ensure presence...`);

            const validUUIDs = explicitNamesForQuery.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
            const nonUUIDs = explicitNamesForQuery.filter(id => !validUUIDs.includes(id));

            let orFields = [];
            if (nonUUIDs.length > 0) {
                const formattedStrs = nonUUIDs.map(n => `"${n.replace(/"/g, '')}"`).join(',');
                orFields.push(`name.in.(${formattedStrs})`);
                orFields.push(`component_id.in.(${formattedStrs})`);
            }
            if (validUUIDs.length > 0) {
                const formattedUUIDs = validUUIDs.map(n => `"${n}"`).join(',');
                orFields.push(`id.in.(${formattedUUIDs})`);
                // Sometimes component_id matches a UUID for community components
                orFields.push(`component_id.in.(${formattedUUIDs})`);
            }

            const orQuery = orFields.join(',');

            const { data: explicitComps } = await sb
                .from('components')
                .select('component_id, id, name, description, visual_description, mood_tone, color_mode, color_warmth, suitable_for, quality_score, usage_count, variant_of, variant_label, category')
                .or(orQuery)
                .eq('status', 'active');

            if (explicitComps && explicitComps.length > 0) {
                console.log(`[Pipeline] ✅ Found ${explicitComps.length} explicit matches in DB.`);
                // Merge into candidates, avoiding duplicates
                const existingIds = new Set(candidates.map(c => c.component_id));
                explicitComps.forEach(ec => {
                    if (!existingIds.has(ec.component_id)) {
                        candidates.push(ec);
                    }
                });
            }
        }

        if (!candidates || candidates.length < 15) {
            console.warn(`\n[Step 4] ⚠️ Only ${candidates?.length || 0} candidates available. Backfilling with universal components to expand options...`);
            const fallbackQuery = await sb.from('components')
                .select('component_id, id, name, description, visual_description, mood_tone, color_mode, color_warmth, suitable_for, quality_score, usage_count, variant_of, variant_label, category')
                .eq('status', 'active')
                .is('variant_of', null)
                .order('quality_score', { ascending: false })
                .limit(50);

            const fallbackComps = fallbackQuery.data || [];
            const existingIds = new Set((candidates || []).map(c => c.component_id));

            candidates = candidates || [];
            fallbackComps.forEach(fc => {
                if (!existingIds.has(fc.component_id)) {
                    candidates.push(fc);
                }
            });
        }

        // LAST RESORT: If explicit components still not in candidates, fetch them by any means
        if (currentExplicit.length > 0) {
            const missing = currentExplicit.filter(name => !candidates.some(c =>
                c.name?.toLowerCase().includes(name.toLowerCase()) ||
                c.component_id?.toLowerCase().includes(name.toLowerCase()) ||
                c.id?.toLowerCase() === name.toLowerCase()
            ));

            if (missing.length > 0) {
                console.log(`[Pipeline] 🚨 ${missing.length} explicit components still missing from candidates. Broadening search...`);

                // Construct broad query handling UUIDs safely to avoid Postgres type errors
                const missingUUIDs = missing.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
                const missingStrs = missing.filter(id => !missingUUIDs.includes(id));

                let broadOrs = [];
                if (missingStrs.length > 0) {
                    broadOrs.push(`name.ilike.%${missingStrs[0]}%`);
                    broadOrs.push(`component_id.ilike.%${missingStrs[0]}%`);
                    broadOrs.push(`description.ilike.%${missingStrs[0]}%`);
                }
                if (missingUUIDs.length > 0) {
                    broadOrs.push(`id.eq.${missingUUIDs[0]}`);
                    broadOrs.push(`component_id.eq.${missingUUIDs[0]}`);
                }
                const broadQuery = broadOrs.join(',');

                const { data: broadMatches } = await sb
                    .from('components')
                    .select('component_id, id, name, description, visual_description, mood_tone, color_mode, color_warmth, suitable_for, quality_score, usage_count, variant_of, variant_label, category')
                    .or(broadQuery)
                    .eq('status', 'active')
                    .limit(20);

                if (broadMatches && broadMatches.length > 0) {
                    console.log(`[Pipeline] ✅ Broad search found ${broadMatches.length} possible matches.`);
                    const existingIds = new Set(candidates.map(c => c.component_id));
                    broadMatches.forEach(bm => {
                        if (!existingIds.has(bm.component_id)) candidates.push(bm);
                    });
                }
            }
        }

        console.log(`\n[Step 4] Industry-Aware Filtering ✅`);
        console.log(`  └─ Industry Context: ${industry}`);
        console.log(`  └─ Total Candidates: ${candidates.length}`);

        // -----------------------------------------------------------------
        // STEP 5: Theme & Style Scoring + AI Selection
        // -----------------------------------------------------------------
        const selectedComponents = await scoreAndSelect(candidates, designSystem, prompt, currentExplicit, finalCategories, aiModel);
        console.log(`\n[Step 5] Theme & Style Scoring + AI Final Selection ✅`);
        console.log(`  └─ AI Selected: ${selectedComponents.length} components`);
        selectedComponents.forEach(c => console.log(`     - ${c.component_id} (Score: ${c.computed_score?.toFixed(2)})`));

        // -----------------------------------------------------------------
        // STEP 6: Compatibility Graph Validation
        // -----------------------------------------------------------------
        let validatedComponents = selectedComponents;
        try {
            validatedComponents = await validateCompatibility(selectedComponents);
            validatedComponents = enforceStructuralSelection(validatedComponents, candidates);
        } catch (e) {
            console.warn(`[Pipeline] Step 6 Failed. Skipping graph validation.`, e.message);
            validatedComponents = enforceStructuralSelection(selectedComponents, candidates);
        }

        console.log(`\n[Step 6] Compatibility Validation ✅`);
        if (validatedComponents.length < selectedComponents.length) {
            console.log(`  └─ Auto-corrected ${selectedComponents.length - validatedComponents.length} incompatible pairs.`);
        } else {
            console.log(`  └─ All components compatible. No conflicts.`);
        }

        // -----------------------------------------------------------------
        // STEP 7: Final Code Bundle Fetch
        // -----------------------------------------------------------------
        const finalIds = validatedComponents.map(c => c.component_id);
        const bundles = await fetchBundles(finalIds);
        console.log(`\n[Step 7] Bundle Fetch ✅`);
        console.log(`  └─ Fetched ${bundles.length} code execution bundles.`);

        // Final payload reconstruction for the frontend UI generator
        const enrichedComponents = validatedComponents.map(meta => {
            const codeBundle = bundles.find(b => b.component_id === meta.component_id);
            return {
                ...meta,
                bundle_code: codeBundle?.bundle_code,
                requires: codeBundle?.requires || []
            };
        });

        return {
            components: enrichedComponents,
            websiteType: websiteType.slug,
            blueprint: blueprint.name,
            stats: {
                totalCandidates: candidates.length,
                finalSelected: enrichedComponents.length,
                pipelineVersion: 'v2-ultra',
                dataToLLM: '~28KB (avg)'
            }
        };

    } catch (err) {
        console.error('\n❌ [Pipeline] CRITICAL ERROR:', err);
        throw err;
    } finally {
        console.timeEnd('[Pipeline] Total execution time');
        console.log('======================================================\n');
    }
}
