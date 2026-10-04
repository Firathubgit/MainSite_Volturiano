import { loadRegistry } from './source.js';

// ─── Catalog ────────────────────────────────────────────────

function toCatalogEntry(component) {
    return {
        id: component.id,
        uuid: component.id,
        category: component.category || 'General',
        name: component.name || component.id,
        tags: component.tags || [],
        keywords: component.keywords || [],
        description: component.description || '',
        supports: component.supports || {},
        requires: component.requires || component.bundle?.requires || {},
        quality: { responsive: component.responsive ?? true },
        visualDescription: component.visualDescription || '',
        colorProfile: component.colorProfile || { mode: 'adaptive', primary: null, warmth: null },
        suitableFor: component.suitableFor || [],
        notSuitableFor: component.notSuitableFor || [],
        industryTags: component.industryTags || [],
        designPersonality: component.designPersonality || null,
        moodTone: component.moodTone || '',
        typographyStyle: component.typographyStyle || '',
        layoutType: component.layoutType || '',
        authorType: component.authorType || 'official',
        qualityScore: component.qualityScore ?? null,
        ratingAvg: null,
        usageCount: 0,
        thumbnailUrl: component.thumbnailUrl || null,
        license: component.license || null,
    };
}

/** True when the registry folder holds at least one component. */
export function hasRegistryComponents() {
    return loadRegistry().components.length > 0;
}

/**
 * The full catalog: every component's metadata, without its code.
 */
export async function getCatalogAsync() {
    const components = loadRegistry().components
        .map(toCatalogEntry)
        .sort((a, b) => (b.qualityScore || 5) - (a.qualityScore || 5));

    return {
        catalogVersion: 'files-v1',
        categories: [...new Set(components.map((c) => c.category))],
        tags: [...new Set(components.flatMap((c) => c.tags))],
        components,
    };
}

/**
 * Return a compact metadata-only view of the catalog suitable
 * for injecting into an LLM prompt (no code, no large fields).
 * Optionally filter by keywords to keep context small.
 */
export async function getCatalogForPromptAsync(filterKeywords = [], maxItems = 80) {
    const catalog = await getCatalogAsync();
    const promptText = Array.isArray(filterKeywords)
        ? filterKeywords.join(' ')
        : String(filterKeywords || '');

    const components = rankComponentsForPrompt(catalog.components, promptText, { maxItems });

    return {
        catalogVersion: catalog.catalogVersion,
        categories: catalog.categories,
        tags: catalog.tags,
        components: components.map(c => ({
            id: c.id,
            category: c.category,
            name: c.name,
            tags: c.tags,
            keywords: c.keywords,
            description: c.description,
            visualDescription: c.visualDescription,
            suitableFor: c.suitableFor,
            notSuitableFor: c.notSuitableFor,
            industryTags: c.industryTags,
            designPersonality: c.designPersonality,
            moodTone: c.moodTone,
            colorProfile: c.colorProfile,
            supports: c.supports,
            requires: c.requires,
            authorType: c.authorType || 'official',
            qualityScore: c.qualityScore,
            ratingAvg: c.ratingAvg,
            usageCount: c.usageCount,
            thumbnailUrl: c.thumbnailUrl || null,
            fitScore: c.fitScore,
            fitReasons: c.fitReasons,
            matchedRoles: c.matchedRoles,
            matchedSiteTypes: c.matchedSiteTypes,
        })),
    };
}

// ─── Component fit scoring ──────────────────────────────────
// Routes a user prompt toward the website sections and components that fit it.
const ROLE_INTENTS = [
    { role: 'header', terms: ['header', 'navbar', 'navigation', 'nav', 'menu', 'topbar'] },
    { role: 'hero', terms: ['hero', 'above the fold', 'intro', 'headline', 'landing'] },
    { role: 'features', terms: ['features', 'feature', 'benefits', 'services', 'capabilities'] },
    { role: 'pricing', terms: ['pricing', 'plans', 'subscription', 'tiers'] },
    { role: 'testimonials', terms: ['testimonial', 'testimonials', 'reviews', 'social proof', 'customers'] },
    { role: 'footer', terms: ['footer', 'bottom', 'links'] },
    { role: 'dashboard', terms: ['dashboard', 'admin', 'crm', 'workspace', 'panel', 'backoffice'] },
    { role: 'data_table', terms: ['table', 'list', 'records', 'rows', 'manage', 'management', 'database'] },
    { role: 'stats', terms: ['stats', 'metrics', 'analytics', 'kpi', 'charts', 'chart'] },
    { role: 'cards', terms: ['cards', 'grid', 'tiles', 'profiles', 'profile cards'] },
    { role: 'calendar', terms: ['calendar', 'schedule', 'appointments', 'events'] },
    { role: 'form', terms: ['form', 'input', 'submit', 'contact', 'signup', 'login'] },
    { role: 'profile', terms: ['profile', 'user', 'member', 'customer', 'client', 'girlfriend', 'boyfriend', 'people'] },
    {
        role: 'ecommerce',
        terms: [
            'shop', 'store', 'storefront', 'product', 'products', 'catalog',
            'collection', 'cart', 'checkout', 'commerce', 'ecommerce', 'e-commerce',
            'merch', 'merchandise', 'apparel', 'streetwear', 'retail', 'drop', 'drops'
        ]
    },
    { role: 'portfolio', terms: ['portfolio', 'case study', 'case studies', 'gallery', 'showcase'] }
];

