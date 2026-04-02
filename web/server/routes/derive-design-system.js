import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/provider-helpers.js';
import { log } from '../lib/build-manifest.js';

// ─── Design System Schema ──────────────────────────────────────
const designSystemSchema = z.object({
    colorPalette: z.object({
        primary: z.string().describe('Primary brand color as #hex'),
        secondary: z.string().describe('Secondary color as #hex'),
        accent: z.string().describe('Accent/CTA color as #hex'),
        background: z.string().describe('Page background color as #hex'),
        surface: z.string().describe('Card/surface color as #hex'),
        text: z.string().describe('Primary text color as #hex'),
        textSecondary: z.string().describe('Secondary/muted text color as #hex'),
        gradient: z.string().describe('Tailwind gradient string, e.g. "from-[#hex] to-[#hex]"'),
        mode: z.enum(['dark', 'light', 'mixed']).describe('Overall color mode'),
        mood: z.string().describe('Description of the color mood'),
    }),
    typography: z.object({
        headingFont: z.string().describe('Google Font name for headings'),
        bodyFont: z.string().describe('Google Font name for body text'),
        displaySize: z.string().describe('CSS clamp() for display text, e.g. "clamp(2.5rem, 5vw, 4.5rem)"'),
        headingWeight: z.enum(['700', '800', '900']).describe('Font weight for headings'),
        style: z.string().describe('Typography style description'),
    }),
    imagery: z.object({
        subjects: z.array(z.string()).min(3).max(5).describe('3-5 descriptive image subjects'),
        style: z.string().describe('Photography style description'),
        unsplashKeywords: z.array(z.string()).min(3).max(5).describe('3-5 Unsplash search terms'),
        mood: z.enum(['warm', 'cool', 'neutral', 'vibrant']).describe('Image mood'),
    }),
    layoutPreferences: z.object({
        borderRadius: z.string().describe('CSS border-radius value, e.g. "0.75rem"'),
        spacing: z.enum(['relaxed', 'compact', 'airy']).describe('Overall spacing feel'),
        cardStyle: z.enum(['glass', 'solid', 'outlined', 'elevated']).describe('Preferred card style'),
        sectionPadding: z.string().describe('Tailwind section padding class, e.g. "py-20"'),
    }),
    mood: z.string().describe('Overall mood description for the entire design'),
    industryCategory: z.string().describe('Industry category, e.g. "pet-services", "finance", "restaurant"'),
    designPersonality: z.array(z.string()).min(2).max(5).describe('Design personality traits, e.g. ["friendly", "trustworthy"]'),
});

// ─── System Prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a world-class brand designer and color theorist. Given a website description, you MUST produce a contextually perfect design system.
You MUST output ONLY raw JSON that matches the provided schema perfectly. NO conversation. NO preamble. NO markdown fences.

CRITICAL RULES:
1. The color palette MUST match the industry and purpose.
   - Pet services → warm earth tones (amber, brown, sage green)
   - Finance/Banking → deep blues, grays, gold accents
   - Restaurant → rich warm colors matching cuisine type
   - Tech/SaaS → modern blues, dark slate, electric accents
   - Fashion → black, white, one accent (brand-dependent)
   - Children/Education → bright, cheerful, primary colors
   - Luxury → black, gold, deep navy, minimal palette
   - Health/Wellness → soft greens, clean whites, calming blues
   - Nightlife/Entertainment → deep purples, neon accents, dark bg
   - E-commerce → clean whites, trust-building blues, accent for CTAs
   - Real Estate → warm neutrals, slate blue, premium feel
   - Fitness/Sports → bold energetic colors, dark backgrounds, neon highlights
   - Law/Legal → deep navy, charcoal, burgundy accents
   - Photography/Creative → monochrome with one vibrant accent
   - Food Delivery → warm appetizing colors, clean whites
   - Travel/Tourism → sky blues, sandy neutrals, sunset oranges
   - Music/Audio → dark themes, gradient accents, purple/blue neon
   - Internet Culture/Memes → deep ink navy, electric violet accents, neon highlights on dark

