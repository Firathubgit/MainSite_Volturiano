// server/lib/community-analyzer.js
// Phase S9.6: LLM Multimodal Analysis Function (Structured Output with Zod)

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { supabaseAdmin } from './supabase-admin.js';
import { resolveModelRole, toProviderModelName } from '../shared/model-registry.js';

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMA: Structured LLM output covering 30+ metadata columns
// ═══════════════════════════════════════════════════════════════

export const componentAnalysisSchema = z.object({
    category: z.string().describe('Slug from the category taxonomy (e.g., "hero", "pricing", "testimonial")'),
    subcategory: z.string().nullable().describe('Sub-category slug if applicable'),
    component_type: z.string().describe('Specific type (e.g., "hero-video", "pricing-toggle")'),
    display_name: z.string().describe('Clean display name'),
    description: z.string().describe('2-3 sentence description'),
    visual_description: z.string().describe('Detailed visual description: colors, layout, spacing, feel'),
    mood_tone: z.string().describe('e.g., professional, playful, minimal, bold, elegant'),
    design_personality: z.object({
        style: z.string(),
        energy: z.string(),
        formality: z.string(),
    }),
    color_mode: z.enum(['dark', 'light', 'mixed', 'adaptive']),
    color_primary: z.string().nullable(),
    color_secondary: z.string().nullable(),
    color_accent: z.string().nullable(),
    color_background: z.string().nullable(),
    color_palette: z.array(z.string()).nullable(),
    color_warmth: z.enum(['warm', 'cool', 'neutral', 'vibrant']).nullable(),
    color_theme: z.string().nullable(),
    typography_style: z.string().nullable(),
    layout_type: z.string().describe('e.g., full-width, centered, split, grid'),
    suitable_for: z.array(z.string()).describe('Industries this component suits'),
    not_suitable_for: z.array(z.string()),
    industry_tags: z.array(z.string()),
    supports: z.array(z.string()),
    requires: z.array(z.string()),
    responsive: z.boolean(),
    has_animation: z.boolean(),
    animation_type: z.string().nullable(),
    tags: z.array(z.string()),
    keywords: z.array(z.string()),
    quality_score: z.number().min(1).max(10).describe('Quality rating 1-10'),
    language: z.enum(['jsx', 'tsx']),
    cleaned_code: z.string().nullable().describe('Fixed code if issues found, null otherwise'),
    code_issues_found: z.array(z.string()),
    code_fixes_applied: z.array(z.string()),
});

// ═══════════════════════════════════════════════════════════════
// TAXONOMY CACHE: Fetches active categories from DB (cached 5 min)
// ═══════════════════════════════════════════════════════════════

