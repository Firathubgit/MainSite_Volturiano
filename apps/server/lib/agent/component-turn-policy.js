const COMPONENT_INTENT_TERMS = [
  'component',
  'components',
  'catalog',
  'library',
  'community',
  'prebuilt',
  'pre-built',
  'premade',
  'pre-made',
  'template',
  'templates',
  'bundle',
  'section',
  'sections',
  'block',
  'blocks'
];

const SECTION_TERMS = [
  'header',
  'nav',
  'navigation',
  'hero',
  'footer',
  'pricing',
  'testimonial',
  'testimonials',
  'feature',
  'features',
  'dashboard',
  'admin',
  'table',
  'tables',
  'card',
  'cards',
  'calendar',
  'schedule',
  'profile',
  'profiles',
  'ecommerce',
  'e-commerce',
  'product',
  'checkout',
  'gallery',
  'carousel',
  'team',
  'contact',
  'form',
  'sidebar',
  'settings',
  'analytics',
  'stats',
  'chart',
  'charts',
  'model',
  'models',
  'lineup',
  'collection',
  'collections',
  'catalogue',
  'vehicles'
];

const SITE_STRUCTURE_TERMS = [
  'page',
  'pages',
  'route',
  'routes',
  'screen',
  'screens',
  'view',
  'views',
  'tab',
  'tabs'
];

const SECTION_ACTION_TERMS = [
  'add',
  'added',
  'create',
  'new',
  'make',
  'build',
  'insert',
  'include',
  'update',
  'change',
  'adjust',
  'fix',
  'improve',
  'replace',
  'swap',
  'use',
  'find',
  'browse',
  'select',
  'install',
  'bring',
  'remove',
  'delete',
  'rebuild'
];

const MUTATION_ACTION_TERMS = [
  ...SECTION_ACTION_TERMS,
  'darken',
  'lighten',
  'polish',
  'refactor',
  'wire'
];

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function hasAnyTerm(text, terms) {
  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  });
}

function normalizeComponentId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return String(value.id || value.component_id || value.componentId || '').trim() || null;
  }
  return null;
}

function normalizeComponentName(component, fallbackId) {
  if (!component || typeof component !== 'object') return null;
  return String(component.name || component.title || component.displayName || fallbackId || '').trim() || null;
}

export function shouldEnableCatalogToolsForEdit({
  prompt = '',
  initialComponents = [],
  manualSelectionIds = []
} = {}) {
  if (Array.isArray(initialComponents) && initialComponents.length > 0) return true;
  if (Array.isArray(manualSelectionIds) && manualSelectionIds.length > 0) return true;

  const text = normalizeText(prompt);
  if (!text) return false;

  if (/\b(use|more|stronger|better|premium|high[-\s]?end)\s+(community\s+)?components?\b/i.test(text)) {
    return true;
  }

  if (hasAnyTerm(text, COMPONENT_INTENT_TERMS)) {
    return true;
  }

  const hasAction = hasAnyTerm(text, SECTION_ACTION_TERMS);
  const hasSectionIntent = hasAnyTerm(text, SECTION_TERMS);
  const hasStructuralIntent = hasAnyTerm(text, SITE_STRUCTURE_TERMS);

  return hasAction && (hasSectionIntent || hasStructuralIntent);
}

export function isLikelyMutatingEditPrompt(prompt = '') {
  const text = normalizeText(prompt);
  if (!text) return false;

  if (/\b(can you|please|pls)\b.*\b(add|create|make|build|update|change|fix|remove|delete|replace)\b/i.test(text)) {
    return true;
  }

  return hasAnyTerm(text, MUTATION_ACTION_TERMS);
}

export function buildInitialComponentSelectionList(initialComponents = [], manualSelectionIds = []) {
  const lines = [];
  const seenIds = new Set();

  for (const component of Array.isArray(initialComponents) ? initialComponents : []) {
    const id = normalizeComponentId(component);
    if (!id || seenIds.has(id)) continue;

    const name = normalizeComponentName(component, id) || 'Selected component';
    lines.push(`- ${name} (ID: ${id})`);
    seenIds.add(id);
  }

  for (const selection of Array.isArray(manualSelectionIds) ? manualSelectionIds : []) {
    const id = normalizeComponentId(selection);
    if (!id || seenIds.has(id)) continue;

    const name = normalizeComponentName(selection, id);
    if (name && name !== id) {
      lines.push(`- ${name} (ID: ${id})`);
    } else {
      lines.push(`- Component ID: ${id}`);
    }
    seenIds.add(id);
  }

  return lines.join('\n');
}

export function getComponentPlanInstruction() {
  return [
    'Component plan:',
    '- Plan by page section first: Header/Nav, Hero, Features, Pricing, Testimonials, Footer, or dashboard/admin panels when relevant.',
    '- Browse with section-specific keywords and fetch/install only the best-fit bundle for each section.',
    '- Do not fetch duplicate bundles for the same role. Custom-code missing gaps when the catalog fit is weak.'
  ].join('\n');
}

export function buildInitialComponentPrompt({
  prompt = '',
  initialComponents = [],
  manualSelectionIds = []
} = {}) {
  const basePrompt = String(prompt || '').trim();
  const selectionList = buildInitialComponentSelectionList(initialComponents, manualSelectionIds);

  if (!selectionList) return basePrompt;

  return [
    'User has pre-selected the following components for this build:',
    selectionList,
    '',
    `User's Vision: ${basePrompt}`,
    '',
    getComponentPlanInstruction(),
    '',
    "Install these pre-selected components FIRST with 'install_component_bundle' when available. If you need to inspect/adapt a small component, 'fetch_component_bundle' is fine.",
    'If source is clipped or omitted, do not repeatedly fetch/read the same huge file. Use the installed paths and read targeted line windows only if necessary.',
    'Then browse for missing sections, custom-code weak/missing catalog gaps, and wire everything together cleanly.',
    '',
    'CRITICAL — CUSTOMIZE AFTER INSTALLING:',
    'These components contain GENERIC library defaults. After installing and wiring them, you MUST:',
    `1. READ each installed component file and REWRITE all user-visible text (headlines, subheadlines, button labels, nav links, descriptions, pricing, testimonials) to match the user's vision: "${basePrompt}"`,
    '2. Update color tokens, gradients, and Tailwind classes to match any color theme the user specified.',
    '3. Replace placeholder brand names, generic descriptions, and demo content with industry-appropriate copy.',
    '4. Do NOT leave components with their original library text — every component must feel tailored to this specific site.',
    'This customization step is MORE IMPORTANT than installing extra components. A tailored site with 5 customized components beats 7 generic ones.'
  ].join('\n');
}