const SITE_TYPE_INTENTS = [
    { type: 'dashboard', terms: ['dashboard', 'admin', 'crm', 'manage', 'management', 'panel', 'workspace'] },
    { type: 'landing_page', terms: ['landing page', 'homepage', 'marketing site', 'website', 'startup', 'saas'] },
    {
        type: 'ecommerce',
        terms: [
            'ecommerce', 'e-commerce', 'commerce', 'online store', 'shop', 'store',
            'storefront', 'cart', 'checkout', 'catalog', 'merch', 'merchandise',
            'apparel', 'retail'
        ]
    },
    { type: 'portfolio', terms: ['portfolio', 'agency', 'case study', 'showcase'] },
    { type: 'restaurant', terms: ['restaurant', 'cafe', 'menu', 'booking'] },
    { type: 'automotive', terms: ['car', 'automotive', 'vehicle', 'dealership', 'luxury car'] }
];

const MOOD_INTENTS = [
    { mood: 'premium', terms: ['premium', 'luxury', 'high end', 'elegant', 'exclusive'] },
    { mood: 'minimal', terms: ['minimal', 'clean', 'simple', 'quiet'] },
    { mood: 'cinematic', terms: ['cinematic', 'immersive', 'shader', 'webgl', '3d', 'motion'] },
    { mood: 'professional', terms: ['professional', 'corporate', 'business', 'trustworthy'] },
    { mood: 'playful', terms: ['playful', 'fun', 'colorful', 'creative'] }
];

const COLOR_INTENTS = [
    { color: 'dark', terms: ['dark', 'black', 'night'] },
    { color: 'light', terms: ['light', 'white', 'bright'] },
    { color: 'teal', terms: ['teal', 'cyan', 'aqua'] },
    { color: 'blue', terms: ['blue', 'navy'] },
    { color: 'purple', terms: ['purple', 'violet'] },
    { color: 'green', terms: ['green', 'emerald'] },
    { color: 'orange', terms: ['orange', 'amber'] }
];

export function inferComponentIntent(input = '') {
    const query = Array.isArray(input) ? input.join(' ') : String(input || '');
    const normalized = normalizeText(query);
    const tokens = tokenize(query);
    const sectionRoles = collectIntentMatches(normalized, ROLE_INTENTS, 'role');
    const siteTypes = collectIntentMatches(normalized, SITE_TYPE_INTENTS, 'type');
    const moodTones = collectIntentMatches(normalized, MOOD_INTENTS, 'mood');
    const colorModes = collectIntentMatches(normalized, COLOR_INTENTS, 'color');

    if (siteTypes.includes('dashboard')) {
        addUnique(sectionRoles, ['dashboard', 'data_table', 'stats', 'cards', 'profile', 'form']);
    }
    if (siteTypes.includes('landing_page')) {
        addUnique(sectionRoles, ['header', 'hero', 'features', 'testimonials', 'pricing', 'footer']);
    }
    if (siteTypes.includes('ecommerce')) {
        addUnique(sectionRoles, ['header', 'hero', 'ecommerce', 'cards', 'footer']);
    }

    return {
        query,
        normalized,
        tokens,
        sectionRoles,
        siteTypes,
        moodTones,
        colorModes,
        hasIntent: Boolean(tokens.length || sectionRoles.length || siteTypes.length || moodTones.length || colorModes.length)
    };
}

