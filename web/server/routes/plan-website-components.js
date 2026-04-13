// AI_STABILITY_FIX_V3: Force-Flattened Paths & JSX Enforcement
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/provider-helpers.js';
import { createManifest, updateManifest, log } from '../lib/build-manifest.js';
import { AIBuildNarrator } from '../shared/sse-events.js';
import path from 'node:path';
import { selectComponentsV2 } from '../lib/select-components-v2.js';
import { resolvePrimaryPlanningPrompt } from '../lib/prompt-truth.js';
import { recordComponentSelections } from '../lib/retention-tracker.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { llmLog } from '../lib/llm-logger.js';
import { inferLayoutTypeFromPrompt, LAYOUT_TYPES } from '../lib/layout-type.js';

function normalizeComponentName(name = '') {
  return String(name).toLowerCase().replace(/[-_\s]/g, '');
}

const BUILD_MODES = ['single_section', 'single_page_multi_section', 'multi_page', 'app_shell'];
const ROUTING_MODES = ['none', 'anchors', 'router'];
const CHROME_PROFILES = ['none', 'minimal', 'marketing', 'app'];
const CATALOG_POSTURES = ['catalog_first', 'hybrid', 'codegen_first'];
const LOVABLE_CANONICAL_FALLBACK = String(process.env.LOVABLE_CANONICAL_FALLBACK || 'true').toLowerCase() === 'true';
const LOVABLE_FORCE_LEGACY_PLANNER_FALLBACK =
  String(process.env.LOVABLE_FORCE_LEGACY_PLANNER_FALLBACK || 'false').toLowerCase() === 'true';
const INTENT_CONFIDENCE_HIGH = 0.75;
const INTENT_CONFIDENCE_LOW = 0.45;

function isReplayCutoverReady() {
  const modeAccuracy = Number(process.env.LOVABLE_REPLAY_MODE_ACCURACY || 0);
  const semanticCoverage = Number(process.env.LOVABLE_REPLAY_SEMANTIC_COVERAGE || 0);
  const singlePageDrift = Number(process.env.LOVABLE_REPLAY_SINGLE_PAGE_DRIFT || 100);
  const stableDays = Number(process.env.LOVABLE_REPLAY_STABLE_DAYS || 0);
  return modeAccuracy >= 0.9 && semanticCoverage >= 0.85 && singlePageDrift <= 0.05 && stableDays >= 7;
}

function normalizeBuildMode(mode = '') {
  return BUILD_MODES.includes(mode) ? mode : null;
}

function normalizeRoutingMode(mode = '') {
  return ROUTING_MODES.includes(mode) ? mode : null;
}

function normalizeChromeProfile(profile = '') {
  return CHROME_PROFILES.includes(profile) ? profile : null;
}

function normalizeCatalogPosture(posture = '') {
  return CATALOG_POSTURES.includes(posture) ? posture : null;
}

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function isBackgroundLikeHaystack(haystack = '') {
  return /(^|\b)(background|shader|veil|canvas|parallax|ambient|backdrop|overlay)(\b|$)/.test(haystack);
}

function isBackgroundLikeComponent(comp = {}) {
  const nameId = `${comp?.name || ''} ${comp?.component_id || ''}`.toLowerCase();
  
  // If the component is explicitly a hero, nav, or footer, it is a structural component with its own text, NOT a pure background shell!
  if (/(hero|nav|header|footer|pricing|features|cta|team)/.test(nameId)) {
    return false;
  }

  const haystack = [
    comp?.category,
    comp?.component_id,
    comp?.name,
    comp?.description,
    comp?.visual_description,
    comp?.designFocus
  ].map(normalizeToken).join(' ');
  return isBackgroundLikeHaystack(haystack);
}

function promoteBackgroundToHero(components = [], layoutType = 'marketing-landing', promptText = '') {
  if (!Array.isArray(components) || components.length === 0) return components;
  if (layoutType === 'web-app') return components;

  const idx = components.findIndex((c) => isBackgroundLikeComponent(c));
  if (idx === -1) return components;
  const wantsBackgroundLanding = /(^|\b)(background|shader|veil|hero background|landing background)(\b|$)/i.test(promptText || '');

  const next = [...components];
  const existingHeroIdx = next.findIndex((c, i) => i !== idx && c?.role === 'hero');
  if (existingHeroIdx !== -1 && wantsBackgroundLanding) {
    next[existingHeroIdx] = { ...next[existingHeroIdx], role: 'feature' };
    console.log('[BUILDER-VERIFY] plan hero promotion: demoted existing hero to feature refId=%s', next[existingHeroIdx].refId);
  } else if (existingHeroIdx !== -1 && !wantsBackgroundLanding) {
    return components;
  }
  next[idx] = { ...next[idx], role: 'hero' };
  console.log('[BUILDER-VERIFY] plan hero promotion: promoted background component to hero refId=%s', next[idx].refId);
  return next;
}

function enforceHomeHeroPlacement(pages = [], components = []) {
  if (!Array.isArray(pages) || pages.length === 0) return pages;

  const roleSort = (aId, bId) => {
    const roleOrder = { header: 0, hero: 1, feature: 2, footer: 3 };
    const getRole = (id) => components.find(c => c.refId === id)?.role || 'feature';
    return (roleOrder[getRole(aId)] ?? 2) - (roleOrder[getRole(bId)] ?? 2);
  };

  const result = pages.map((p) => {
    const ids = Array.isArray(p.componentRefIds) ? [...p.componentRefIds] : [];
    return {
      ...p,
      componentRefIds: [...new Set(ids)].sort(roleSort)
    };
  });

  const heroIds = components.filter((c) => c?.role === 'hero').map((c) => c.refId).filter(Boolean);
  if (heroIds.length === 0) return result;

  const homeIndex = result.findIndex((p) => (p.pagePath || p.path || '').trim() === '/');
  if (homeIndex === -1) return result;

  const primaryHeroId = heroIds[0];
  // Ensure primary hero is NOT on other pages if it's a landing hero
  for (let i = 0; i < result.length; i++) {
    if (i === homeIndex) continue;
    result[i].componentRefIds = result[i].componentRefIds.filter((id) => id !== primaryHeroId);
  }

  // Home page already sorted by roleSort, so header (0) should be before hero (1)
  console.log('[BUILDER-VERIFY] plan hero placement: ensured role-based order for all pages');
  return result;
}

function inferRoleFromComponent(dbComp = {}) {
  const haystack = [
    dbComp.category,
    dbComp.component_id,
    dbComp.name,
    dbComp.description,
    dbComp.visual_description
  ].map(normalizeToken).join(' ');

  if (/(^|\b)(header|navbar|navigation|topbar|menu)(\b|$)/.test(haystack)) return 'header';
  if (/(^|\b)(hero|masthead|splash|landing|banner)(\b|$)/.test(haystack)) return 'hero';
  if (/(^|\b)(footer|copyright|site-footer)(\b|$)/.test(haystack)) return 'footer';
  return 'feature';
}

function enforcePlanStructure(components = [], layoutType = 'marketing-landing') {
  const roleOrder = { header: 0, hero: 1, feature: 2, footer: 3 };
  const unique = [];
  const roleSeen = { header: false, hero: false, footer: false };
  const idSeen = new Set();

  for (const comp of components) {
    if (!comp?.refId || idSeen.has(comp.refId)) continue;
    const role = comp.role || 'feature';
    if ((role === 'header' || role === 'hero' || role === 'footer') && roleSeen[role]) {
      if (role === 'header' || role === 'footer') {
        console.log('[BUILDER-VERIFY] enforcePlanStructure: DELETED duplicate %s refId=%s to prevent multiple navs/footers', role, comp.refId);
        continue; // Completely remove duplicate headers and footers!
      }
      unique.push({ ...comp, role: 'feature' });
      idSeen.add(comp.refId);
      console.log('[BUILDER-VERIFY] enforcePlanStructure: demoted duplicate %s to feature refId=%s', role, comp.refId);
      continue;
    }
    unique.push({ ...comp, role });
    idSeen.add(comp.refId);
    if (roleSeen[role] !== undefined) roleSeen[role] = true;
  }

  unique.sort((a, b) => (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2));
  if (layoutType === 'web-app') {
    console.log('[BUILDER-VERIFY] enforcePlanStructure: layoutType=web-app (dedupe only; no hero/footer injection here)');
  }
  return unique;
}

