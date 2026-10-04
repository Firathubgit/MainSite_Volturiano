/**
 * Design Brief Engine — the taste layer.
 *
 * Derives a structured design system (palette, typography, imagery direction,
 * layout feel) from the user's prompt BEFORE the agent starts building, then:
 *   - persists it on the project so every later turn stays on art direction
 *   - renders it as sandbox files (src/styles/tokens.css + DESIGN.md)
 *   - renders it as a compact context block injected into every agent turn
 *
 * Extracted from the legacy routes/derive-design-system.js so the agent-first
 * pipeline can call it directly.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../provider-helpers.js';
import { resolveLightweightModel } from '../llm-lightweight.js';
import { resolveModelRole } from '../../shared/model-registry.js';

// Curated whitelist of quality Google Font pairings (heading + body). The
// model picks fonts freely, but we validate against this list and fall back
// to the closest curated pairing so output never ships an ugly/unknown font.
export const CURATED_FONT_PAIRINGS = [
  { heading: 'Inter', body: 'Inter', vibe: 'professional' },
  { heading: 'DM Sans', body: 'DM Sans', vibe: 'professional' },
  { heading: 'Space Grotesk', body: 'Inter', vibe: 'tech' },
  { heading: 'Syne', body: 'Inter', vibe: 'bold-modern' },
  { heading: 'Playfair Display', body: 'Lora', vibe: 'luxury' },
  { heading: 'Cormorant Garamond', body: 'Outfit', vibe: 'luxury' },
  { heading: 'Newsreader', body: 'Inter', vibe: 'editorial' },
  { heading: 'Bebas Neue', body: 'Inter', vibe: 'sporty' },
  { heading: 'Oswald', body: 'Source Sans 3', vibe: 'sporty' },
  { heading: 'Nunito', body: 'Nunito', vibe: 'playful' },
  { heading: 'Quicksand', body: 'Quicksand', vibe: 'playful' },
  { heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', vibe: 'organic' },
  { heading: 'Outfit', body: 'Outfit', vibe: 'organic' },
  { heading: 'Sora', body: 'Inter', vibe: 'tech' },
  { heading: 'Manrope', body: 'Manrope', vibe: 'professional' }
];

export const designSystemSchema = z.object({
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
  toneOfVoice: z.string().describe('Copywriting tone of voice for all user-visible text, e.g. "confident, warm, no corporate filler"').optional(),
});

export const DESIGN_BRIEF_SYSTEM_PROMPT = `You are a world-class brand designer and color theorist. Given a website description, you MUST produce a contextually perfect design system.
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
   - Tech → Space Grotesk, Sora, geometric
   - Editorial → Newsreader, Lora, classic serifs
   - Bold/Modern → Syne, Manrope
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
 * Derive a design brief from a prompt (+ optional reference images).
 * Returns the structured design system or null on failure (never throws).
 */
