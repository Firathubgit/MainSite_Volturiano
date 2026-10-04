import { buildTemplateCodeAsync, listTemplatesAsync, getTemplateAsync } from '../lib/registry/registry.js';

/**
 * POST /api/build-template
 *
 * Resolves a template by ID, fetches all component bundles,
 * assembles App.jsx, and returns the complete code payload
 * ready for apply-ai-code-stream.
 *
 * Body: { templateId }
 * Returns: { success, code, resolvedComponents, missingComponents }
 *
 * GET /api/build-template?list=true
 * Returns: { success, templates: [...] }
 */
export default async function buildTemplate(req, res) {
    try {
        // GET mode: list available templates
        if (req.method === 'GET' && req.query.list === 'true') {
            const templates = await listTemplatesAsync();
            return res.json({ success: true, templates });
        }

        // POST mode: build a specific template
        const { templateId } = req.body || {};

        if (!templateId) {
            return res.status(400).json({ success: false, error: 'templateId is required' });
        }

        console.log(`[build-template] Building template: ${templateId}`);

        const result = await buildTemplateCodeAsync(templateId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        if (result.missingComponents.length > 0) {
            console.warn(`[build-template] Missing components: ${result.missingComponents.join(', ')}`);
        }

        console.log(`[build-template] Resolved ${result.resolvedComponents.length} components for ${templateId}`);

        res.json(result);
    } catch (error) {
        console.error('[build-template] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
