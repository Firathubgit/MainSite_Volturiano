
import { validateImports } from '../lib/import-graph.js';

export default async function validateImportsRoute(req, res) {
    try {
        const { files, premiumComponents = [] } = req.body;

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ success: false, error: 'Invalid files array' });
        }

        const issues = validateImports(files, premiumComponents);
        const valid = issues.length === 0;

        res.json({ success: true, valid, issues });
    } catch (error) {
        console.error('[validate-imports] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
