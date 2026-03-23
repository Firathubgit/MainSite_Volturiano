import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Client
// Initialize Supabase Client (Prioritize server-side keys for the Registry)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log(`[Registry] Init: URL=${supabaseUrl ? 'Present (' + supabaseUrl.substring(0, 15) + '...)' : 'MISSING'}`);
console.log(`[Registry] Init: Key=${supabaseKey ? 'Present (' + supabaseKey.substring(0, 10) + '...)' : 'MISSING'}`);

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

if (!supabase) {
    console.error('[Registry] CRITICAL: Supabase client could not be initialized. Registry will fail.');
} else {
    console.log('[Registry] Supabase client initialized successfully.');
}

// ─── Utilities ──────────────────────────────────────────

/**
 * Executes a Supabase query with automatic retries for transient errors.
 */
async function withRetry(queryFn, { maxRetries = 3, delayMs = 500, exponential = true } = {}) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await queryFn();
            if (!result.error) return result;
            lastError = result.error;
            const status = result.error.status || (result.error.code ? parseInt(result.error.code) : null);
            const isTransient = !status || status >= 500 || [408, 429].includes(status);
            if (!isTransient) return result;
        } catch (err) {
            lastError = err;
        }
        const waitTime = exponential ? delayMs * Math.pow(2, i) : delayMs;
        console.warn(`[RegistryRetry] Attempt ${i + 1} failed. Retrying in ${waitTime}ms...`, lastError);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    return { data: null, error: lastError };
}

// ─── Paths ──────────────────────────────────────────────
const CATALOG_PATH = path.join(__dirname, 'catalog.json');
const BUNDLES_DIR = path.join(__dirname, 'bundles');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

// ─── Catalog (cached in memory) ──────────────────────────
let catalogCache = null;
let catalogMtime = 0;

/**
 * Load and return the full catalog JSON explicitly from local file.
 * Caches in memory; reloads if file has been modified on disk.
 */
export function getLocalCatalogSync() {
    console.error('[Registry] ERROR: getLocalCatalogSync called but LOCAL JSON IS DISABLED. Use getCatalogAsync instead.');
    return { catalogVersion: 'disabled', categories: [], tags: [], components: [] };
}

/**
 * Load the catalog explicitly asynchronously from Supabase,
 * falling back to local JSON if DB is offline or unavailable.
 */
export async function getCatalogAsync() {
    console.log('[Registry] [SUPABASE_LIVE] getCatalogAsync called - Fetching from Supabase...');
    if (supabase) {
        try {
            const { data, error } = await withRetry(async () => {
                return await supabase
                    .from('components')
                    .select('*')
                    .eq('status', 'active');
            }, { maxRetries: 3, delayMs: 800 });

            if (error) {
                console.error('[Registry] [SUPABASE_LIVE] Supabase SELECT error after retries:', error);
                throw error;
            }

            if (data && data.length > 0) {
                console.log(`[Registry] Supabase SUCCESS: Fetched ${data.length} components.`);

                // S9.13: Quality-weighted discovery sort
                // Formula: (quality_score * 0.4 + rating_avg * 0.3 + LOG(usage_count+1) * 0.3) DESC
                const sorted = [...data].sort((a, b) => {
                    const scoreA = (a.quality_score || 5) * 0.4 + (a.rating_avg || 0) * 0.3 + Math.log10((a.usage_count || 0) + 1) * 0.3;
                    const scoreB = (b.quality_score || 5) * 0.4 + (b.rating_avg || 0) * 0.3 + Math.log10((b.usage_count || 0) + 1) * 0.3;
                    return scoreB - scoreA;
                });

                // Map Supabase rows back to the expected catalog.json structure
                return {
                    catalogVersion: 'supabase-v1',
                    categories: [...new Set(sorted.map(c => c.category))],
                    tags: [...new Set(sorted.flatMap(c => c.tags || []))],
                    components: sorted.map(c => ({
                        id: c.component_id,
                        category: c.category,
                        name: c.name,
                        tags: c.tags || [],
                        keywords: c.keywords || [],
                        description: c.description || '',
                        supports: typeof c.supports === 'string' ? JSON.parse(c.supports) : (c.supports || {}),
                        requires: typeof c.requires === 'string' ? JSON.parse(c.requires) : (c.requires || {}),
                        quality: { responsive: c.responsive ?? true },
                        visualDescription: c.visual_description || '',
                        colorProfile: {
                            mode: c.color_mode || 'adaptive',
                            primary: c.color_primary || null,
                            warmth: c.color_warmth || null
                        },
                        suitableFor: typeof c.suitable_for === 'string' ? JSON.parse(c.suitable_for) : (c.suitable_for || []),
                        notSuitableFor: typeof c.not_suitable_for === 'string' ? JSON.parse(c.not_suitable_for) : (c.not_suitable_for || []),
                        moodTone: c.mood_tone || '',
                        typographyStyle: c.typography_style || '',
                        layoutType: c.layout_type || '',
                        // S9.13: Author provenance for community components
                        authorType: c.author_type || 'official',
                        qualityScore: c.quality_score || null,
                        ratingAvg: c.rating_avg || null,
                    }))
                };
            } else {
                console.warn('[Registry] Supabase returned empty component list.');
                return { catalogVersion: 'supabase-empty', categories: [], tags: [], components: [] };
            }
        } catch (err) {
            console.error('[Registry] Supabase CRITICAL FETCH ERROR:', err.message);
            throw err;
        }
    }

    console.error('[Registry] Supabase client NOT initialized. Cannot fetch catalog.');
    throw new Error('Supabase not configured');
}