function buildDeterministicMultiPagePlan(components = []) {
  const headerFooter = components.filter(c => c.role === 'header' || c.role === 'footer').map(c => c.refId);
  const content = components.filter(c => c.role !== 'header' && c.role !== 'footer');

  const byIntent = {
    pricing: [],
    reviews: [],
    services: [],
    other: []
  };

  content.forEach(c => {
    const text = `${c.name} ${c.description} ${c.designFocus}`.toLowerCase();
    if (/(pricing|price|plan|tier)/.test(text)) byIntent.pricing.push(c.refId);
    else if (/(review|testimonial|client|marquee)/.test(text)) byIntent.reviews.push(c.refId);
    else if (/(service|feature|booking|calendar|gallery|showcase|grid|scroll)/.test(text)) byIntent.services.push(c.refId);
    else byIntent.other.push(c.refId);
  });

  const homeRefs = [...byIntent.services.slice(0, 2), ...byIntent.other.slice(0, 1)];
  const servicesRefs = [...byIntent.services.slice(2), ...byIntent.other.slice(1, 3)];
  const pricingRefs = [...byIntent.pricing, ...byIntent.reviews.slice(0, 1)];
  const reviewsRefs = [...byIntent.reviews.slice(1)];

  const pages = [
    { pagePath: '/', path: '/', pageLabel: 'Home', pageComponent: 'Home', navVisible: true, componentRefIds: homeRefs },
    { pagePath: '/services', path: '/services', pageLabel: 'Services', pageComponent: 'Services', navVisible: true, componentRefIds: servicesRefs },
    { pagePath: '/pricing', path: '/pricing', pageLabel: 'Pricing', pageComponent: 'Pricing', navVisible: true, componentRefIds: pricingRefs },
    { pagePath: '/reviews', path: '/reviews', pageLabel: 'Reviews', pageComponent: 'Reviews', navVisible: true, componentRefIds: reviewsRefs }
  ].filter(p => p.componentRefIds.length > 0);

  if (pages.length < 2) {
    const allContent = content.map(c => c.refId);
    return {
      isMultiPage: true,
      pages: [
        { pagePath: '/', path: '/', pageLabel: 'Home', pageComponent: 'Home', navVisible: true, componentRefIds: allContent },
        { pagePath: '/about', path: '/about', pageLabel: 'About', pageComponent: 'About', navVisible: true, componentRefIds: allContent.slice(Math.floor(allContent.length / 2)) }
      ],
      sharedComponentRefIds: headerFooter
    };
  }

  return { isMultiPage: true, pages, sharedComponentRefIds: headerFooter };
}

function promptRequestsNoCommunity(promptText = '') {
  return /(^|\b)(no community|without community|do not use community|don't use community|no templates|without templates|from scratch|fully custom|custom app only)(\b|$)/i.test(
    promptText || ''
  );
}

function promptRequestsSinglePage(promptText = '') {
  return /(^|\b)(single page|one page|one-page|single-page|single component|one component|single widget|one widget)(\b|$)/i.test(
    promptText || ''
  );
}

function promptLooksLikeFocusedApp(promptText = '') {
  const text = promptText || '';
  return (
    /(^|\b)(app shell|dashboard|admin panel|workspace|kanban|crm|control panel|internal tool|backoffice|sidebar layout)(\b|$)/i.test(
      text
    )
  );
}

function resolveComponentBudget(layoutType = 'marketing-landing', promptText = '') {
  const singleComponentIntent = promptRequestsSinglePage(promptText);
  if (layoutType === 'experimental-widget') {
    return { max: singleComponentIntent ? 1 : 3 };
  }
  if (layoutType === 'web-app') {
    return { max: 8 };
  }
  if (layoutType === 'business-site' || layoutType === 'e-commerce') {
    return { max: 8 };
  }
  return { max: 7 };
}

function trimComponentsToBudget(components = [], layoutType = 'marketing-landing', promptText = '') {
  const { max } = resolveComponentBudget(layoutType, promptText);
  if (!Array.isArray(components) || components.length <= max) return components;

  // For experimental-widget, prefer pure feature/widget pieces and avoid website chrome.
  if (layoutType === 'experimental-widget') {
    const featureFirst = components
      .filter((c) => c.role === 'feature' || c.role === 'hero')
      .concat(components.filter((c) => c.role !== 'feature' && c.role !== 'hero'));
    return featureFirst.slice(0, max);
  }

  // Keep one structural shell, then cap features.
  const firstHeader = components.find((c) => c.role === 'header');
  const firstHero = components.find((c) => c.role === 'hero');
  const firstFooter = components.find((c) => c.role === 'footer');
  const features = components.filter((c) => c.role === 'feature');

  const kept = [];
  if (firstHeader) kept.push(firstHeader);
  if (firstHero) kept.push(firstHero);
  for (const feat of features) {
    if (kept.length >= max - (firstFooter ? 1 : 0)) break;
    kept.push(feat);
  }
  if (firstFooter && kept.length < max) kept.push(firstFooter);

  const keepIds = new Set(kept.map((c) => c.refId));
  const fill = components.filter((c) => !keepIds.has(c.refId));
  for (const c of fill) {
    if (kept.length >= max) break;
    kept.push(c);
  }
  return kept;
}

function buildCodegenFirstScaffold({
  promptText = '',
  buildMode = 'single_page_multi_section',
  layoutType = 'marketing-landing',
  needsSidebar = false
} = {}) {
  // App shell: always plan TWO generated components so render-app-template can fill <aside> + <main>.
  // A single "SidebarWorkspace" component leaves <main> empty because the shell splits nav vs body.
  if (buildMode === 'app_shell') {
    const brief = promptText || 'App workspace';
    return [
      {
        name: 'SidebarWorkspaceSection',
        refId: 'gen_sidebar_01',
        exportName: 'SidebarWorkspaceSection',
        path: 'src/components/SidebarWorkspaceSection.jsx',
        description:
          'LEFT COLUMN ONLY (~256–320px), flush to viewport: app title, tagline, vertical nav, profile/footer. Root layout must fill the aside (h-full flex flex-col) — no outer margin or floating card chrome. Do NOT put the primary dashboard grid here.',
        designFocus: 'compact sidebar, nav states, icons, branding strip',
        keyContent: brief.slice(0, 220),
        source: 'generated',
        bundleId: null,
        props: {},
        role: 'feature'
      },
      {
        name: 'WorkspaceMainPanel',
        refId: 'gen_mainpanel_01',
        exportName: 'WorkspaceMainPanel',
        path: 'src/components/WorkspaceMainPanel.jsx',
        description:
          'MAIN WORKSPACE (flex-1 right column), edge-to-edge beside sidebar: dashboard summary cards, list/grid, empty state, CTAs. Root must be h-full flex flex-col with no outer mx-auto/max-w that detaches the panel from the shell.',
        designFocus: 'dashboard density, cards, tables or kanban hints, motion, empty states',
        keyContent: brief.slice(0, 220),
        source: 'generated',
        bundleId: null,
        props: {},
        role: 'feature'
      }
    ];
  }

  const focusedApp = promptLooksLikeFocusedApp(promptText);
  if (focusedApp || layoutType === 'experimental-widget' || buildMode === 'single_section') {
    const name = needsSidebar || buildMode === 'app_shell' ? 'SidebarWorkspaceSection' : 'WorkspaceSection';
    return [
      {
        name,
        refId: 'gen_workspace_01',
        exportName: name,
        path: `src/components/${name}.jsx`,
        description:
          'Single viewport app workspace. Left sidebar navigation and draggable relationship cards in the main panel. No landing-page hero, no marketing sections, no extra vertical scroll.',
        designFocus:
          'dense app shell UI, left sidebar, interactive cards, compact spacing, one-screen composition',
        keyContent: promptText || 'Focused relationship management workspace.',
        source: 'generated',
        bundleId: null,
        props: {},
        role: 'feature'
      }
    ];
  }

  return [
    {
      name: 'MainSection',
      refId: 'gen_main_01',
      exportName: 'MainSection',
      path: 'src/components/MainSection.jsx',
      description: 'Primary generated content section tailored to user intent.',
      designFocus: 'clean layout',
      keyContent: promptText || '',
      source: 'generated',
      bundleId: null,
      props: {},
      role: 'feature'
    }
  ];
}

function inferBuildModeFromPrompt(promptText = '', layoutType = 'marketing-landing') {
  if (promptLooksLikeFocusedApp(promptText)) return 'app_shell';
  if (promptRequestsSinglePage(promptText)) {
    if (/(^|\b)(single component|one component|single widget|one widget)(\b|$)/i.test(promptText || '')) {
      return 'single_section';
    }
    return 'single_page_multi_section';
  }
  if (layoutType === 'experimental-widget') return 'single_section';
  if (/(^|\b)(multi page|multipage|multiple pages|docs|documentation)(\b|$)/i.test(promptText || '')) return 'multi_page';
  return 'single_page_multi_section';
}