export function rankComponentsForPrompt(components = [], prompt = '', options = {}) {
    const maxItems = Number.isFinite(options.maxItems) ? options.maxItems : 80;
    const minRelevance = Number.isFinite(options.minRelevance) ? options.minRelevance : 0.18;
    const intent = options.intent || inferComponentIntent(prompt);

    const scored = (components || []).map((component, index) => {
        const fit = scoreComponentFit(component, intent);
        return {
            ...component,
            fitScore: fit.score,
            fitReasons: fit.reasons,
            matchedRoles: fit.matchedRoles,
            matchedSiteTypes: fit.matchedSiteTypes,
            _fitStrongSiteTypes: fit.matchedStrongSiteTypes,
            _fitMatched: fit.matched,
            _fitRelevance: fit.relevance,
            _originalIndex: index
        };
    });

    let candidates = scored;
    if (intent.hasIntent) {
        const filtered = scored.filter((component) => (
            component._fitMatched && component._fitRelevance >= minRelevance
        ));
        if (filtered.length > 0) candidates = filtered;
    }
    const specializedSiteTypes = requestedSpecializedSiteTypes(intent);
    const exactCandidates = specializedSiteTypes.length > 0
        ? candidates.filter((component) => component._fitStrongSiteTypes.length > 0)
        : [];
    if (specializedSiteTypes.length > 0) candidates = exactCandidates;

    return candidates
        .sort((a, b) => {
            if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
            const qualityDelta = normalizeQualityScore(b) - normalizeQualityScore(a);
            if (qualityDelta !== 0) return qualityDelta;
            return a._originalIndex - b._originalIndex;
        })
        .slice(0, maxItems)
        .map(({
            _fitStrongSiteTypes,
            _fitMatched,
            _fitRelevance,
            _originalIndex,
            ...component
        }) => component);
}

export function scoreComponentFit(component = {}, intentOrPrompt = '') {
    const intent = typeof intentOrPrompt === 'string' || Array.isArray(intentOrPrompt)
        ? inferComponentIntent(intentOrPrompt)
        : intentOrPrompt;
    const haystack = componentHaystack(component);
    const componentRoles = classifyComponentRoles(component);
    const componentSiteTypes = classifyComponentSiteTypes(component);
    const componentMoods = classifyComponentMoods(component);
    const componentColors = classifyComponentColors(component);
    const componentStrongSiteTypes = classifyComponentStrongSiteTypes(component);
    const reasons = [];

    let relevance = 0;
    const matchedRoles = intersection(intent.sectionRoles, componentRoles);
    const matchedSiteTypes = intersection(intent.siteTypes, componentSiteTypes);
    const matchedMoods = intersection(intent.moodTones, componentMoods);
    const matchedColors = intersection(intent.colorModes, componentColors);
    const matchedStrongSiteTypes = intersection(intent.siteTypes, componentStrongSiteTypes);
    const tokenHits = intent.tokens.filter((token) => (
        token.length > 2 && containsIntentTerm(haystack, token)
    ));

    if (matchedRoles.length) {
        relevance += Math.min(0.42, matchedRoles.length * 0.18);
        reasons.push(`section:${matchedRoles.slice(0, 3).join(',')}`);
    }
    if (matchedSiteTypes.length) {
        relevance += Math.min(0.24, matchedSiteTypes.length * 0.14);
        reasons.push(`site:${matchedSiteTypes.slice(0, 2).join(',')}`);
    }
    if (matchedStrongSiteTypes.length) {
        relevance += Math.min(0.22, matchedStrongSiteTypes.length * 0.22);
        reasons.push(`exact-site:${matchedStrongSiteTypes.slice(0, 2).join(',')}`);
    }
    if (matchedMoods.length) {
        relevance += Math.min(0.16, matchedMoods.length * 0.08);
        reasons.push(`mood:${matchedMoods.slice(0, 2).join(',')}`);
    }
    if (matchedColors.length) {
        relevance += Math.min(0.08, matchedColors.length * 0.04);
        reasons.push(`color:${matchedColors.slice(0, 2).join(',')}`);
    }
    if (tokenHits.length) {
        relevance += Math.min(0.24, tokenHits.length * 0.04);
        reasons.push(`keyword:${tokenHits.slice(0, 4).join(',')}`);
    }

    const penalty = notSuitablePenalty(component, intent);
    if (penalty > 0) reasons.push('penalty:not_suitable');

    const qualityBoost = normalizeQualityScore(component) * 0.22;
    const score = clamp01(relevance + qualityBoost - penalty);

    return {
        score: Number(score.toFixed(3)),
        relevance: Number(relevance.toFixed(3)),
        matched: relevance > 0 && penalty < 0.5,
        penalty,
        reasons: reasons.length ? reasons : ['quality_rank'],
        matchedRoles,
        matchedSiteTypes,
        matchedStrongSiteTypes
    };
}