/**
 * Sync proxy to getCatalog for existing synchronous calls in the codebase.
 * It will just use the local JSON. Wait, refactoring all synchronous callers 
 * to async can be invasive, so getCatalog will remain sync, yielding local, 
 * but getCatalogAsync is preferred for new code.
 */
export function getCatalog() {
    return getLocalCatalogSync();
}

/**
 * Return a compact metadata-only view of the catalog suitable
 * for injecting into an LLM prompt (no code, no large fields).
 * Optionally filter by keywords to keep context small.
 */
/**
 * Fetch all categories from Supabase `component_categories` table.
 */
export async function getCategoriesAsync() {
    console.log('[Registry] [SUPABASE_LIVE] getCategoriesAsync called...');
    if (supabase) {
        try {
            const { data, error } = await withRetry(async () => {
                return await supabase
                    .from('component_categories')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });
            }, { maxRetries: 3, delayMs: 800 });

            if (error) {
                console.error('[Registry] [SUPABASE_LIVE] Supabase SELECT categories error after retries:', error);
                throw error;
            }
            return data || [];
        } catch (err) {
            console.error('[Registry] Supabase CRITICAL FETCH CATEGORIES ERROR:', err.message);
            throw err;
        }
    }
    console.error('[Registry] Supabase client NOT initialized.');
    throw new Error('Supabase not configured');
}

/**
 * Return a compact metadata-only view of the catalog suitable
 * for injecting into an LLM prompt (no code, no large fields).
 * Optionally filter by keywords to keep context small.
 */
export async function getCatalogForPromptAsync(filterKeywords = [], maxItems = 80) {
    const catalog = await getCatalogAsync();
    let components = catalog.components;

    // Optional keyword pre-filter to reduce context size
    if (filterKeywords && filterKeywords.length > 0) {
        const lowerKeywords = filterKeywords.map(k => k.toLowerCase());
        components = components.filter(c => {
            const haystack = [
                c.name, c.category, c.description,
                ...(c.tags || []),
                ...(c.keywords || [])
            ].join(' ').toLowerCase();
            return lowerKeywords.some(kw => haystack.includes(kw));
        });
    }

    // Limit to maxItems
    components = components.slice(0, maxItems);

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
            moodTone: c.moodTone,
            colorProfile: c.colorProfile,
            supports: c.supports,
            requires: c.requires,
            // S9.13: Author provenance so LLM knows community vs official
            authorType: c.authorType || 'official',
            qualityScore: c.qualityScore,
            ratingAvg: c.ratingAvg,
        })),
    };
}

// ─── Bundles ──────────────────────────────────────────────

/**
 * Load a single component bundle explicitly from local JSON.
 */
export function getLocalBundleSync(componentId) {
    console.error(`[Registry] ERROR: getLocalBundleSync("${componentId}") called but LOCAL JSON IS DISABLED. Use getBundleAsync instead.`);
    return null;
}

/**
 * Load a single component bundle asynchronously from Supabase,
 * falling back to local JSON if DB is offline or bundle missing.
 */
