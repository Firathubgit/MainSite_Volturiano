import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/provider-helpers.js';
import { resolveLightweightModel } from '../lib/llm-lightweight.js';
import { log } from '../lib/build-manifest.js';

const intentSchema = z.object({
  layoutType: z.enum(['marketing-landing', 'business-site', 'web-app', 'portfolio', 'e-commerce']),
  complexity: z.enum(['simple', 'medium', 'complex']),
  needsPremiumCatalog: z.boolean().describe('True when premium marketplace components are a good fit'),
  suggestedCategories: z
    .array(z.string())
    .describe('e.g. dashboard, charts, navigation, hero, pricing — short slugs'),
  mandatoryStructure: z.object({
    needsHeader: z.boolean(),
    needsHero: z.boolean(),
    needsFooter: z.boolean(),
    needsSidebar: z.boolean()
  })
});

const SYSTEM = `You classify website build requests for a React + Vite + Tailwind pipeline.
Return JSON only via the schema. Be decisive — this steers layout type and structural defaults.

Rules:
- "web-app" = dashboards, admin, tools, finance trackers, CRM, internal apps, data-heavy UIs. Usually needsHero false, needsSidebar may be true.
- "marketing-landing" = single-page marketing, product launch, waitlist — usually needsHero true.
- "business-site" = multi-section brochure, agency, local business with About/Services/Contact.
- "portfolio" = creative portfolio, photographer, case studies.
- "e-commerce" = shop, catalog, cart, checkout.
- needsPremiumCatalog: true for most hybrid builds that can use catalog sections; false only if the user demands something that cannot map to components.`;

/**
 * POST /api/classify-intent
 * Body: { prompt, images?, model?, buildId? }
 */
export default async function classifyIntent(req, res) {
  try {
    const { prompt, model: heavyModel, buildId } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    const lm = resolveLightweightModel(heavyModel || 'google/gemini-3.1-pro-preview');
    if (buildId) {
      log(buildId, `[classify-intent] model=${lm.id}`);
    }

    const userText = prompt.length > 12000 ? `${prompt.slice(0, 12000)}\n…[truncated]` : prompt;

    const result = await generateObject({
      model: getModel(lm.id),
      schema: intentSchema,
      system: SYSTEM,
      prompt: `Classify this request:\n\n${userText}`,
      temperature: 0,
      maxRetries: 2
    });

    const intentClassification = result.object;
    console.log(
      '[BUILDER-VERIFY] classify-intent: layoutType=%s complexity=%s needsHero=%s',
      intentClassification.layoutType,
      intentClassification.complexity,
      intentClassification.mandatoryStructure?.needsHero
    );

    return res.json({ success: true, intentClassification });
  } catch (e) {
    console.error('[classify-intent]', e);
    return res.status(500).json({ success: false, error: e.message || 'classify-intent failed' });
  }
}
