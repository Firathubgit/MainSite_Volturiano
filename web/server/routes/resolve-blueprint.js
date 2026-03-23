// Phase S7: Resolve Blueprint endpoint
// POST /api/resolve-blueprint
import { resolveBlueprint, persistBlueprint } from '../lib/blueprint-resolver.js';
import { log } from '../lib/build-manifest.js';

export default async function resolveBlueprintRoute(req, res) {
    try {
        const { prompt, buildId } = req.body;
        if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });

        console.log(`[resolve-blueprint] ROUTE HIT | Prompt: "${prompt.substring(0, 80)}..."`);
        if (buildId) log(buildId, `[resolve-blueprint] Resolving blueprint for: ${prompt.substring(0, 80)}...`);

        const result = await resolveBlueprint(prompt);

        // Optionally persist high-confidence AI-generated blueprints
        if (result.source === 'ai-generated' && result.confidence >= 0.75) {
            persistBlueprint(result.blueprint).catch(e =>
                console.warn('[resolve-blueprint] Background persist failed:', e.message)
            );
        }

        if (buildId) log(buildId, `[resolve-blueprint] Resolved: ${result.blueprint.name} (${result.source}, confidence: ${result.confidence.toFixed(2)})`);

        res.json({
            success: true,
            blueprint: result.blueprint,
            source: result.source,
            confidence: result.confidence,
        });
    } catch (error) {
        console.error('[resolve-blueprint] Error:', error.message);

        if (error.name === 'AI_RetryError' || error.message?.includes('429') || error.message?.includes('503')) {
            return res.status(503).json({
                success: false,
                error: 'AI Provider unavailable. Please try again later.',
            });
        }

        res.status(500).json({ success: false, error: error.message });
    }
}