2. Typography MUST match the mood:
   - Professional → Inter, DM Sans, or similar clean sans
   - Playful → Nunito, Quicksand, rounded faces
   - Luxury → Playfair Display, Cormorant, elegant serifs
   - Tech → Space Grotesk, JetBrains Mono, geometric
   - Editorial → Newsreader, Lora, classic serifs
   - Bold/Modern → Syne, Cabinet Grotesk, Clash Display
   - Organic/Natural → Outfit, Plus Jakarta Sans, humanist
   - Sporty/Energetic → Bebas Neue, Oswald, condensed sans

3. Imagery guidance MUST be specific:
   - List 3-5 Unsplash search terms
   - Describe photography style (bright/dark, lifestyle/product, etc.)
   - Specify image mood (warm/cool/neutral/vibrant)

4. Layout preferences MUST be contextual:
   - Playful businesses → more whitespace, rounded corners (1.5rem), cards
   - Corporate → structured grids, minimal decoration, sharp lines (0.25rem)
   - Creative → asymmetric layouts, overlapping elements, bold type
   - Luxury → generous whitespace, airy spacing, glass or elevated cards
   - Tech/SaaS → compact, outlined cards, py-16 sections
   - E-commerce → compact grids, solid cards, efficient spacing

5. LESS IS MORE — design coherence rules:
   - Use a TIGHT palette: 3-4 colors max. Every component should use ONLY these colors.
   - The background, surface, primary, and accent colors must feel like a family.
   - The gradient MUST use ONLY colors already in the palette (primary, secondary, or accent). Do NOT introduce new colors in the gradient.
   - Do NOT over-decorate. A clean, consistent palette beats a busy one.

6. NEVER use generic or bland palettes. Every color choice must feel intentional and industry-appropriate.
7. Text colors MUST have sufficient contrast against the background (WCAG AA minimum).`;

/**
 * POST /api/derive-design-system
 *
 * Design System Derivation Agent. Sits between enhance-prompt and select-components.
 * Analyzes the user's intent and produces a structured design system JSON.
 *
 * Body: { enhancedPrompt, images?, buildId? }
 * Returns: { success, designSystem }
 */
export default async function deriveDesignSystem(req, res) {
    try {
        const { enhancedPrompt, images = [], buildId, model } = req.body;

        if (!enhancedPrompt || typeof enhancedPrompt !== 'string') {
            return res.status(400).json({ success: false, error: 'enhancedPrompt is required' });
        }

        log(buildId, `[derive-design-system] Deriving design system for: ${enhancedPrompt.substring(0, 80)}...`);

        // Build content parts (multi-modal support)
        const content = [
            { type: 'text', text: `Analyze this website specification and produce a perfect design system:\n\n${enhancedPrompt}` }
        ];

        images.forEach((img) => {
            const base64Data = typeof img === 'string' ? img.split(',').pop() : img.data;
            const mimeType = typeof img === 'string' ? (img.match(/data:([^;]+);/) || [])[1] || 'image/png' : img.mimeType;
            content.push({ type: 'image', image: base64Data, mimeType });
        });

        const result = await generateObject({
            model: getModel(model),
            schema: designSystemSchema,
            maxRetries: 7, // Highly resilient config to combat rate limit overloads
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content },
            ],
            temperature: 0,
        });

        const designSystem = result.object;

        log(buildId, `[derive-design-system] Derived: ${designSystem.industryCategory} / ${designSystem.colorPalette.mode} mode / ${designSystem.typography.headingFont} + ${designSystem.typography.bodyFont}`);

        console.log(`[derive-design-system] Design system derived:`, {
            industry: designSystem.industryCategory,
            mode: designSystem.colorPalette.mode,
            primary: designSystem.colorPalette.primary,
            accent: designSystem.colorPalette.accent,
            headingFont: designSystem.typography.headingFont,
            mood: designSystem.mood,
        });

        res.json({ success: true, designSystem });
    } catch (error) {
        console.error('[derive-design-system] Error:', error);
        const isOverloaded = error.name === 'AI_RetryError' || error.message?.includes('maxRetriesExceeded') || error.message?.includes('429') || error.message?.includes('503') || error.message?.includes('overload') || error.message?.includes('high demand');
        
        if (isOverloaded) {
            return res.status(503).json({
                success: false,
                error: 'AI Provider is currently experiencing high demand. Please try again later.'
            });
        }

        // Graceful degradation: if derivation fails for other reasons, return null so pipeline continues without it
        res.json({
            success: true,
            designSystem: null,
            warning: `Design system derivation failed (${error.message}), pipeline will proceed with default styling.`,
        });
    }
}
