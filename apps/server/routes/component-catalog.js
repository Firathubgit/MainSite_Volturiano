import { getCatalogAsync, getCatalogForPromptAsync } from '../lib/registry/registry.js';

/**
 * GET /api/component-catalog
 *
 * Returns the component registry catalog (metadata only, no source).
 * Query params:
 *   - compact=true  → returns only fields needed for LLM prompt injection
 *   - keywords=a,b  → pre-filter components by keywords
 *   - max=N         → limit number of components returned (default 80)
 */
export default async function componentCatalog(req, res) {
    try {
        const { compact, keywords, max } = req.query;

        if (compact === 'true') {
            console.log('[component-catalog] Compact mode requested.');
            const filterKeywords = keywords ? keywords.split(',').map(k => k.trim()) : [];
            const maxItems = max ? parseInt(max, 10) : 80;
            console.log(`[component-catalog] Filters: Keywords=[${filterKeywords}], MaxItems=${maxItems}`);
            const catalog = await getCatalogForPromptAsync(filterKeywords, maxItems);
            console.log(`[component-catalog] Returning ${catalog.components.length} compact components.`);
            return res.json({ success: true, ...catalog });
        }

        console.log('[component-catalog] Full catalog requested.');
        const catalog = await getCatalogAsync();
        console.log(`[component-catalog] Returning ${catalog.components.length} components.`);
        res.json({ success: true, ...catalog });
    } catch (error) {
        console.error('[component-catalog] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
