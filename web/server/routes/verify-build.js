
import { verifySandboxBuild } from '../lib/verify-sandbox-build.js';

export default async function verifyBuildRoute(req, res) {
    try {
        const { sandboxId } = req.body;

        if (!sandboxId) {
            return res.status(400).json({ success: false, error: 'Sandbox ID required' });
        }

        const result = await verifySandboxBuild(sandboxId);
        res.json(result);

    } catch (error) {
        console.error('[verify-build] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
