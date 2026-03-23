import { getBundleAsync, bundleToFileBlocks } from '../lib/registry/registry.js';

/**
 * GET /api/component-bundle
 *
 * Returns the full bundle JSON for a specific premium component.
 * Query params:
 *   - id (required): Component ID, e.g. "hero.video.aurora.v1"
 *   - format: "json" (default) or "fileblocks" (returns <file>...</file> format)
 */
export default async function componentBundle(req, res) {
    try {
        let { id, format = 'json' } = req.query;
        let propsOverrides = {};

        // Support POST for complex data (props overrides)
        if (req.method === 'POST') {
            const body = req.body || {};
            if (body.id) id = body.id;
            if (body.format) format = body.format;
            if (body.propsOverrides) propsOverrides = body.propsOverrides;
        }

        if (!id) {
            console.error('[component-bundle] Missing ID');
            return res.status(400).json({ success: false, error: 'id query parameter is required' });
        }

        console.log(`[component-bundle] Request for ID: ${id}, Format: ${format}`);

        const bundle = await getBundleAsync(id);
        if (!bundle) {
            console.warn(`[component-bundle] Bundle not found in Supabase: ${id}`);
            return res.status(404).json({ success: false, error: `Bundle not found: ${id}` });
        }

        if (format === 'fileblocks') {
            console.log(`[component-bundle] Converting bundle ${id} to fileblocks...`);
            const blocks = bundleToFileBlocks(bundle, propsOverrides);
            return res.json({ success: true, id, fileBlocks: blocks });
        }

        console.log(`[component-bundle] Returning full JSON for bundle ${id}`);
        res.json({ success: true, bundle });
    } catch (error) {
        console.error('[component-bundle] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