export async function deriveDesignBrief({ prompt, images = [], modelId = null, timeoutMs = 20000 } = {}) {
  if (!prompt || typeof prompt !== 'string') return null;

  const effectiveModel = resolveLightweightModel(modelId || resolveModelRole('generalGeneration')).id;

  const content = [
    { type: 'text', text: `Analyze this website specification and produce a perfect design system:\n\n${prompt}` }
  ];
  for (const img of Array.isArray(images) ? images : []) {
    try {
      const base64Data = typeof img === 'string' ? img.split(',').pop() : img.data || img.base64;
      const mimeType = typeof img === 'string'
        ? (img.match(/data:([^;]+);/) || [])[1] || 'image/png'
        : img.mimeType || 'image/png';
      if (base64Data) content.push({ type: 'image', image: base64Data, mimeType });
    } catch { /* skip malformed image */ }
  }

  try {
    const result = await Promise.race([
      generateObject({
        model: getModel(effectiveModel),
        schema: designSystemSchema,
        maxRetries: 3,
        messages: [
          { role: 'system', content: DESIGN_BRIEF_SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        temperature: 0,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('design brief timeout')), timeoutMs))
    ]);
    return normalizeFonts(result.object);
  } catch (error) {
    console.warn('[design-brief] Derivation failed (non-fatal):', error.message);
    return null;
  }
}

function normalizeFonts(designSystem) {
  if (!designSystem?.typography) return designSystem;
  const curatedNames = new Set(CURATED_FONT_PAIRINGS.flatMap((pairing) => [pairing.heading, pairing.body]));
  const { headingFont, bodyFont } = designSystem.typography;

  if (!curatedNames.has(headingFont) || !curatedNames.has(bodyFont)) {
    const fallback = CURATED_FONT_PAIRINGS.find((pairing) => pairing.heading === headingFont)
      || CURATED_FONT_PAIRINGS.find((pairing) => pairing.body === bodyFont)
      || null;
    if (fallback) {
      designSystem.typography.headingFont = fallback.heading;
      designSystem.typography.bodyFont = fallback.body;
    }
    // Unknown but plausibly fine Google Fonts are kept — the whitelist is a
    // quality nudge, not a hard gate.
  }
  return designSystem;
}

/**
 * Render the brief as CSS custom properties for the sandbox.
 */
export function designBriefToTokensCss(ds) {
  if (!ds?.colorPalette) return '';
  const { colorPalette: c, typography: t = {}, layoutPreferences: l = {} } = ds;
  const fontImport = buildGoogleFontImport(t.headingFont, t.bodyFont, t.headingWeight);

  return `/* Design tokens — generated by the Volturiano design brief. Single source of
   truth for the project's art direction. Use these variables (or matching
   Tailwind arbitrary values) instead of inventing new colors per component. */
${fontImport}
:root {
  --color-primary: ${c.primary};
  --color-secondary: ${c.secondary};
  --color-accent: ${c.accent};
  --color-background: ${c.background};
  --color-surface: ${c.surface};
  --color-text: ${c.text};
  --color-text-secondary: ${c.textSecondary};
  --font-heading: '${t.headingFont || 'Inter'}', sans-serif;
  --font-body: '${t.bodyFont || 'Inter'}', sans-serif;
  --heading-weight: ${t.headingWeight || '800'};
  --display-size: ${t.displaySize || 'clamp(2.5rem, 5vw, 4.5rem)'};
  --radius: ${l.borderRadius || '0.75rem'};
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: var(--heading-weight);
}
`;
}

function buildGoogleFontImport(headingFont, bodyFont, headingWeight = '800') {
  const families = [...new Set([headingFont, bodyFont].filter(Boolean))];
  if (!families.length) return '';
  const query = families
    .map((family) => `family=${family.replace(/\s+/g, '+')}:wght@400;500;600;${headingWeight || '800'}`)
    .join('&');
  return `@import url('https://fonts.googleapis.com/css2?${query}&display=swap');\n`;
}

/**
 * Render the brief as a DESIGN.md the agent can read inside the sandbox.
 */
export function designBriefToMarkdown(ds) {
  if (!ds?.colorPalette) return '';
  const { colorPalette: c, typography: t = {}, imagery: img = {}, layoutPreferences: l = {} } = ds;
  return `# Design Brief

This is the project's art direction. Every component, edit, and copy change must stay consistent with it.

## Identity
- Industry: ${ds.industryCategory || 'general'}
- Mood: ${ds.mood || c.mood || ''}
- Personality: ${(ds.designPersonality || []).join(', ')}
- Tone of voice: ${ds.toneOfVoice || 'clear, confident, specific — no corporate filler'}

## Color Palette (${c.mode} mode)
| Token | Value |
|---|---|
| Primary | ${c.primary} |
| Secondary | ${c.secondary} |
| Accent (CTA) | ${c.accent} |
| Background | ${c.background} |
| Surface | ${c.surface} |
| Text | ${c.text} |
| Text secondary | ${c.textSecondary} |

Gradient: \`${c.gradient || ''}\`
Rule: use ONLY these colors. No new hues per component.

## Typography
- Headings: ${t.headingFont} (weight ${t.headingWeight})
- Body: ${t.bodyFont}
- Display size: \`${t.displaySize}\`
- Style: ${t.style || ''}

## Imagery
- Subjects: ${(img.subjects || []).join(', ')}
- Style: ${img.style || ''}
- Mood: ${img.mood || ''}
- Unsplash keywords: ${(img.unsplashKeywords || []).join(', ')}

## Layout
- Border radius: \`${l.borderRadius}\`
- Spacing: ${l.spacing}
- Card style: ${l.cardStyle}
- Section padding: \`${l.sectionPadding}\`

Design tokens live in \`src/styles/tokens.css\`.
`;
}

/**
 * Render the brief as a compact context block for the agent prompt.
 */
export function designBriefToContextBlock(ds) {
  if (!ds?.colorPalette) return '';
  const { colorPalette: c, typography: t = {}, imagery: img = {}, layoutPreferences: l = {} } = ds;
  return [
    '[Design brief — follow on every turn]',
    `Industry: ${ds.industryCategory || 'general'} | Mood: ${ds.mood || c.mood || ''} | Personality: ${(ds.designPersonality || []).join(', ')}`,
    `Palette (${c.mode}): primary ${c.primary}, secondary ${c.secondary}, accent ${c.accent}, bg ${c.background}, surface ${c.surface}, text ${c.text}/${c.textSecondary}. Gradient: ${c.gradient || 'none'}. Use ONLY these colors.`,
    `Type: headings ${t.headingFont} ${t.headingWeight}, body ${t.bodyFont}, display ${t.displaySize}.`,
    `Layout: radius ${l.borderRadius}, spacing ${l.spacing}, cards ${l.cardStyle}, sections ${l.sectionPadding}.`,
    `Imagery: ${(img.subjects || []).slice(0, 3).join(', ')} — ${img.style || ''} (${img.mood || ''}). Unsplash: ${(img.unsplashKeywords || []).join(', ')}.`,
    `Tone of voice: ${ds.toneOfVoice || 'clear, confident, specific'}.`,
    'Design tokens are in src/styles/tokens.css and the full brief in DESIGN.md. Keep all edits consistent with this direction.',
    '[/Design brief]'
  ].join('\n');
}