function inferRoutingModeForBuildMode(buildMode = 'single_page_multi_section', explicitRouting = null) {
  if (explicitRouting) return explicitRouting;
  if (buildMode === 'multi_page') return 'router';
  if (buildMode === 'single_page_multi_section') return 'anchors';
  return 'none';
}

function inferChromeProfileForBuildMode(buildMode = 'single_page_multi_section', explicitProfile = null) {
  if (explicitProfile) return explicitProfile;
  if (buildMode === 'app_shell') return 'app';
  if (buildMode === 'single_section') return 'none';
  return 'marketing';
}

function inferCatalogPosture({ requestedPosture = null, intentPosture = null, disableCommunity = false, promptText = '' } = {}) {
  if (disableCommunity) return 'codegen_first';
  if (requestedPosture) return requestedPosture;
  if (intentPosture) return intentPosture;
  if (/(^|\b)(no community|no templates|from scratch|fully custom)(\b|$)/i.test(promptText || '')) return 'codegen_first';
  return 'hybrid';
}

function extractIntentTerms(promptText = '') {
  return Array.from(
    new Set(
      String(promptText || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4)
    )
  );
}

function validateSemanticFidelity(components = [], promptText = '') {
  const genericResiduePatterns = [
    /\bwelcome to our website\b/i,
    /\byour trusted partner\b/i,
    /\blorem ipsum\b/i,
    /\bexample brand\b/i,
    /\bjane doe\b/i
  ];
  const terms = extractIntentTerms(promptText).slice(0, 40);
  let covered = 0;
  let genericHits = 0;

  for (const c of components) {
    const text = `${c?.name || ''} ${c?.description || ''} ${c?.keyContent || ''} ${JSON.stringify(c?.props || {})}`.toLowerCase();
    if (terms.some((t) => text.includes(t))) covered += 1;
    if (genericResiduePatterns.some((r) => r.test(text))) genericHits += 1;
  }

  const componentCount = Math.max(1, components.length);
  const coverage = covered / componentCount;
  const genericPenalty = genericHits / componentCount;
  const score = Math.max(0, Math.min(1, coverage - genericPenalty * 0.6));
  return {
    score,
    coverage,
    genericPenalty,
    needsRepair: score < 0.55
  };
}

function validatePlanAgainstMode(
  {
    components = [],
    isMultiPage = false,
    pages = [],
    sharedComponentRefIds = [],
    layoutType = 'marketing-landing'
  },
  { buildMode = 'single_page_multi_section', routingMode = 'anchors', promptText = '' } = {}
) {
  let nextComponents = Array.isArray(components) ? [...components] : [];
  let nextPages = Array.isArray(pages) ? [...pages] : [];
  let nextShared = Array.isArray(sharedComponentRefIds) ? [...sharedComponentRefIds] : [];
  let nextIsMultiPage = !!isMultiPage;

  if (buildMode === 'single_section') {
    nextIsMultiPage = false;
    nextPages = [];
    nextShared = [];
    const maxSingle = promptRequestsSinglePage(promptText) ? 1 : 2;
    nextComponents = nextComponents.slice(0, maxSingle);
  } else if (buildMode === 'single_page_multi_section') {
    nextIsMultiPage = false;
    nextPages = [];
    nextShared = [];
    nextComponents = nextComponents.slice(0, 8);
  } else if (buildMode === 'app_shell') {
    const explicitMultiPagePrompt = /(^|\b)(multi page|multipage|multiple pages|docs|documentation)(\b|$)/i.test(promptText || '');
    const routerAppShell = routingMode === 'router' && explicitMultiPagePrompt;
    nextIsMultiPage = routerAppShell;
    // De-emphasize marketing scaffolding for app-shell mode.
    nextComponents = nextComponents.map((c) => {
      if (c.role === 'hero' || c.role === 'footer') return { ...c, role: 'feature' };
      return c;
    });
    if (!routerAppShell) {
      nextPages = [];
      nextShared = [];
    }
  } else if (buildMode === 'multi_page') {
    nextIsMultiPage = true;
    if (nextPages.length === 0) {
      const fallback = buildDeterministicMultiPagePlan(nextComponents);
      nextPages = fallback.pages || [];
      nextShared = fallback.sharedComponentRefIds || [];
    }
  }

  if (nextIsMultiPage) {
    // Ensure each component is mapped once across pages/shared.
    const seen = new Set(nextShared);
    nextPages = nextPages.map((p) => ({
      ...p,
      componentRefIds: (p.componentRefIds || []).filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
    }));

    const missing = nextComponents
      .map((c) => c.refId)
      .filter(Boolean)
      .filter((id) => !seen.has(id));
    if (missing.length > 0) {
      if (!nextPages.length) {
        nextPages = [{ pagePath: '/', path: '/', pageLabel: 'Home', pageComponent: 'Home', navVisible: true, componentRefIds: [] }];
      }
      nextPages[0].componentRefIds = [...(nextPages[0].componentRefIds || []), ...missing];
    }
  }

  nextComponents = trimComponentsToBudget(nextComponents, layoutType, promptText);
  return {
    components: nextComponents,
    isMultiPage: nextIsMultiPage,
    pages: nextPages,
    sharedComponentRefIds: nextShared
  };
}

