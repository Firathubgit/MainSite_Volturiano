// server/lib/template-analyzer.js
// Phase S10: LLM Multimodal Analysis for Templates (Structured Output)
// Analyzes combined component screenshots to generate template metadata.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMA: Template analysis structured output
// ═══════════════════════════════════════════════════════════════

export const templateAnalysisSchema = z.object({
    generated_name: z.string().describe('A polished display name for this template'),
    generated_description: z.string().describe('2-4 sentence professional description'),
    visual_description: z.string().describe('Detailed visual description: layout flow, color harmony, spacing, overall feel'),
    category: z.string().describe('Primary category (e.g., "landing-page", "portfolio", "saas", "e-commerce", "blog", "agency")'),
    industry_primary: z.string().describe('Primary industry (e.g., "technology", "food", "health", "finance", "creative")'),
    industry_tags: z.array(z.string()).describe('All applicable industries'),
    suitable_for: z.array(z.string()).describe('Use cases this template is great for'),
    color_mode: z.enum(['dark', 'light', 'mixed', 'adaptive']),
    color_palette: z.array(z.string()).nullable().describe('Main colors used across the template'),
    design_system: z.string().nullable().describe('Design system vibe: "glassmorphism", "flat", "neomorphism", "material", "minimal"'),
    typography_style: z.string().nullable().describe('Overall typography feel'),
    layout_flow: z.string().describe('How sections flow: "standard-scroll", "single-page", "multi-section", "dashboard"'),
    mood_tone: z.string().describe('Overall mood: professional, playful, elegant, bold, minimal'),
    theme_score: z.number().min(1).max(10).describe('How cohesive is the visual theme across all components (1-10)'),
    quality_score: z.number().min(1).max(10).describe('Overall quality rating (1-10)'),
    responsive_score: z.number().min(1).max(10).describe('How well would this work on mobile (1-10)'),
    component_harmony: z.number().min(1).max(10).describe('How well do the components work together visually (1-10)'),
    tags: z.array(z.string()).describe('Search tags for discovery'),
    keywords: z.array(z.string()).describe('SEO-friendly keywords'),
    improvement_suggestions: z.array(z.string()).describe('What could make this template better'),
});

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION: Template Components → Structured Metadata
// ═══════════════════════════════════════════════════════════════

/**
 * Multimodal LLM analysis: component details + screenshot → template metadata
 *
 * @param {Object} params
 * @param {Array} params.components - Array of { name, category, description, visual_description }
 * @param {string} [params.screenshotBase64] - Screenshot of the combined template (base64)
 * @param {string} params.templateName - Name given by the submitter
 * @param {string} [params.templateDescription] - Optional description
 * @param {string} params.sourceMode - 'community-composed' or 'community-extracted'
 * @returns {Promise<Object>} Structured analysis result matching templateAnalysisSchema
 */