function classifyComponentRoles(component) {
    const haystack = componentHaystack(component);
    const roles = collectIntentMatches(haystack, ROLE_INTENTS, 'role');
    if (component.category) addUnique(roles, [normalizeCategoryRole(component.category)]);
    return roles.filter(Boolean);
}

function classifyComponentSiteTypes(component) {
    const haystack = componentHaystack(component);
    const siteTypes = collectIntentMatches(haystack, SITE_TYPE_INTENTS, 'type');
    const suitableFor = normalizeArray(component.suitableFor).join(' ');
    addUnique(siteTypes, collectIntentMatches(normalizeText(suitableFor), SITE_TYPE_INTENTS, 'type'));
    return siteTypes;
}

const SPECIALIZED_SITE_EVIDENCE = {
    dashboard: ['dashboard', 'admin', 'crm', 'backoffice', 'back office', 'workspace'],
    ecommerce: [
        'ecommerce', 'e-commerce', 'online store', 'shop', 'storefront', 'shopping cart',
        'cart', 'checkout', 'catalog', 'merch', 'merchandise', 'apparel', 'retail',
        'fashion retailer', 'streetwear', 'sneaker drop', 'fashion drop', 'product showcase'
    ],
    portfolio: ['portfolio', 'case study', 'case studies', 'project showcase'],
    restaurant: ['restaurant', 'cafe', 'dining', 'food menu', 'table booking'],
    automotive: ['automotive', 'vehicle', 'dealership', 'luxury car', 'car showroom']
};

function classifyComponentStrongSiteTypes(component) {
    const evidence = normalizeText([
        component.id,
        component.name,
        component.category,
        ...(component.tags || []),
        ...(component.keywords || []),
        ...normalizeArray(component.suitableFor),
        ...normalizeArray(component.industryTags)
    ].filter(Boolean).join(' '));

    return Object.entries(SPECIALIZED_SITE_EVIDENCE)
        .filter(([, terms]) => terms.some((term) => containsIntentTerm(evidence, term)))
        .map(([siteType]) => siteType);
}

function requestedSpecializedSiteTypes(intent) {
    return (intent?.siteTypes || []).filter((siteType) => (
        Object.prototype.hasOwnProperty.call(SPECIALIZED_SITE_EVIDENCE, siteType)
    ));
}

function classifyComponentMoods(component) {
    const haystack = componentHaystack(component);
    return collectIntentMatches(`${haystack} ${normalizeText(component.moodTone || '')}`, MOOD_INTENTS, 'mood');
}

function classifyComponentColors(component) {
    const haystack = componentHaystack(component);
    const colorProfile = component.colorProfile || {};
    const colorText = [
        colorProfile.mode,
        colorProfile.primary,
        colorProfile.warmth
    ].filter(Boolean).join(' ');
    return collectIntentMatches(`${haystack} ${normalizeText(colorText)}`, COLOR_INTENTS, 'color');
}

function componentHaystack(component) {
    return normalizeText([
        component.id,
        component.name,
        component.category,
        component.description,
        component.visualDescription,
        component.moodTone,
        component.typographyStyle,
        component.layoutType,
        ...(component.tags || []),
        ...(component.keywords || []),
        ...normalizeArray(component.suitableFor),
        ...normalizeArray(component.industryTags),
        JSON.stringify(component.designPersonality || {}),
        JSON.stringify(component.supports || {})
    ].filter(Boolean).join(' '));
}

function notSuitablePenalty(component, intent) {
    const notSuitable = normalizeText(
        normalizeArray(component.notSuitableFor)
            .map((constraint) => String(constraint).replace(/\b(?:without|excluding)\b.*$/i, ''))
            .join(' ')
    );
    if (!notSuitable) return 0;
    const disallowedSiteTypes = collectIntentMatches(notSuitable, SITE_TYPE_INTENTS, 'type');
    const disallowedMoods = collectIntentMatches(notSuitable, MOOD_INTENTS, 'mood');
    const hasConflict = (
        intersection(intent.siteTypes, disallowedSiteTypes).length > 0
        || intersection(intent.moodTones, disallowedMoods).length > 0
    );
    return hasConflict ? 0.35 : 0;
}

