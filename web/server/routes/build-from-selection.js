import { buildSelectionCodeAsync } from '../lib/registry/registry.js';

/**
 * POST /api/build-from-selection
 *
 * Builds a functional app from a manually selected list of component IDs.
 * Bypasses AI planning and reasoning.
 *
 * Body: { componentIds: string[], buildId: string }
 * Returns: { success, code, resolvedComponents, missingComponents }
 */
export default async function buildFromSelection(req, res) {
    try {
        const { componentIds, buildId } = req.body || {};

        if (!componentIds || !Array.isArray(componentIds) || componentIds.length === 0) {
            return res.status(400).json({ success: false, error: 'componentIds array is required' });
        }

        console.log(`[build-from-selection] Building ${componentIds.length} components for build ${buildId}`);
        console.log('[build-from-selection] Raw IDs received:', componentIds);

        const result = await buildSelectionCodeAsync(componentIds);

        console.log('[build-from-selection] Build Result:', {
            success: result.success,
            resolved: result.resolvedComponents,
            missing: result.missingComponents,
            codeLength: result.code?.length
        });

        if (!result.success) {
            console.error('[build-from-selection] Fatal Registry Error:', result.error);
            return res.status(500).json(result);
        }

        if (result.missingComponents.length > 0) {
            console.warn(`[build-from-selection] Missing components: ${result.missingComponents.join(', ')}`);
        }

        console.log(`[build-from-selection] Resolved ${result.resolvedComponents.length} components`);

        res.json(result);
    } catch (error) {
        console.error('[build-from-selection] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