export default async function planWebsiteComponents(req, res) {
  // premiumMode: 'off' | 'hybrid' | 'strict' (default: 'hybrid')
  // If 'off', the frontend shouldn't have sent selectionContext, but we handle it anyway.
  const {
    prompt,
    images = [],
    model = 'google/gemini-3.1-pro-preview',
    selectionContext,
    designSystem = null,
    buildId,
    generateNarration = false,
    premiumMode = 'hybrid',
    allowCommunityComponents = true,
    buildMode: requestedBuildMode,
    routingMode: requestedRoutingMode,
    chromeProfile: requestedChromeProfile,
    catalogPosture: requestedCatalogPosture,
    manualSelectionIds = [],
    strictMode = false,
    intentClassification = null,
    rawPrompt = ''
  } = req.body;
  console.log(`[plan-website-components] ROUTE HIT | BuildId: ${buildId} | Model: ${model} | PremiumMode: ${premiumMode}`);

  try {
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });
    const primaryPrompt = resolvePrimaryPlanningPrompt(rawPrompt, prompt);
    const disableCommunityByPrompt =
      promptRequestsNoCommunity(prompt) || promptRequestsNoCommunity(primaryPrompt);
    const disableCommunity = allowCommunityComponents === false || disableCommunityByPrompt;
    const intentLayoutTypeRaw =
      intentClassification?.layoutType && LAYOUT_TYPES.includes(intentClassification.layoutType)
        ? intentClassification.layoutType
        : undefined;
    const inferredLayoutForMode = intentLayoutTypeRaw || inferLayoutTypeFromPrompt(primaryPrompt);
    const buildModeFromIntent = normalizeBuildMode(intentClassification?.buildMode);
    const buildModeFromRequest = normalizeBuildMode(requestedBuildMode);
    const intentConfidence =
      typeof intentClassification?.intentConfidence === 'number'
        ? Math.max(0, Math.min(1, intentClassification.intentConfidence))
        : 0.7;
    const effectiveCatalogPosture = inferCatalogPosture({
      requestedPosture: normalizeCatalogPosture(requestedCatalogPosture),
      intentPosture: normalizeCatalogPosture(intentClassification?.catalogPosture),
      disableCommunity,
      promptText: primaryPrompt
    });

    const explicitMultiPagePrompt = /(^|\b)(multi page|multipage|multiple pages|docs|documentation|routes)(\b|$)/i.test(
      primaryPrompt || ''
    );
    const explicitSingleSectionPrompt = /(^|\b)(single component|one component|single widget|one widget|single section)(\b|$)/i.test(
      primaryPrompt || ''
    );
    const explicitAppShellPrompt = promptLooksLikeFocusedApp(primaryPrompt);
    const confidenceTier =
      intentConfidence >= INTENT_CONFIDENCE_HIGH
        ? 'high'
        : intentConfidence < INTENT_CONFIDENCE_LOW
          ? 'low'
          : 'medium';

    // Single-page-first contract:
    // explicit request > trusted request override > deterministic single-page default.
    let finalBuildMode = 'single_page_multi_section';
    if (buildModeFromRequest && buildModeFromRequest !== 'single_page_multi_section') {
      finalBuildMode = buildModeFromRequest;
    } else if (explicitMultiPagePrompt) {
      finalBuildMode = 'multi_page';
    } else if (explicitSingleSectionPrompt) {
      finalBuildMode = 'single_section';
    } else if (explicitAppShellPrompt) {
      finalBuildMode = 'app_shell';
    } else if (buildModeFromIntent === 'single_section') {
      finalBuildMode = 'single_section';
    }

    let finalRoutingMode = inferRoutingModeForBuildMode(
      finalBuildMode,
      normalizeRoutingMode(requestedRoutingMode) || normalizeRoutingMode(intentClassification?.routingMode)
    );
    if (finalBuildMode === 'single_page_multi_section') {
      finalRoutingMode = 'anchors';
    } else if (finalBuildMode === 'app_shell' && !explicitMultiPagePrompt) {
      finalRoutingMode = 'none';
    } else if (finalBuildMode === 'multi_page') {
      finalRoutingMode = 'router';
    }
    const finalChromeProfile = inferChromeProfileForBuildMode(
      finalBuildMode,
      normalizeChromeProfile(requestedChromeProfile) || normalizeChromeProfile(intentClassification?.chromeProfile)
    );
    const confidenceCatalogPosture = effectiveCatalogPosture;
    const forcePremiumOff = confidenceCatalogPosture === 'codegen_first';
    const effectivePremiumMode =
      disableCommunity || confidenceCatalogPosture === 'codegen_first' || forcePremiumOff ? 'off' : premiumMode;
    const forceExperimentalFromPrompt = explicitAppShellPrompt;
    const forceSinglePage =
      forceExperimentalFromPrompt ||
      promptRequestsSinglePage(primaryPrompt) ||
      finalBuildMode === 'single_section' ||
      finalBuildMode === 'single_page_multi_section';

    createManifest(buildId, 'initial');
    log(
      buildId,
      `[plan-website-components] Planning for: ${primaryPrompt.substring(0, 80)}... mode=${effectivePremiumMode} buildMode=${finalBuildMode} routing=${finalRoutingMode} catalogPosture=${confidenceCatalogPosture} confidenceTier=${confidenceTier} disableCommunity=${disableCommunity}`
    );

    // Dynamic fairness rule based on mode
    let fairnessRule = '';
    if (effectivePremiumMode === 'strict') {
      fairnessRule = `CRITICAL ASSIGNMENT RULE (STRICT MODE):
      1. You are FORBIDDEN from generating a custom component if a Premium Component is available in the selection context.
      2. You MUST use the 'bundleId' and set 'source': 'premium' for any component where a Premium option exists in the context.
      3. VIOLATION: Generating a component when a premium one exists will cause a system failure.
      4. Only use 'source': 'generated' if explicitly NO premium component exists for that specific role in the provided context.`;
    } else if (effectivePremiumMode === 'off') {
      fairnessRule = `STRICT GENERATION RULE (PREMIUM MODE OFF):
      1. You are FORBIDDEN from using any premium components.
      2. Set 'source': 'generated' and 'bundleId': null for ALL components.
      3. Focus entirely on original, creative LLM-generation to suit the user's specific request.
      4. IGNORE any SELECTION CONTEXT provided; it is for premium modes only.`;
    } else {
      // Hybrid / Default
      fairnessRule = `fairness_rule: "Treat 'premium' and 'generated' choices equally based on fit. A generated footer is just as valid as a premium one if it fits the prompt better."`;
    }

    const retiredPlannerRules = `fairness=${fairnessRule}`;
    if (process.env.NODE_ENV === 'development' && false) {
      console.debug(retiredPlannerRules);
    }

    // =========================================================================
    // V2 PIPELINE INTEGRATION
    // =========================================================================

    let planData;
    let aiNarration = null;
    let v2Result = null;

    const useLegacyPlannerFallback =
      LOVABLE_FORCE_LEGACY_PLANNER_FALLBACK &&
      LOVABLE_CANONICAL_FALLBACK &&
      !isReplayCutoverReady() &&
      effectivePremiumMode === 'off';
    if (!useLegacyPlannerFallback) {
      // Canonical V2 planner path for strict/hybrid and (when flag is off) codegen-first mode.
      console.log(`[plan-website-components] ⚡ Using canonical V2 planning pipeline (mode=${effectivePremiumMode})`);

      const v2Context = {
        industry: designSystem?.industryCategory || '',
        colorMode: designSystem?.colorPalette?.mode || 'dark',
        warmth:
          designSystem?.imagery?.mood === 'warm'
            ? 'warm'
            : designSystem?.imagery?.mood === 'cool'
              ? 'cool'
              : 'neutral',
        tone: designSystem?.mood || '',
        designPersonality: Array.isArray(designSystem?.designPersonality) ? designSystem.designPersonality : [],
        imageryStyle: designSystem?.imagery?.style || '',
        imagerySubjects: Array.isArray(designSystem?.imagery?.subjects) ? designSystem.imagery.subjects : [],
        imageryKeywords: Array.isArray(designSystem?.imagery?.unsplashKeywords) ? designSystem.imagery.unsplashKeywords : [],
        cardStyle: designSystem?.layoutPreferences?.cardStyle || '',
        spacing: designSystem?.layoutPreferences?.spacing || ''
      };

      // Propagation of EXPLICIT_COMPONENTS from enhance-prompt
      const explicitMatch = `${prompt}\n${primaryPrompt}`.match(/EXPLICIT_COMPONENTS:\s*\[(.*?)\]/i);
      const explicitNames = explicitMatch && explicitMatch[1] ? explicitMatch[1].split(',').map(s => s.trim().replace(/['"`]/g, '')).filter(Boolean) : [];

      // CRITICAL: Also propagate V1 selection results as mandatory components
      // V1 select-components already did a full-catalog LLM selection — V2 must respect it
      const v1ComponentIds = [];
      if (selectionContext?.selections?.length > 0) {
        selectionContext.selections.forEach(s => {
          if (s.componentId && s.confidence >= 0.7) {
            v1ComponentIds.push(s.componentId);
          }
        });
        console.log(`[plan-website-components] 🎯 V1 selected ${v1ComponentIds.length} components to propagate: ${v1ComponentIds.join(', ')}`);
      }

      // Merge: explicit user requests + Manual selections = true mandatory for V2
      // (V1 selections are deliberately excluded from mandatory so they don't overpower the user's 6-10 cap)
      let allMandatory;
      if (strictMode && manualSelectionIds.length > 0) {
        console.log(`[plan-website-components] 🔒 STRICT MODE + MANUAL SELECTION: Only using ${manualSelectionIds.length} user-selected components.`);
        allMandatory = manualSelectionIds;
      } else {
        allMandatory = [...new Set([...explicitNames, ...manualSelectionIds])];
      }

      const intentLayoutType = intentLayoutTypeRaw;
      const needsPremiumCatalogRequested =
        confidenceCatalogPosture === 'catalog_first' ||
        (confidenceCatalogPosture !== 'codegen_first' &&
          !disableCommunity &&
          intentClassification?.needsPremiumCatalog === true);
      v2Result = await selectComponentsV2(primaryPrompt, v2Context, allMandatory, strictMode, model, {
        layoutType: intentLayoutType,
        buildMode: finalBuildMode,
        routingMode: finalRoutingMode,
        chromeProfile: finalChromeProfile,
        catalogPosture: confidenceCatalogPosture,
        suggestedCategories: intentClassification?.suggestedCategories || [],
        needsPremiumCatalog: needsPremiumCatalogRequested,
        allowCommunityTemplates: !disableCommunity && confidenceCatalogPosture !== 'codegen_first'
      });
      let layoutType = v2Result.layoutType || inferLayoutTypeFromPrompt(primaryPrompt);
      if (intentClassification?.layoutType && LAYOUT_TYPES.includes(intentClassification.layoutType)) {
        layoutType = intentClassification.layoutType;
        console.log('[BUILDER-VERIFY] plan layoutType override intentClassification=%s', layoutType);
      }
      if (forceExperimentalFromPrompt) {
        layoutType = 'experimental-widget';
        console.log('[BUILDER-VERIFY] plan layoutType override prompt=experimental-widget');
      }
      console.log('[BUILDER-VERIFY] plan layoutType=%s (v2.payload=%s)', layoutType, v2Result.layoutType || 'inferred');

      // Map V2 components (DB rows) into the exact V1 shape the frontend expects
      let mappedComponents = v2Result.components.map((dbComp, idx) => {
        // Derive clean export name, e.g. "ui_hero_01" -> "UiHero01" -> "HeroSection" (fallback)
        let safeExportName = dbComp.name.replace(/[^a-zA-Z0-9]/g, '');
        if (!safeExportName) safeExportName = `Component${idx}`;

        // Ensure path looks like what the frontend expects for premium injection
        let fakePath = `src/components/premium/${dbComp.component_id}.jsx`;

        return {
          name: dbComp.name,
          refId: dbComp.component_id,
          exportName: safeExportName,
          path: fakePath,
          description: dbComp.description || dbComp.visual_description || 'Premium component',
          designFocus: dbComp.mood_tone || 'modern',
          keyContent: '',
          source: 'premium',
          bundleId: dbComp.component_id,
          props: {},
          role: inferRoleFromComponent(dbComp)
        };
      });

      // In codegen-first posture, do not carry premium catalog components forward.
      if (confidenceCatalogPosture === 'codegen_first') {
        mappedComponents = buildCodegenFirstScaffold({
          promptText: primaryPrompt,
          buildMode: finalBuildMode,
          layoutType,
          needsSidebar: intentClassification?.mandatoryStructure?.needsSidebar === true
        });
        console.log('[BUILDER-VERIFY] plan codegen_first scaffold: using generated components only (%d)', mappedComponents.length);
      }

      // ═══════════════════════════════════════════════════════════════════
      // HYBRID MODE: Add AI-generated components for uncovered categories
      // V2 selects the BEST premium components, but in hybrid mode the LLM
      // also identified customComponentsNeeded (from V1 select-components).
      // We add placeholder "generated" components for those here so the
      // downstream generate-single-component step will create them from scratch.
      // ═══════════════════════════════════════════════════════════════════
      if (effectivePremiumMode === 'hybrid' && confidenceCatalogPosture !== 'codegen_first') {
        const skipMarketingHybrid =
          finalBuildMode === 'app_shell' ||
          layoutType === 'experimental-widget' ||
          promptLooksLikeFocusedApp(primaryPrompt);
        if (skipMarketingHybrid) {
          console.log(
            '[BUILDER-VERIFY] plan hybrid: skipping marketing filler sections (app_shell / experimental-widget / focused-app prompt)'
          );
        } else {
        const coveredRoles = new Set(
          mappedComponents
            .filter((c) => !isBackgroundLikeComponent(c))
            .map((c) => c.role)
        );
        const backgroundCount = mappedComponents.filter((c) => isBackgroundLikeComponent(c)).length;
        if (backgroundCount > 0) {
          console.log('[BUILDER-VERIFY] plan hybrid: %d background component(s) excluded from coveredRoles — they need foreground content', backgroundCount);
        }
        const customNeeded = [...(selectionContext?.customComponentsNeeded || [])];
        if (intentClassification?.mandatoryStructure?.needsSidebar === true || finalBuildMode === 'app_shell') {
          customNeeded.unshift('Sidebar navigation with grouped sections and active state');
        }
        
        // Determine which standard roles are missing (web-app: do not inject marketing hero/footer shells)
        const standardRoles =
          layoutType === 'experimental-widget'
            ? ['feature']
          : layoutType === 'web-app'
            ? ['header', 'feature']
            : ['header', 'hero', 'feature', 'footer'];
        const ms = intentClassification?.mandatoryStructure;
        let fillRoles = standardRoles;
        if (ms) {
          fillRoles = standardRoles.filter((r) => {
            if (r === 'hero' && ms.needsHero === false) return false;
            if (r === 'footer' && ms.needsFooter === false) return false;
            if (r === 'header' && ms.needsHeader === false) return false;
            return true;
          });
        }
        const missingRoles = fillRoles.filter((r) => !coveredRoles.has(r));
        
        // Also add components for any custom needs identified by V1 selection
        const generatedAdditions = [];
        
        const hasBackgroundHero = backgroundCount > 0 && !coveredRoles.has('hero');
        missingRoles.forEach(role => {
          const roleNames = { header: 'HeaderSection', hero: 'HeroSection', feature: 'FeaturesSection', footer: 'FooterSection' };
          const name = roleNames[role] || `${role.charAt(0).toUpperCase() + role.slice(1)}Section`;
          const isOverlayHero = role === 'hero' && hasBackgroundHero;
          generatedAdditions.push({
            name,
            refId: `gen_${role}_01`,
            exportName: name,
            path: `src/components/${name}.jsx`,
            description: isOverlayHero
              ? 'AI-generated hero CONTENT section (headline, subtitle, CTA) designed to be displayed ON TOP of a visual background layer. Use transparent/no background, large bold white text with drop-shadow, and a clear call-to-action button. Do NOT add its own background color or image — it will be overlaid on a shader/visual background component.'
              : `AI-generated ${role} section tailored to the user's specific request`,
            designFocus: isOverlayHero
              ? 'transparent hero content overlay with bold white typography, drop-shadows, and prominent CTA — no background color'
              : 'modern, responsive, visually cohesive with premium components',
            keyContent: '',
            source: 'generated',
            bundleId: null,
            props: null,
            role
          });
          if (isOverlayHero) {
            console.log('[BUILDER-VERIFY] plan hybrid: injected overlay hero content component (backgrounds need foreground content)');
          }
        });

        // Add extra AI-generated sections for custom needs (e.g. "Testimonials", "Specs Table")
        customNeeded.forEach((desc, idx) => {
          const safeName = desc.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
          if (!mappedComponents.some(c => c.exportName === safeName) && !generatedAdditions.some(c => c.exportName === safeName)) {
            generatedAdditions.push({
              name: safeName || `CustomSection${idx}`,
              refId: `gen_custom_${idx}`,
              exportName: safeName || `CustomSection${idx}`,
              path: `src/components/${safeName || `CustomSection${idx}`}.jsx`,
              description: desc,
              designFocus: 'modern, matches design system',
              keyContent: '',
              source: 'generated',
              bundleId: null,
              props: null,
              role: 'feature'
            });
          }
        });

        if (generatedAdditions.length > 0) {
          console.log(`[plan-website-components] 🔀 HYBRID: Adding ${generatedAdditions.length} AI-generated components alongside ${mappedComponents.length} premium ones:`);
          generatedAdditions.forEach(c => console.log(`  └─ [GENERATED] ${c.exportName} (${c.role}): ${c.description}`));
          mappedComponents.push(...generatedAdditions);
        } else {
          console.log(`[plan-website-components] 🔀 HYBRID: V2 covered all needed categories. No extra AI components needed.`);
        }
        }
      }

      const roleAdjusted = promoteBackgroundToHero(mappedComponents, layoutType, primaryPrompt);
      const structuredComponents = enforcePlanStructure(roleAdjusted, layoutType);
      if (structuredComponents.length !== mappedComponents.length) {
        console.log(`[plan-website-components] Structural dedupe removed ${mappedComponents.length - structuredComponents.length} duplicate role component(s).`);
      }
      console.log(`[plan-website-components] ✍️ Starting Master Copywriter & MPA Architect for ${structuredComponents.length} components...`);

      const modePrefersMultiPage = finalBuildMode === 'multi_page' || finalRoutingMode === 'router';
      let copyResult = { components: [], isMultiPage: modePrefersMultiPage, pages: [], sharedComponentRefIds: [] };
      try {
        const copyPrompt = `You are a world-class web architect and conversion copywriter. 
        The user wants a website for: "${primaryPrompt}"
        The design system is: ${JSON.stringify(designSystem)}
        Build mode contract:
        - buildMode: ${finalBuildMode}
        - routingMode: ${finalRoutingMode}
        - chromeProfile: ${finalChromeProfile}
        - catalogPosture: ${confidenceCatalogPosture}
        
        I have selected ${structuredComponents.length} components for this site. 
        Your job is TWO-FOLD:
        PART A - ARCHITECTURE: Respect buildMode strictly.
          - single_section: compact one-surface composition, isMultiPage=false
          - single_page_multi_section: one long single page, isMultiPage=false
          - multi_page: routed pages with shared nav/footer, isMultiPage=true
          - app_shell: functional app/dashboard shell; default isMultiPage=false unless routingMode=router
        PART B - COPYWRITING: Generate copy for each component that fits the user's actual business and brief — not generic filler. Prefer specific, client-appropriate headlines, CTAs, and feature text (high-converting where it fits).
        
        COMPONENTS REQUIRING ATTENTION:
        ${structuredComponents.map(c => `- NAME: ${c.name} | REF_ID: ${c.refId} | ROLE: ${c.role} | DESC: ${c.description}`).join('\n')}
        
        RULES:
        1. Determine isMultiPage from buildMode + routingMode first, not from generic defaults.
        2. Keep 'header' and 'footer' role components in 'sharedComponentRefIds' so they render on all pages.
        3. Assign EVERY single one of the remaining refIds to at least one page.
        4. For each component, generate 'keyContent' and 'props' (array of {key, value} strings) matching the tone: ${designSystem?.mood || 'professional'}.
        5. Common props: 'title', 'subtitle', 'description', 'primaryBtnText', 'features'.
        6. If a selected component is a visual background/shader/veil type, place it as the hero/landing layer on Home ("/"), not mid-page.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); 

        const schema = z.object({
          components: z.array(z.object({
            name: z.string(),
            keyContent: z.string(),
            props: z.array(z.object({
              key: z.string(),
              value: z.string()
            }))
          })),
          isMultiPage: z.boolean().describe("Must align with buildMode/routingMode contract."),
          pages: z.array(z.object({
            pagePath: z.string(),
            pageLabel: z.string(),
            pageComponent: z.string(),
            navVisible: z.boolean(),
            componentRefIds: z.array(z.string())
          })).describe("Page definitions with routes. Required for OpenAI schema validation."),
          sharedComponentRefIds: z.array(z.string()).describe("RefIds of components shared across ALL pages.")
        });

        llmLog.request('COPYWRITER', {
          model,
          systemPrompt: 'Senior Web Architect & Copywriter',
          userPrompt: copyPrompt,
          schema: schema,
          temperature: 0.2
        });

        const startMs = Date.now();
        const { object } = await generateObject({
          model: getModel(model),
          maxRetries: 3, 
          schema,
          prompt: copyPrompt,
          temperature: 0.2,
          abortSignal: controller.signal
        });
        clearTimeout(timeoutId);

        llmLog.response('COPYWRITER', {
          response: object,
          durationMs: Date.now() - startMs
        });

        copyResult = object;
      } catch (copyErr) {
        console.warn('[plan-website-components] Copywriter/Architect failed, using single-page default:', copyErr);
      }

      // Merge copy back into mapped components
      const finalComponents = structuredComponents.map(c => {
        const copy = copyResult.components?.find(
          (cc) =>
            cc.name === c.name ||
            normalizeComponentName(cc.name) === normalizeComponentName(c.name)
        );
        if (copy && copy.name !== c.name) {
          console.log(
            '[BUILDER-VERIFY] plan copy merge: fuzzyMatched planComponent="%s" copywriterRow="%s"',
            c.name,
            copy.name
          );
        }
        return {
          ...c,
          keyContent: copy?.keyContent || c.description,
          props: copy?.props ? Object.fromEntries(copy.props.map(p => [p.key, p.value])) : {}
        };
      });

      const deterministicMpa = buildDeterministicMultiPagePlan(finalComponents);
      const copyPagesWithHero = enforceHomeHeroPlacement(copyResult.pages || [], finalComponents);
      const fallbackPagesWithHero = enforceHomeHeroPlacement(deterministicMpa.pages || [], finalComponents);
      const forceSinglePageNow = forceSinglePage || layoutType === 'experimental-widget';
      const modeLockedMultiPage =
        finalBuildMode === 'multi_page'
          ? true
          : (finalBuildMode === 'single_section' || finalBuildMode === 'single_page_multi_section')
            ? false
            : null;
      const useMultiPage =
        modeLockedMultiPage !== null
          ? modeLockedMultiPage
          : (!forceSinglePageNow && (finalRoutingMode === 'router' || copyResult.isMultiPage !== false));
      planData = {
        buildMode: finalBuildMode,
        routingMode: finalRoutingMode,
        chromeProfile: finalChromeProfile,
        catalogPosture: confidenceCatalogPosture,
        components: finalComponents,
        layoutType,
        complexity:
          intentClassification?.complexity ||
          (finalComponents.length <= 6 ? 'simple' : finalComponents.length <= 9 ? 'medium' : 'complex'),
        globalStyle: `/* Design System Globals */
        :root {
          --primary: ${designSystem?.colorPalette?.primary || '#3b82f6'};
          --accent: ${designSystem?.colorPalette?.accent || '#6366f1'};
        }`,
        appImports: [],
        requiredPackages: [],
        appComposition: {
          order: finalComponents.map(c => ({ refId: c.refId }))
        },
        isMultiPage: useMultiPage,
        pages: useMultiPage
          ? ((copyPagesWithHero && copyPagesWithHero.length > 0) ? copyPagesWithHero : fallbackPagesWithHero)
          : [],
        sharedComponentRefIds: useMultiPage
          ? ((copyResult.sharedComponentRefIds && copyResult.sharedComponentRefIds.length > 0)
            ? copyResult.sharedComponentRefIds
            : deterministicMpa.sharedComponentRefIds)
          : []
      };

      // V2 Narration
      if (generateNarration) {
        try {
          const narrator = new AIBuildNarrator();
          aiNarration = await narrator.narrate('planning', {
            prompt: primaryPrompt,
            componentCount: structuredComponents.length,
            premiumCount: structuredComponents.filter(c => c.source === 'premium').length,
            customCount: 0,
            premiumMode
          }, { buildModelId: model });
        } catch (e) { }
      }

      // Record AI selections for usage feedback loop
      recordComponentSelections(buildId, structuredComponents.map(c => ({
        componentId: c.refId,
        confidence: 0.8 // Using 0.8 as baseline confidence for V2 selections
      })));

      // ─── TEMPLATE USAGE TRACKING (Phase S10 Mega Prompt 5) ───
      if (v2Result.templateUsed) {
        console.group('[Template Usage Tracking] ════════════════════════════════');
        const tpl = v2Result.templateUsed;
        console.log('[Template Usage] 📦 Template was used by AI pipeline!');
        console.log('[Template Usage] Template ID:', tpl.templateId);
        console.log('[Template Usage] Confidence:', tpl.confidence);
        console.log('[Template Usage] Reasoning:', tpl.reasoning);

        // 1. Increment template usage_count
        console.log('[Template Usage] 📊 Step 1: Incrementing usage_count...');
        try {
          console.log('[Template Usage] Trying RPC: increment_template_usage...');
          const { error: rpcErr } = await supabaseAdmin.rpc('increment_template_usage', { p_template_id: tpl.templateId });

          if (rpcErr) {
            console.warn('[Template Usage] ⚠️ RPC increment_template_usage failed:', rpcErr.message);
            console.log('[Template Usage] 💡 RPC may not exist yet — falling back to manual increment');

            // Fallback: manual read + increment
            console.log('[Template Usage] Reading current usage_count from templates table...');
            const { data: tplData, error: readErr } = await supabaseAdmin
              .from('templates')
              .select('usage_count')
              .eq('id', tpl.templateId)
              .single();

            if (readErr) {
              console.error('[Template Usage] ❌ Failed to read template:', readErr.message);
            } else if (tplData) {
              const oldCount = tplData.usage_count || 0;
              const newCount = oldCount + 1;
              console.log('[Template Usage] Current usage_count:', oldCount, '→ new:', newCount);

              const { error: updateErr } = await supabaseAdmin
                .from('templates')
                .update({ usage_count: newCount })
                .eq('id', tpl.templateId);

              if (updateErr) {
                console.error('[Template Usage] ❌ Failed to update usage_count:', updateErr.message);
              } else {
                console.log('[Template Usage] ✅ usage_count updated to', newCount);
              }
            } else {
              console.error('[Template Usage] ❌ Template not found in DB for id:', tpl.templateId);
            }
          } else {
            console.log('[Template Usage] ✅ RPC increment_template_usage succeeded');
          }
        } catch (e) {
          console.error('[Template Usage] 💥 usage_count tracking EXCEPTION:', e.message);
          console.error('[Template Usage] Stack:', e.stack);
        }

        // 2. Award reputation to template author (+3 points per AI usage)
        console.log('[Template Usage] 🏆 Step 2: Awarding reputation...');
        try {
          console.log('[Template Usage] Fetching template author_id...');
          const { data: template, error: authorErr } = await supabaseAdmin
            .from('templates')
            .select('author_id')
            .eq('id', tpl.templateId)
            .single();

          if (authorErr) {
            console.error('[Template Usage] ❌ Failed to fetch template author:', authorErr.message);
          } else if (!template?.author_id) {
            console.warn('[Template Usage] ⚠️ Template has no author_id — cannot award reputation');
            console.log('[Template Usage] Template data:', JSON.stringify(template));
          } else {
            console.log('[Template Usage] Author found:', template.author_id);
            console.log('[Template Usage] Calling RPC: increment_reputation(user:', template.author_id, ', points: 3)');
            const { error: repErr } = await supabaseAdmin.rpc('increment_reputation', {
              p_user_id: template.author_id,
              p_points: 3,
            });
            if (repErr) {
              console.error('[Template Usage] ❌ Reputation RPC failed:', repErr.message);
              console.log('[Template Usage] 💡 The increment_reputation RPC function may not exist');
            } else {
              console.log('[Template Usage] ✅ +3 reputation awarded to template author:', template.author_id);
            }
          }
        } catch (e) {
          console.error('[Template Usage] 💥 Reputation award EXCEPTION:', e.message);
          console.error('[Template Usage] Stack:', e.stack);
        }

        console.groupEnd();
      } else {
        console.log('[plan-website-components] 📦 No template was used — v2Result.templateUsed is', v2Result.templateUsed === undefined ? 'undefined' : v2Result.templateUsed === null ? 'null' : 'falsy');
      }

    } else {
      // Legacy V1 planner is removed. Fallback now uses deterministic conservative scaffolding.
      console.log('[plan-website-components] Using conservative fallback planner (legacy V1 removed).');
      const fallbackLayoutType =
        (intentLayoutTypeRaw && LAYOUT_TYPES.includes(intentLayoutTypeRaw))
          ? intentLayoutTypeRaw
          : (finalBuildMode === 'app_shell' ? 'web-app' : inferLayoutTypeFromPrompt(primaryPrompt));
      const baseComponents =
        finalBuildMode === 'single_section' || finalBuildMode === 'app_shell'
          ? [
              { name: 'CoreSection', refId: 'gen_core_01', exportName: 'CoreSection', path: 'src/components/CoreSection.jsx', description: 'Primary functional section for the requested use-case', designFocus: 'focused layout', keyContent: primaryPrompt.slice(0, 180), source: 'generated', bundleId: null, props: {}, role: 'feature' }
            ]
          : [
              { name: 'HeaderSection', refId: 'gen_header_01', exportName: 'HeaderSection', path: 'src/components/HeaderSection.jsx', description: 'Primary navigation header', designFocus: 'clean nav', keyContent: '', source: 'generated', bundleId: null, props: {}, role: 'header' },
              { name: 'MainSection', refId: 'gen_main_01', exportName: 'MainSection', path: 'src/components/MainSection.jsx', description: 'Main content for the requested website', designFocus: 'modern content blocks', keyContent: primaryPrompt.slice(0, 180), source: 'generated', bundleId: null, props: {}, role: 'feature' },
              { name: 'FooterSection', refId: 'gen_footer_01', exportName: 'FooterSection', path: 'src/components/FooterSection.jsx', description: 'Footer with utility links', designFocus: 'minimal footer', keyContent: '', source: 'generated', bundleId: null, props: {}, role: 'footer' }
            ];
      const fallbackComponents = trimComponentsToBudget(
        enforcePlanStructure(baseComponents, fallbackLayoutType),
        fallbackLayoutType,
        primaryPrompt
      );
      planData = {
        buildMode: finalBuildMode,
        routingMode: finalRoutingMode,
        chromeProfile: finalChromeProfile,
        catalogPosture: confidenceCatalogPosture,
        components: fallbackComponents,
        layoutType: fallbackLayoutType,
        complexity: 'simple',
        globalStyle: '',
        appImports: [],
        requiredPackages: [],
        appComposition: { order: fallbackComponents.map((c) => ({ refId: c.refId })) },
        isMultiPage: finalBuildMode === 'multi_page',
        pages: finalBuildMode === 'multi_page'
          ? [{ pagePath: '/', path: '/', pageLabel: 'Home', pageComponent: 'Home', navVisible: true, componentRefIds: fallbackComponents.map((c) => c.refId) }]
          : [],
        sharedComponentRefIds: finalBuildMode === 'multi_page'
          ? fallbackComponents.filter((c) => c.role === 'header' || c.role === 'footer').map((c) => c.refId)
          : []
      };
    }

    // =========================================================================
    // END V2 PIPELINE INTEGRATION
    // =========================================================================


    // HARDENING: Force-correct all paths locally before returning
    // This stops AI "sub-folder hallucinations" from reaching the client
    // V4.0: Also allows src/pages/ paths for multi-page sites
    const flattenedComponentsRaw = planData.components.map(c => {
      const baseName = path.basename(c.path).trim();
      let flatPath = `src/components/${baseName}`;

      // Preserve specialized premium subfolder paths if coming from V2 pipeline
      if (c.path.includes('src/components/premium/')) {
        flatPath = c.path;
      } else if (c.path.includes('src/pages/')) {
        // V4.0: Allow page-level paths for MPA sites
        flatPath = c.path;
      } else {
        // Clean up potential double extensions or spaces
        flatPath = flatPath.replace(/\.jsx\s*\.jsx$/, '.jsx');
        if (flatPath.endsWith('.js') || flatPath.endsWith('.tsx')) {
          flatPath = flatPath.replace(/\.(js|tsx)$/, '.jsx');
        } else if (!flatPath.endsWith('.jsx')) {
          flatPath += '.jsx';
        }
      }
      return { ...c, path: flatPath };
    });

    const layoutTypeResolved = planData.layoutType || inferLayoutTypeFromPrompt(primaryPrompt);
    let flattenedComponents = enforcePlanStructure(flattenedComponentsRaw, layoutTypeResolved);
    flattenedComponents = trimComponentsToBudget(flattenedComponents, layoutTypeResolved, primaryPrompt);

    // Double-check mandatory components (web-app: header only; hero/footer not injected)
    const hasHeader = flattenedComponents.some(c => c.role === 'header');
    const hasHero = flattenedComponents.some(c => c.role === 'hero');
    const hasFooter = flattenedComponents.some(c => c.role === 'footer');

    const msFlat = intentClassification?.mandatoryStructure;
    const isExperimentalWidget = layoutTypeResolved === 'experimental-widget';
    const appShellMode = (planData.buildMode || finalBuildMode) === 'app_shell';
    const needHeader = !appShellMode && !isExperimentalWidget && !hasHeader && msFlat?.needsHeader !== false;
    const needHero =
      !isExperimentalWidget && layoutTypeResolved !== 'web-app' && !hasHero && msFlat?.needsHero !== false;
    const needFooter =
      !isExperimentalWidget && layoutTypeResolved !== 'web-app' && !hasFooter && msFlat?.needsFooter !== false;

    if (needHeader || needHero || needFooter) {
      console.warn('[plan-website-components] Warning: Component plan missing mandatory roles! Injecting safe placeholders.', {
        layoutType: layoutTypeResolved,
        hasHeader,
        hasHero,
        hasFooter,
        willInject: { header: needHeader, hero: needHero, footer: needFooter }
      });
      const additions = [];
      if (needHeader) {
        additions.push({
          name: 'HeaderSection',
          refId: 'gen_header_fallback',
          exportName: 'HeaderSection',
          path: 'src/components/HeaderSection.jsx',
          description: 'Fallback generated header section',
          designFocus: 'clean navigation',
          keyContent: 'Premium Service Navigation',
          source: 'generated',
          bundleId: null,
          props: {},
          role: 'header'
        });
      }
      if (needHero) {
        additions.push({
          name: 'HeroSection',
          refId: 'gen_hero_fallback',
          exportName: 'HeroSection',
          path: 'src/components/HeroSection.jsx',
          description: 'Fallback generated hero section',
          designFocus: 'strong primary messaging',
          keyContent: 'Luxury Car Service Experience',
          source: 'generated',
          bundleId: null,
          props: {},
          role: 'hero'
        });
      }
      if (needFooter) {
        additions.push({
          name: 'FooterSection',
          refId: 'gen_footer_fallback',
          exportName: 'FooterSection',
          path: 'src/components/FooterSection.jsx',
          description: 'Fallback generated footer section',
          designFocus: 'clear contact and legal links',
          keyContent: 'Book your premium service drop-off',
          source: 'generated',
          bundleId: null,
          props: {},
          role: 'footer'
        });
      }
      flattenedComponents = enforcePlanStructure([...flattenedComponents, ...additions], layoutTypeResolved);
    }

    // Centralized semantic fidelity validation with one repair pass.
    let semanticCheck = validateSemanticFidelity(flattenedComponents, primaryPrompt);
    if (semanticCheck.needsRepair) {
      console.warn(
        '[plan-website-components] semantic fidelity low (score=%s). Running one repair pass.',
        semanticCheck.score.toFixed(2)
      );
      try {
        const repairSchema = z.object({
          components: z.array(
            z.object({
              refId: z.string(),
              keyContent: z.string(),
              props: z.array(z.object({ key: z.string(), value: z.string() }))
            })
          )
        });
        const repairPrompt = `Repair semantic fidelity for this website prompt:
"${primaryPrompt}"

Rewrite component copy so it clearly matches the user's domain and use-case. Avoid generic template filler.
Return updated keyContent and props only.

COMPONENTS:
${flattenedComponents
  .map(
    (c) =>
      `- refId=${c.refId} name=${c.name} role=${c.role} description=${c.description} keyContent=${c.keyContent || ''}`
  )
  .join('\n')}`;
        const repairResult = await generateObject({
          model: getModel(model),
          schema: repairSchema,
          prompt: repairPrompt,
          temperature: 0.1,
          maxRetries: 1
        });
        const byRef = new Map((repairResult.object?.components || []).map((c) => [c.refId, c]));
        flattenedComponents = flattenedComponents.map((c) => {
          const repaired = byRef.get(c.refId);
          if (!repaired) return c;
          return {
            ...c,
            keyContent: repaired.keyContent || c.keyContent,
            props: repaired.props ? Object.fromEntries(repaired.props.map((p) => [p.key, p.value])) : c.props
          };
        });
      } catch (repairErr) {
        console.warn('[plan-website-components] semantic repair failed:', repairErr?.message || repairErr);
      }
      semanticCheck = validateSemanticFidelity(flattenedComponents, primaryPrompt);
      if (semanticCheck.needsRepair) {
        console.warn(
          '[plan-website-components] semantic fidelity still low after repair (score=%s). Applying conservative fallback mode.',
          semanticCheck.score.toFixed(2)
        );
        planData.catalogPosture = disableCommunity ? 'codegen_first' : 'hybrid';
      }
    }

    planData.layoutType = layoutTypeResolved;

    // Calculate component counts and packages
    const premiumCount = flattenedComponents.filter(c => c.source === 'premium').length;
    const generatedCount = flattenedComponents.filter(c => c.source === 'generated').length;

    // Merge AI planned packages with selection context packages
    const requiredPackages = new Set([
      ...(planData.requiredPackages || []),
      ...(selectionContext?.requiredPackages || []),
      'framer-motion',
      'lucide-react',
      'react-icons', // Force mandatory
      'clsx',
      'tailwind-merge'
    ]);
    if (planData.isMultiPage || finalRoutingMode === 'router' || planData.routingMode === 'router') {
      requiredPackages.add('react-router-dom');
    }

    if (planData.appImports) {
      planData.appImports.forEach(pkg => {
        if (pkg.includes('lucide')) requiredPackages.add('lucide-react');
        if (pkg.includes('motion')) requiredPackages.add('framer-motion');
        if (pkg.includes('router')) requiredPackages.add('react-router-dom');
      });
    }

    // Sync appComposition with the enforced sort order
    const validAppComposition = {
      order: flattenedComponents.map(c => ({ refId: c.refId || c.name }))
    };

    // Normalize page paths so router always has a root route
    let normalizedPages = Array.isArray(planData.pages) ? [...planData.pages] : [];

    const finalRoleSort = (aId, bId) => {
      const roleOrder = { header: 0, hero: 1, feature: 2, footer: 3 };
      const getRole = (id) => flattenedComponents.find(c => (c.refId === id || c.name === id))?.role || 'feature';
      return (roleOrder[getRole(aId)] ?? 2) - (roleOrder[getRole(bId)] ?? 2);
    };

    normalizedPages = normalizedPages.map((p, index) => {
      const rawPath = String(p?.pagePath || p?.path || '/').trim();
      let pagePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      if (pagePath === '/home' || pagePath === '/index') pagePath = '/';
      if (index === 0 && !pagePath) pagePath = '/';

      // FINAL ORDER ENFORCEMENT for components within a page
      const sortedIds = (p.componentRefIds || []).sort(finalRoleSort);

      return {
        ...p,
        pagePath,
        path: pagePath,
        componentRefIds: sortedIds
      };
    });
    if ((planData.isMultiPage || false) && normalizedPages.length === 0) {
      normalizedPages = [
        { pagePath: '/', path: '/', pageLabel: 'Home', pageComponent: 'Home', navVisible: true, componentRefIds: flattenedComponents.map(c => c.refId) }
      ];
    } else if (normalizedPages.length > 0 && !normalizedPages.some(p => p.pagePath === '/')) {
      normalizedPages[0] = { ...normalizedPages[0], pagePath: '/', path: '/' };
    }

    const modeValidated = validatePlanAgainstMode(
      {
        components: flattenedComponents,
        isMultiPage: planData.isMultiPage || false,
        pages: normalizedPages,
        sharedComponentRefIds: planData.sharedComponentRefIds || [],
        layoutType: layoutTypeResolved
      },
      {
        buildMode: planData.buildMode || finalBuildMode,
        routingMode: planData.routingMode || finalRoutingMode,
        promptText: primaryPrompt
      }
    );
    flattenedComponents = modeValidated.components;
    normalizedPages = modeValidated.pages;
    planData.isMultiPage = modeValidated.isMultiPage;
    planData.sharedComponentRefIds = modeValidated.sharedComponentRefIds;

    const replaySnapshot = {
      modeAccuracy: Number(process.env.LOVABLE_REPLAY_MODE_ACCURACY || 0),
      semanticCoverage: Number(process.env.LOVABLE_REPLAY_SEMANTIC_COVERAGE || 0),
      singlePageDrift: Number(process.env.LOVABLE_REPLAY_SINGLE_PAGE_DRIFT || 100),
      stableDays: Number(process.env.LOVABLE_REPLAY_STABLE_DAYS || 0)
    };
    const cutoverReady =
      replaySnapshot.modeAccuracy >= 0.9 &&
      replaySnapshot.semanticCoverage >= 0.85 &&
      replaySnapshot.singlePageDrift <= 0.05 &&
      replaySnapshot.stableDays >= 7;

    const metrics = {
      buildMode: planData.buildMode || finalBuildMode,
      layoutType: layoutTypeResolved,
      isMultiPage: planData.isMultiPage || false,
      componentCount: flattenedComponents.length,
      catalogPosture: planData.catalogPosture || confidenceCatalogPosture,
      intentConfidence,
      intentConfidenceTier: confidenceTier,
      semantic: semanticCheck,
      replaySnapshot,
      cutoverReady,
      templateUsed: !!v2Result?.templateUsed,
      mismatch: {
        intentVsFinalBuildMode:
          normalizeBuildMode(intentClassification?.buildMode) &&
          normalizeBuildMode(intentClassification?.buildMode) !== (planData.buildMode || finalBuildMode),
        explicitSinglePageEndedMultiPage:
          forceSinglePage && (planData.isMultiPage || false),
        appShellForcedMarketing:
          (planData.buildMode || finalBuildMode) === 'app_shell' && (planData.chromeProfile || finalChromeProfile) === 'marketing'
      }
    };
    console.log('[BUILDER-METRICS] plan metrics=%s', JSON.stringify(metrics));

    console.log(`[plan-website-components] SUCCESS. Returning ${flattenedComponents.length} components.`);
    res.json({
      success: true,
      layoutType: layoutTypeResolved,
      buildMode: planData.buildMode || finalBuildMode,
      routingMode: planData.routingMode || finalRoutingMode,
      chromeProfile: planData.chromeProfile || finalChromeProfile,
      catalogPosture: planData.catalogPosture || confidenceCatalogPosture,
      plan: {
        ...planData,
        buildMode: planData.buildMode || finalBuildMode,
        routingMode: planData.routingMode || finalRoutingMode,
        chromeProfile: planData.chromeProfile || finalChromeProfile,
        catalogPosture: planData.catalogPosture || confidenceCatalogPosture,
        components: flattenedComponents,
        appComposition: validAppComposition,
        pages: normalizedPages
      },
      components: flattenedComponents, // legacy support
      globalStyle: planData.globalStyle,
      appImports: planData.appImports,
      appComposition: validAppComposition,
      requiredPackages: Array.from(requiredPackages),
      aiNarration, // Include AI plan explanation
      // V4.0: Multi-page support fields
      isMultiPage: planData.isMultiPage || false,
      pages: normalizedPages,
      sharedComponentRefIds: planData.sharedComponentRefIds || [],
      planningMetrics: metrics
    });

  } catch (error) {
    console.error('[plan-website-components] CRITICAL ERROR:', error.message || error);
    if (error.stack) console.error(error.stack);

    // Check if it's an AI SDK RetryError or APICallError indicating quota/demand issues
    if (error.name === 'AI_RetryError' || error.message?.includes('maxRetriesExceeded') || error.message?.includes('429') || error.message?.includes('503')) {
      return res.status(503).json({
        success: false,
        error: 'AI Provider is currently unavailable due to high demand or quota limits. Please try again later or check your API keys.'
      });
    }

    res.status(500).json({ success: false, error: error.message });
  }
}