function collectIntentMatches(normalizedText, definitions, key) {
    const matches = [];
    for (const definition of definitions) {
        if (definition.terms.some((term) => containsIntentTerm(normalizedText, term))) {
            matches.push(definition[key]);
        }
    }
    return [...new Set(matches)];
}

function containsIntentTerm(normalizedText, term) {
    const text = normalizeText(normalizedText);
    const normalizedTerm = normalizeText(term);
    if (!text || !normalizedTerm) return false;
    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(text);
}

function normalizeCategoryRole(category = '') {
    const clean = normalizeText(category).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const aliasMap = {
        nav: 'header',
        navbar: 'header',
        navigation: 'header',
        admin: 'dashboard',
        analytics: 'stats',
        chart: 'stats',
        charts: 'stats',
        grid: 'cards',
        card: 'cards',
        product: 'ecommerce',
        shop: 'ecommerce'
    };
    return aliasMap[clean] || clean;
}

function normalizeQualityScore(component) {
    const rawQuality = Number(component.qualityScore ?? component.quality_score ?? 5);
    const quality = Number.isFinite(rawQuality) ? rawQuality : 5;
    const rating = Number(component.ratingAvg ?? component.rating_avg ?? 0);
    const qualityPart = clamp01(quality / 10);
    const ratingPart = Number.isFinite(rating) && rating > 0 ? clamp01(rating / 5) : qualityPart;
    return clamp01((qualityPart * 0.75) + (ratingPart * 0.25));
}

function normalizeArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
        } catch {
            return value.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
        }
    }
    return [];
}

function tokenize(text = '') {
    return normalizeText(text)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2 && !INTENT_TOKEN_STOPWORDS.has(token))
        .slice(0, 30);
}

const INTENT_TOKEN_STOPWORDS = new Set([
    'and', 'are', 'build', 'create', 'dedicated', 'for', 'from', 'into',
    'make', 'site', 'that', 'the', 'this', 'use', 'website', 'with',
]);

function normalizeText(text = '') {
    return String(text || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function intersection(left = [], right = []) {
    const rightSet = new Set(right);
    return left.filter((item) => rightSet.has(item));
}

function addUnique(target, items) {
    for (const item of items) {
        if (item && !target.includes(item)) target.push(item);
    }
}

function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

// ─── Bundles ────────────────────────────────────────────────

/**
 * Load one component's installable bundle: `{ id, files: [{ path, content }], requires, usage }`.
 * Returns null when the component does not exist.
 */
export async function getBundleAsync(componentId) {
    const component = loadRegistry().components.find((entry) => entry.id === componentId);
    if (!component?.bundle?.files?.length) return null;

    const bundle = structuredClone(component.bundle);
    bundle.id = bundle.id || component.id;
    bundle.requires = bundle.requires || component.requires || {};

    // Component files always live under src/. Config files stay at the root.
    for (const file of bundle.files) {
        if (!file.path || file.path.startsWith('src/')) continue;
        const isConfig = file.path.includes('config.') || file.path === 'package.json' || file.path.endsWith('.html');
        if (!isConfig) {
            file.path = file.path.startsWith('components/') ? `src/${file.path}` : `src/components/${file.path}`;
        }
    }
    return bundle;
}

/**
 * Load several bundles. Missing ids are skipped.
 */
export async function getBundlesAsync(componentIds) {
    const bundles = new Map();
    for (const id of componentIds) {
        const bundle = await getBundleAsync(id);
        if (bundle) bundles.set(id, bundle);
        else console.warn(`[registry] Skipping missing bundle: ${id}`);
    }
    return bundles;
}

/**
 * Resolve component ids to `{ uuid, slug, name }` records.
 * Returns a Map keyed by the input id, with an entry for every id that exists.
 */
export async function resolveComponentRefs(componentIds = []) {
    const resolved = new Map();
    const ids = new Set((componentIds || []).map((id) => String(id || '').trim()).filter(Boolean));
    for (const component of loadRegistry().components) {
        if (ids.has(component.id)) {
            resolved.set(component.id, { uuid: component.id, slug: component.id, name: component.name || component.id });
        }
    }
    return resolved;
}

/**
 * Given a bundle, extract all its file entries in the <file path="...">...</file>
 * format expected by the apply-ai-code-stream route.
 */
export function bundleToFileBlocks(bundle, propsOverrides = {}) {
    if (!bundle || !bundle.files) return '';

    return bundle.files.map(f => {
        let content = f.content;

        // Substitute default prop values with overrides where applicable
        // This is a simple string-level replacement for default prop values
        if (propsOverrides && Object.keys(propsOverrides).length > 0) {
            for (const [key, value] of Object.entries(propsOverrides)) {
                // Replace default='...' patterns for this prop name
                const defaultPattern = new RegExp(
                    `(${key}\\s*=\\s*)(['"\`])([^'"\`]*)\\2`,
                    'g'
                );
                const safeValue = typeof value === 'string' ? value : JSON.stringify(value);
                content = content.replace(defaultPattern, `$1'${safeValue}'`);
            }
        }

        return `<file path="${f.path}">${content}</file>`;
    }).join('\n\n');
}

// ─── Templates ──────────────────────────────────────────────

/**
 * List the available templates, lowest `priority` first.
 */
export async function listTemplatesAsync() {
    return loadRegistry().templates
        .slice()
        .sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER))
        .map((template) => ({
            templateId: template.templateId,
            name: template.name,
            description: template.description || '',
            thumbnailUrl: template.thumbnailUrl || null,
            componentCount: template.components?.length || 0,
            agentPrompt: template.agentPrompt || '',
            priority: template.priority ?? null,
            visitUrl: template.visitUrl || null,
        }));
}