export async function getBundleAsync(componentId, format = 'fileblocks') {
    console.log(`[Registry] [SUPABASE_LIVE] getBundleAsync for "${componentId}" - Fetching from Supabase...`);
    if (supabase) {
        try {
            const { data, error } = await withRetry(async () => {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(componentId);
                console.log(`[Registry] Querying ${isUuid ? 'UUID ID' : 'SLUG component_id'}: "${componentId}"`);

                let query = supabase.from('components').select('bundle_code');
                if (isUuid) {
                    query = query.eq('id', componentId);
                } else {
                    query = query.eq('component_id', componentId);
                }

                const res = await query.single();
                if (res.error) console.warn(`[Registry] Supabase Query Error for "${componentId}":`, res.error.message, `(Code: ${res.error.code})`);
                else console.log(`[Registry] Supabase Query Success for "${componentId}"`);
                return res;
            }, { maxRetries: 3, delayMs: 500 });

            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn(`[Registry] [SUPABASE_LIVE] Bundle not found for: ${componentId}`);
                    return null;
                }
                console.error(`[Registry] [SUPABASE_LIVE] Supabase SELECT bundle error for ${componentId}:`, error);
                throw error;
            }

            if (data && data.bundle_code) {
                const bundle = typeof data.bundle_code === 'string' ? JSON.parse(data.bundle_code) : data.bundle_code;
                console.log(`[Registry] [SUPABASE_LIVE] Supabase SUCCESS: Loaded bundle for "${componentId}" (${typeof data.bundle_code === 'string' ? data.bundle_code.length : 'JSON'} chars)`);
                return bundle;
            } else {
                console.warn(`[Registry] Supabase returned success but NO bundle_code for "${componentId}"`);
                return null;
            }
        } catch (err) {
            console.error(`[Registry] Supabase CRITICAL BUNDLE ERROR for "${componentId}":`, err.message);
            throw err;
        }
    }

    console.error(`[Registry] Supabase client NOT initialized. Cannot fetch bundle "${componentId}".`);
    throw new Error('Supabase not configured');
}

/**
 * Sync proxy to getBundle.
 */
export function getBundle(componentId) {
    const bundlePath = path.join(BUNDLES_DIR, `${componentId}.json`);
    try {
        const raw = fs.readFileSync(bundlePath, 'utf-8');
        const bundle = JSON.parse(raw);
        console.log(`[Registry] Loaded bundle: ${componentId} v${bundle.version}`);
        return getLocalBundleSync(componentId);
    } catch (err) {
        console.error(`[Registry] Get bundle sync error for ${componentId}`, err.message);
        return null;
    }
}

/**
 * Load multiple bundles by their IDs concurrently.
 */
export async function getBundlesAsync(componentIds) {
    const bundles = new Map();
    const promises = componentIds.map(async (id) => {
        const bundle = await getBundleAsync(id);
        if (bundle) bundles.set(id, bundle);
        else console.warn(`[Registry] Skipping missing bundle: ${id}`);
    });
    await Promise.all(promises);
    return bundles;
}

/**
 * Sync version for existing code
 */
export function getBundles(componentIds) {
    const bundles = new Map();
    for (const id of componentIds) {
        const bundle = getBundle(id);
        if (bundle) {
            bundles.set(id, bundle);
        } else {
            console.warn(`[Registry] Skipping missing bundle: ${id}`);
        }
    }
    return bundles;
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
 * List all available templates explicitly from local JSON.
 */
export function getLocalTemplatesSync() {
    console.error('[Registry] ERROR: getLocalTemplatesSync called but LOCAL JSON IS DISABLED. Use listTemplatesAsync instead.');
    return [];
}

/**
 * List all available templates asynchronously from Supabase,
 * falling back to local JSON.
 */
export async function listTemplatesAsync() {
    console.log('[Registry] listTemplatesAsync called - Fetching from Supabase...');
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('templates')
                .select('template_id, name, description, thumbnail_url, template_code')
                .eq('status', 'active');

            if (error) {
                console.error('[Registry] Supabase templates error:', error);
                throw error;
            }

            if (data && data.length > 0) {
                console.log(`[Registry] Supabase SUCCESS: Fetched ${data.length} templates.`);
                return data.map(t => ({
                    templateId: t.template_id,
                    name: t.name,
                    description: t.description,
                    thumbnailUrl: t.thumbnail_url || null,
                    componentCount: t.template_code?.components?.length || 0
                }));
            } else {
                console.warn('[Registry] Supabase returned empty template list.');
                return [];
            }
        } catch (err) {
            console.error('[Registry] Supabase CRITICAL TEMPLATES ERROR:', err.message);
            throw err;
        }
    }
    console.error('[Registry] Supabase client NOT initialized. Cannot fetch templates.');
    throw new Error('Supabase not configured');
}

/**
 * Sync proxy to listTemplates.
 */
export function listTemplates() {
    return getLocalTemplatesSync();
}

/**
 * Load a full template manifest explicitly from local JSON.
 */
