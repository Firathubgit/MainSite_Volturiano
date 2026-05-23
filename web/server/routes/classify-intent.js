import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/provider-helpers.js';
import { resolveLightweightModel } from '../lib/llm-lightweight.js';
import { log } from '../lib/build-manifest.js';
import { resolveModelRole } from '../shared/model-registry.js';

const intentSchema = z.object({
  buildMode: z.enum(['single_section', 'single_page_multi_section', 'multi_page', 'app_shell']),
  routingMode: z.enum(['none', 'anchors', 'router']),
  chromeProfile: z.enum(['none', 'minimal', 'marketing', 'app']),
  catalogPosture: z.enum(['catalog_first', 'hybrid', 'codegen_first']),
  layoutType: z.enum(['marketing-landing', 'business-site', 'web-app', 'portfolio', 'e-commerce', 'experimental-widget']),
  complexity: z.enum(['simple', 'medium', 'complex']),
  needsPremiumCatalog: z.boolean().describe('True when premium marketplace components are a good fit'),
  intentConfidence: z.number().min(0).max(1).describe('Confidence score from 0.0 to 1.0'),
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
Return JSON only via the schema. Be decisive — this steers layout type, routing, structure, and community-catalog posture.

Rules:
- "web-app" = dashboards, admin, tools, finance trackers, CRM, internal apps, data-heavy UIs. Usually needsHero false, needsSidebar may be true.
- "experimental-widget" = bypass standard structure and prioritize fully custom functional app behavior over marketplace component matching. Use for single-canvas tools, focused applets, and compact utility apps (e.g. "a girlfriend manager", "a todo app", "a calendar app", "a calculator", "single widget dashboard"). Bypasses headers/footers and should usually set needsPremiumCatalog=false.
- "marketing-landing" = single-page marketing, product launch, waitlist — usually needsHero true.
- "business-site" = multi-section brochure, agency, local business with About/Services/Contact.
- "portfolio" = creative portfolio, photographer, case studies.
- "e-commerce" = shop, catalog, cart, checkout.
- BuildMode mapping:
  - single_section: 1-2 sections, one core hero/tool section.
  - single_page_multi_section: one URL, multiple stacked sections (anchors optional).
  - multi_page: actual routed pages.
  - app_shell: functional dashboard/tool shell (sidebar/topbar cards), often frontend-only.
- routingMode:
  - none = no route chrome needed
  - anchors = one-page section nav
  - router = multipage route structure
- chromeProfile:
  - none/minimal for focused utility widgets
  - marketing for brochure/landing
  - app for dashboard/tool shells
- catalogPosture:
  - catalog_first when community components are a strong fit
  - hybrid when mixed is best
  - codegen_first when user requests fully custom app behavior or "no community/templates"
- needsPremiumCatalog: true for most hybrid builds that can use catalog sections; false when the user asks for fully custom utility/app behavior that does not map well to community components.`;

function applyDeterministicOverrides(prompt = '', intent = {}) {
  const p = String(prompt || '').toLowerCase();
  const explicitNoCommunity = /\b(no community|without community|no templates|from scratch|fully custom)\b/.test(p);
  const explicitSingleSection = /\b(single component|one component|single widget|one widget|single section)\b/.test(p);
  const explicitSinglePage = /\b(single page|one page|one-page|single-page|landing page)\b/.test(p);
  const explicitMultiPage = /\b(multi page|multipage|multiple pages|docs site|documentation site|documentation|routes)\b/.test(p);
  const explicitAppShell =
    /\b(app shell|dashboard|admin panel|backoffice|workspace|kanban|crm|internal tool|control panel|sidebar layout)\b/.test(p);

  const next = { ...intent };

  if (explicitNoCommunity) {
    next.catalogPosture = 'codegen_first';
    next.needsPremiumCatalog = false;
  }
  if (explicitMultiPage) {
    next.buildMode = 'multi_page';
    next.routingMode = 'router';
  } else if (explicitSingleSection) {
    next.buildMode = 'single_section';
    next.routingMode = 'none';
    next.chromeProfile = 'none';
    next.layoutType = 'experimental-widget';
  } else if (explicitSinglePage) {
    next.buildMode = 'single_page_multi_section';
    next.routingMode = 'anchors';
  } else if (explicitAppShell) {
    next.buildMode = 'app_shell';
    next.chromeProfile = 'app';
    if (!explicitMultiPage) next.routingMode = 'none';
    if (!next.layoutType || next.layoutType === 'marketing-landing') next.layoutType = 'web-app';
  } else {
    // Single-page-first default for normal prompts.
    next.buildMode = 'single_page_multi_section';
    next.routingMode = 'anchors';
    next.chromeProfile = 'marketing';
    if (!next.layoutType || next.layoutType === 'experimental-widget' || next.layoutType === 'web-app') {
      next.layoutType = 'marketing-landing';
    }
  }

  return next;
}

/**
 * POST /api/classify-intent
 * Body: { prompt, images?, model?, buildId? }
 */
export default async function classifyIntent(req, res) {
  try {
    const { prompt, rawPrompt = '', model: heavyModel, buildId } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    const lm = resolveLightweightModel(heavyModel || resolveModelRole('generalGeneration'));
    if (buildId) {
      log(buildId, `[classify-intent] model=${lm.id}`);
    }

    const userText = prompt.length > 12000 ? `${prompt.slice(0, 12000)}\n…[truncated]` : prompt;

    const classifyOnce = async (text) =>
      generateObject({
        model: getModel(lm.id),
        schema: intentSchema,
        system: SYSTEM,
        prompt: `Classify this request:\n\n${text}`,
        temperature: 0,
        maxRetries: 2
      });

    const enhancedResult = await classifyOnce(userText);
    let merged = enhancedResult.object;

    const rawText = typeof rawPrompt === 'string' ? rawPrompt.trim() : '';
    if (rawText.length > 0 && rawText !== prompt.trim()) {
      try {
        const rawResult = await classifyOnce(
          rawText.length > 12000 ? `${rawText.slice(0, 12000)}\n…[truncated]` : rawText
        );
        const e = enhancedResult.object;
        const r = rawResult.object;
        const disagrees =
          e.buildMode !== r.buildMode ||
          e.routingMode !== r.routingMode ||
          e.catalogPosture !== r.catalogPosture;
        merged = {
          ...e,
          buildMode: disagrees ? r.buildMode : e.buildMode,
          routingMode: disagrees ? r.routingMode : e.routingMode,
          chromeProfile: disagrees ? r.chromeProfile : e.chromeProfile,
          catalogPosture: disagrees ? r.catalogPosture : e.catalogPosture,
          layoutType: disagrees ? r.layoutType : e.layoutType,
          // Penalize confidence on disagreement so planner can gate.
          intentConfidence: disagrees
            ? Math.max(0, Math.min(e.intentConfidence || 0.6, r.intentConfidence || 0.6) - 0.2)
            : ((e.intentConfidence || 0.7) + (r.intentConfidence || 0.7)) / 2
        };
      } catch (rawErr) {
        console.warn('[classify-intent] raw prompt secondary classification failed:', rawErr?.message || rawErr);
      }
    }

    const intentClassification = applyDeterministicOverrides(rawText || prompt, merged);
    console.log(
      '[BUILDER-VERIFY] classify-intent: layoutType=%s buildMode=%s routingMode=%s confidence=%s',
      intentClassification.layoutType,
      intentClassification.buildMode,
      intentClassification.routingMode,
      intentClassification.intentConfidence
    );

    return res.json({ success: true, intentClassification });
  } catch (e) {
    console.error('[classify-intent]', e);
    return res.status(500).json({ success: false, error: e.message || 'classify-intent failed' });
  }
}