/**
 * Load one template. Returns null when it does not exist.
 */
export async function getTemplateAsync(templateId) {
    const template = loadRegistry().templates.find((entry) => entry.templateId === templateId);
    if (!template) return null;
    return {
        templateId: template.templateId,
        name: template.name,
        description: template.description || '',
        visualDescription: template.visualDescription || '',
        thumbnailUrl: template.thumbnailUrl || null,
        appWrapperClass: template.appWrapperClass || null,
        components: template.components || [],
        theme: template.theme || {},
    };
}

/**
 * Build the full code payload for a template asynchronously.
 */
export async function buildTemplateCodeAsync(templateId) {
    const template = await getTemplateAsync(templateId);
    if (!template) {
        return { success: false, error: `Template not found: ${templateId}`, code: '' };
    }

    const resolved = [];
    const missing = [];
    const allFileBlocks = [];
    const appImports = [];
    const appComponents = [];

    // Fetch all bundles concurrently
    const componentIds = template.components.map(e => e.componentId || e.id);
    const bundleMap = await getBundlesAsync(componentIds);

    for (const entry of template.components) {
        const componentId = entry.componentId || entry.id;
        const bundle = bundleMap.get(componentId);
        if (!bundle) {
            missing.push(componentId);
            continue;
        }

        resolved.push(componentId);

        // Get file blocks with prop overrides applied
        // bundleToFileBlocks returns a string of one or more <file> tags
        const blocks = bundleToFileBlocks(bundle, entry.props || {});
        if (blocks) {
            allFileBlocks.push(blocks);
        }

        // Identify the main component file (usually the first one)
        const mainFile = bundle.files.find(f => f.path.endsWith('.jsx') || f.path.endsWith('.tsx')) || bundle.files[0];

        if (mainFile) {
            const importName = bundle.usage?.importName || bundle.id.split('.').pop().split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            const importPath = mainFile.path.replace('src/', './').replace(/\.(jsx|tsx|js|ts)$/, '');

            appImports.push({
                importName: importName,
                path: importPath
            });
            appComponents.push(importName);
        }
    }

    // Synthesize App.jsx
    const importLines = appImports
        .map(i => `import ${i.importName} from '${i.path}'`)
        .join('\n');

    const componentTags = appComponents
        .map(name => `      <${name} />`)
        .join('\n');

    const appJsx = `${importLines}
import './index.css'

function App() {
  return (
    <div className="${template.appWrapperClass || 'min-h-screen bg-black text-white'}">
${componentTags}
    </div>
  )
}

export default App`;

    allFileBlocks.push(`<file path="src/App.jsx">${appJsx}</file>`);

    // 7. Add global CSS (Always include for Tailwind support)
    const tokens = template.theme?.tokens || { accent: '#7C3AED', radius: '12px' };
    const cssVars = Object.entries(tokens)
        .map(([k, v]) => `  --${k}: ${v};`)
        .join('\n');

    const rawCss = template.theme?.globalCss || '';

    const globalCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
${cssVars}
}

${rawCss}

body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  color: white;
  background: black;
  -webkit-font-smoothing: antialiased;
}

/* Custom Utilities */
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
`;

    allFileBlocks.push(`<file path="src/index.css">${globalCss}</file>`);

    return {
        success: true,
        code: allFileBlocks.join('\n\n'),
        resolvedComponents: resolved,
        missingComponents: missing,
    };
}