let categoryCache = null;
let categoryCacheTime = 0;
const CATEGORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getActiveCategories() {
    const now = Date.now();
    if (categoryCache && (now - categoryCacheTime) < CATEGORY_CACHE_TTL) {
        return categoryCache;
    }

    const { data: categories, error } = await supabaseAdmin
        .from('component_categories')
        .select('slug, display_name, description')
        .eq('is_active', true);

    if (error) {
        console.error('[community-analyzer] Failed to fetch categories:', error.message);
        // Return cached data if available, otherwise empty array
        return categoryCache || [];
    }

    categoryCache = categories || [];
    categoryCacheTime = now;
    return categoryCache;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION: Code + Screenshot → Structured Metadata
// ═══════════════════════════════════════════════════════════════

/**
 * Multimodal LLM analysis: code + screenshot → structured metadata
 * Uses generateObject for type-safe structured output via Gemini 2.0 Flash
 *
 * @param {Object} params
 * @param {string} params.code - The component source code
 * @param {string} [params.screenshotUrl] - URL or base64 of screenshot
 * @param {string} params.userProvidedName - Name given by the submitter
 * @param {string} [params.userProvidedDescription] - Optional description
 * @param {string} [params.userCategoryHint] - Optional category hint
 * @returns {Promise<Object>} Structured analysis result matching componentAnalysisSchema
 */
export async function analyzeCommunityComponent({ code, screenshotBase64, userProvidedName, userProvidedDescription, userCategoryHint }) {
    // Fetch taxonomy for classification
    const categories = await getActiveCategories();

    const categoryList = categories.length > 0
        ? categories.map(c => `- ${c.slug}: ${c.name} — ${c.description || ''}`).join('\n')
        : '- Hero, Navbar, Footer, Pricing, Testimonial, FAQ, Feature, CTA, Contact, Blog, Gallery, Stats, Team, About, Login, Signup, Error, Loading, Sidebar, Modal';

    const systemInstruction = `You are an expert UI component analyst for the Volturiano AI Website Builder.
A community user submitted a React component. Analyze BOTH the code AND the screenshot (if provided) to produce a complete metadata profile.

AVAILABLE CATEGORIES:
${categoryList}

QUALITY SCORING RUBRIC:
- 9-10: Production-ready, beautiful, well-structured, responsive, accessible
- 7-8: Good quality, minor improvements possible, usable as-is
- 5-6: Decent, functional but not polished
- 3-4: Below average, significant issues
- 1-2: Broken, non-functional, or very poor quality

CODE CLEANUP RULES:
- Fix missing export default statements
- Fix incorrect import paths
- Remove console.log statements
- Ensure component accepts and uses props properly
- Do NOT change the visual design — only fix technical issues

RESPOND EXACTLY WITH A VALID JSON OBJECT MATCHING THIS STRUCTURE (no markdown blocks around it):
{
  "category": "string", "subcategory": "string | null", "component_type": "string",
  "display_name": "string", "description": "string", "visual_description": "string",
  "mood_tone": "string",
  "design_personality": { "style": "string", "energy": "string", "formality": "string" },
  "color_mode": "dark|light|mixed|adaptive", "color_primary": "string | null",
  "color_secondary": "string | null", "color_accent": "string | null",
  "color_background": "string | null", "color_palette": ["string"],
  "color_warmth": "warm|cool|neutral|vibrant|null", "color_theme": "string|null",
  "typography_style": "string|null", "layout_type": "string",
  "suitable_for": ["string"], "not_suitable_for": ["string"],
  "industry_tags": ["string"], "supports": ["string"], "requires": ["string"],
  "responsive": boolean, "has_animation": boolean, "animation_type": "string|null",
  "tags": ["string"], "keywords": ["string"], "quality_score": number (1-10),
  "language": "jsx|tsx", "cleaned_code": "string|null",
  "code_issues_found": ["string"], "code_fixes_applied": ["string"]
}`;

    const promptText = `Component Name: "${userProvidedName}"
User Description: "${userProvidedDescription || 'Not provided — generate one'}"
Category Hint: "${userCategoryHint || 'Not provided — auto-detect'}"

Please respond with valid JSON matching the schema requirements.

CODE:
\`\`\`
${code}
\`\`\``;

    const MODELS = [
        { id: toProviderModelName(resolveModelRole('generalGeneration')), provider: 'google' },
        { id: toProviderModelName(resolveModelRole('lightweight')), provider: 'google' },
        { id: toProviderModelName(resolveModelRole('fastAnthropic')), provider: 'anthropic' },
        { id: toProviderModelName(resolveModelRole('premiumCoder')), provider: 'anthropic' },
        { id: toProviderModelName(resolveModelRole('fastPolish')), provider: 'openai' },
        { id: toProviderModelName(resolveModelRole('premiumPolish')), provider: 'openai' }
    ];

    for (let i = 0; i < MODELS.length; i++) {
        const { id: modelName, provider } = MODELS[i];
        try {
            console.log('\n[DEBUG-LLM] =================================================================');
            console.log(`[DEBUG-LLM] 🚀 STEP 1: analyzeCommunityComponent TRIGGERED for "${userProvidedName}"`);
            console.log(`[DEBUG-LLM] -> Model: ${modelName} (attempt ${i + 1}/${MODELS.length})`);
            console.log(`[DEBUG-LLM] -> Has Screenshot (Base64): ${!!screenshotBase64}`);

            console.log(`[DEBUG-LLM] 📡 STEP 2: Executing ${modelName} generation (30s timeout)...`);
            const startTime = Date.now();
            let responseText = "";

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 30000ms')), 30000));

            if (provider === 'google') {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const parts = [{ text: promptText }];
                if (screenshotBase64) {
                    parts.push({ inlineData: { data: screenshotBase64, mimeType: "image/png" } });
                }
                const req = ai.models.generateContent({
                    model: modelName,
                    contents: [{ role: "user", parts }],
                    config: {
                        systemInstruction: systemInstruction,
                        temperature: 0.2,
                        responseMimeType: "application/json",
                    }
                });
                const result = await Promise.race([req, timeoutPromise]);
                responseText = result.text;
            } 
            else if (provider === 'anthropic') {
                const { default: Anthropic } = await import('@anthropic-ai/sdk');
                const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
                const content = [{ type: 'text', text: promptText }];
                if (screenshotBase64) {
                    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 } });
                }
                const req = anthropic.messages.create({
                    model: modelName,
                    system: systemInstruction,
                    messages: [{ role: 'user', content }],
                    max_tokens: 4000,
                    temperature: 0.2
                });
                const msg = await Promise.race([req, timeoutPromise]);
                responseText = msg.content[0].text;
            }
            else if (provider === 'openai') {
                const { default: OpenAI } = await import('openai');
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || undefined });
                const content = [{ type: 'text', text: promptText }];
                if (screenshotBase64) {
                    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } });
                }
                const req = openai.chat.completions.create({
                    model: modelName,
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.2
                });
                const msg = await Promise.race([req, timeoutPromise]);
                responseText = msg.choices[0].message.content;
            }

            console.log(`[DEBUG-LLM] ✅ STEP 3: ${modelName} returned in ${Date.now() - startTime}ms`);
            console.log(`[DEBUG-LLM] -> Raw Response Text Length: ${responseText?.length || 0} chars`);

            const cleanedJsonText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            const jsonObj = JSON.parse(cleanedJsonText);

            console.log(`[DEBUG-LLM] ✅ STEP 4: Successfully parsed JSON output.`);
            console.log(`[DEBUG-LLM] -> Quality Score: ${jsonObj.quality_score}`);
            console.log(`[DEBUG-LLM] -> Category assigned: ${jsonObj.category}`);
            console.log('[DEBUG-LLM] =================================================================\n');

            return jsonObj;
        } catch (err) {
            console.error(`\n[DEBUG-LLM] ❌ ERROR with ${modelName}: ${err.message}`);
            if (i < MODELS.length - 1) {
                console.log(`[DEBUG-LLM] 🔄 Retrying with next model: ${MODELS[i + 1]}...`);
            } else {
                console.error('[DEBUG-LLM] ❌ All models failed. Throwing error.');
                console.error('[DEBUG-LLM] =================================================================\n');
                throw err;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK: Basic regex-based metadata extraction (no LLM needed)
// Used when daily LLM budget ($50) is exhausted
// ═══════════════════════════════════════════════════════════════

export function basicMetadataExtraction(code, name) {
    const hasMotion = /framer-motion|motion\./i.test(code);
    const hasDarkBg = /bg-(?:black|gray-9|slate-9|neutral-9|zinc-9)/i.test(code) || /background:\s*#(?:0|1|2)/i.test(code);
    const hasGrid = /grid-cols|grid\s/i.test(code);

    return {
        category: 'uncategorized',
        subcategory: null,
        component_type: name.toLowerCase().replace(/\s+/g, '-'),
        display_name: name,
        description: `Community component: ${name}`,
        visual_description: 'Community-submitted component (auto-analysis pending)',
        mood_tone: 'neutral',
        design_personality: { style: 'unknown', energy: 'neutral', formality: 'neutral' },
        color_mode: hasDarkBg ? 'dark' : 'light',
        color_primary: null,
        color_secondary: null,
        color_accent: null,
        color_background: null,
        color_palette: null,
        color_warmth: null,
        color_theme: null,
        typography_style: null,
        layout_type: hasGrid ? 'grid' : 'full-width',
        suitable_for: ['general'],
        not_suitable_for: [],
        industry_tags: [],
        supports: hasMotion ? ['framer-motion'] : [],
        requires: [],
        responsive: /md:|lg:|sm:/i.test(code),
        has_animation: hasMotion,
        animation_type: hasMotion ? 'framer-motion' : null,
        tags: ['community'],
        keywords: name.toLowerCase().split(/\s+/),
        quality_score: 5.0,  // Neutral score — forces manual review
        language: /\.tsx/.test(code) ? 'tsx' : 'jsx',
        cleaned_code: null,
        code_issues_found: [],
        code_fixes_applied: [],
    };
}