export function getLocalTemplateSync(templateId) {
    console.error(`[Registry] ERROR: getLocalTemplateSync("${templateId}") called but LOCAL JSON IS DISABLED. Use getTemplateAsync instead.`);
    return null;
}

/**
 * Load a full template manifest asynchronously from Supabase,
 * falling back to local JSON.
 */
export async function getTemplateAsync(templateId) {
    console.log(`[Registry] getTemplateAsync for "${templateId}" - Fetching from Supabase...`);
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .eq('template_id', templateId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.error(`[Registry] Supabase NOT FOUND: Template "${templateId}" does not exist in the database.`);
                } else {
                    console.error(`[Registry] Supabase error fetching template "${templateId}":`, error);
                }
                throw error;
            }

            if (data) {
                console.log(`[Registry] Supabase SUCCESS: Loaded template "${templateId}" with ${data.template_code?.components?.length || 0} components.`);
                return {
                    templateId: data.template_id,
                    name: data.name,
                    description: data.description,
                    visualDescription: data.visual_description,
                    thumbnailUrl: data.thumbnail_url,
                    appWrapperClass: data.app_wrapper_class,
                    components: data.template_code?.components || [],
                    theme: data.template_code?.theme || {}
                };
            }
        } catch (err) {
            console.error(`[Registry] Supabase CRITICAL TEMPLATE ERROR for "${templateId}":`, err.message);
            throw err;
        }
    }
    console.error(`[Registry] Supabase client NOT initialized. Cannot fetch template "${templateId}".`);
    throw new Error('Supabase not configured');
}

/**
 * Sync proxy to getTemplate.
 */
export function getTemplate(templateId) {
    return getLocalTemplateSync(templateId);
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


/**
 * Build a code payload from an arbitrary list of component IDs asynchronously.
 */
export async function buildSelectionCodeAsync(componentIds) {
    const resolved = [];
    const missing = [];
    const allFileBlocks = [];
    const appImports = [];
    const appComponents = [];

    // Filter out duplicates
    const uniqueIds = Array.from(new Set(componentIds));
    const bundleMap = await getBundlesAsync(uniqueIds);

    for (const componentId of uniqueIds) {
        const bundle = bundleMap.get(componentId);
        if (!bundle) {
            missing.push(componentId);
            continue;
        }

        resolved.push(componentId);

        // Get file blocks (no prop overrides for now, usage defaults)
        const blocks = bundleToFileBlocks(bundle, {});
        if (blocks) {
            allFileBlocks.push(blocks);
        }

        // Identify the main component file
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
    <div className="min-h-screen bg-black text-white">
      <div className="flex flex-col gap-0 w-full">
${componentTags}
      </div>
    </div>
  )
}

export default App`;

    allFileBlocks.push(`<file path="src/App.jsx">${appJsx}</file>`);

    // Add global CSS (Standard Volturiano Dark Theme)
    const globalCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #0a0a0f;
  --color-text: #e4e4e7;
  --color-primary: #6366f1;
  --accent: #818cf8;
}

body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar Handling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
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

// ─── Asset Preflight ──────────────────────────────────────────────

/**
 * Verify an asset URL is reachable and returns the expected content type.
 * Uses a HEAD request to avoid downloading the full resource.
 * Returns { valid, status, contentType, error }
 */
export async function preflightAsset(url, expectedContentType = null) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': 'VolturianoBuilder/1.0' },
        });

        clearTimeout(timeout);

        const contentType = res.headers.get('content-type') || '';
        const valid = res.ok && (
            !expectedContentType ||
            contentType.toLowerCase().includes(expectedContentType.toLowerCase())
        );

        return { valid, status: res.status, contentType, error: null };
    } catch (err) {
        return { valid: false, status: 0, contentType: null, error: err.message };
    }
}

/**
 * Run preflight checks on all assets in a bundle.
 * Returns { allValid, results: [{assetKey, url, ...preflightResult}] }
 */
export async function preflightBundleAssets(bundle) {
    if (!bundle?.assets || Object.keys(bundle.assets).length === 0) {
        return { allValid: true, results: [] };
    }

    const checks = [];
    for (const [key, asset] of Object.entries(bundle.assets)) {
        const url = asset.defaultUrl || asset.posterUrl;
        if (url) {
            checks.push(
                preflightAsset(url, asset.contentTypeExpected).then(result => ({
                    assetKey: key,
                    url,
                    ...result,
                }))
            );
        }
    }

    const results = await Promise.all(checks);
    const allValid = results.every(r => r.valid);

    if (!allValid) {
        console.warn('[Registry] Asset preflight failures:', results.filter(r => !r.valid));
    }

    return { allValid, results };
}