export async function analyzeTemplate({ components, screenshotBase64, templateName, templateDescription, sourceMode }) {
    const componentSummary = components.map((c, i) =>
        `Section ${i + 1}: "${c.name}" (${c.category}) — ${c.description || c.visual_description || 'No description'}`
    ).join('\n');

    const systemInstruction = `You are an expert website template analyst for the Volturiano AI Website Builder.
A user has submitted a full website template composed of multiple components arranged in order.
Analyze the COMBINATION of these components (and the screenshot if provided) to produce a complete template metadata profile.

Focus on:
1. How well the components work TOGETHER as a cohesive website
2. The overall visual theme, color harmony, and design consistency
3. What industries and use cases this template serves
4. Quality of the overall user experience

QUALITY SCORING RUBRIC:
- 9-10: Production-ready, beautiful, cohesive design, well-structured flow
- 7-8: Good quality, components work well together, minor improvements possible
- 5-6: Decent, functional but not polished or some components feel mismatched
- 3-4: Below average, components don't harmonize well
- 1-2: Poor quality, random components thrown together

THEME SCORE RUBRIC:
- 9-10: Perfect visual consistency — colors, fonts, spacing all match
- 7-8: Mostly consistent with minor mismatches
- 5-6: Some visual inconsistencies but overall acceptable
- 3-4: Noticeable clashes in style
- 1-2: No visual coherence

RESPOND WITH VALID JSON MATCHING THIS STRUCTURE:
{
  "generated_name": "string", "generated_description": "string", "visual_description": "string",
  "category": "string", "industry_primary": "string", "industry_tags": ["string"],
  "suitable_for": ["string"], "color_mode": "dark|light|mixed|adaptive",
  "color_palette": ["string"], "design_system": "string|null", "typography_style": "string|null",
  "layout_flow": "string", "mood_tone": "string",
  "theme_score": number, "quality_score": number, "responsive_score": number,
  "component_harmony": number, "tags": ["string"], "keywords": ["string"],
  "improvement_suggestions": ["string"]
}`;

    const promptText = `Template Name: "${templateName}"
User Description: "${templateDescription || 'Not provided — generate one'}"
Source: ${sourceMode}
Total Sections: ${components.length}

COMPONENT LINEUP (in order, top to bottom):
${componentSummary}

Please respond with valid JSON matching the schema requirements.`;

    const parts = [{ text: promptText }];
    if (screenshotBase64) {
        parts.push({
            inlineData: {
                data: screenshotBase64,
                mimeType: "image/png"
            }
        });
    }

    const MODELS = [
        'gemini-3-flash-preview',
        'gemini-2.5-flash-lite-preview',
    ];

    for (let i = 0; i < MODELS.length; i++) {
        const modelName = MODELS[i];
        try {
            console.log(`[template-analyzer] 🚀 Analyzing template "${templateName}" with ${modelName} (attempt ${i + 1}/${MODELS.length})`);

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction
            });

            const startTime = Date.now();

            // 45 second timeout (templates are more complex than single components)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);

            const result = await model.generateContent({
                contents: [{ role: "user", parts }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                }
            }, { signal: controller.signal });

            clearTimeout(timeoutId);

            console.log(`[template-analyzer] ✅ ${modelName} returned in ${Date.now() - startTime}ms`);

            const responseText = result.response.text();
            const cleanedJsonText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            const jsonObj = JSON.parse(cleanedJsonText);

            console.log(`[template-analyzer] ✅ Parsed: quality=${jsonObj.quality_score}, theme=${jsonObj.theme_score}, category=${jsonObj.category}`);
            return jsonObj;
        } catch (err) {
            console.error(`[template-analyzer] ❌ ERROR with ${modelName}: ${err.message}`);
            if (i < MODELS.length - 1) {
                console.log(`[template-analyzer] 🔄 Retrying with ${MODELS[i + 1]}...`);
            } else {
                console.error('[template-analyzer] ❌ All models failed.');
                throw err;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK: Basic metadata when LLM budget is exhausted
// ═══════════════════════════════════════════════════════════════

export function basicTemplateMetadata(templateName, components) {
    return {
        generated_name: templateName,
        generated_description: `Community template: ${templateName} with ${components.length} sections.`,
        visual_description: 'Community-submitted template (auto-analysis pending)',
        category: 'landing-page',
        industry_primary: 'general',
        industry_tags: ['general'],
        suitable_for: ['general'],
        color_mode: 'adaptive',
        color_palette: null,
        design_system: null,
        typography_style: null,
        layout_flow: 'standard-scroll',
        mood_tone: 'neutral',
        theme_score: 5.0,
        quality_score: 5.0,
        responsive_score: 5.0,
        component_harmony: 5.0,
        tags: ['community', 'template'],
        keywords: templateName.toLowerCase().split(/\s+/),
        improvement_suggestions: ['Manual review needed — LLM analysis was unavailable.'],
    };
}
