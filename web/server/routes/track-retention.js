import { recordComponentRetention } from '../lib/retention-tracker.js';

export default async function trackRetention(req, res) {
    const { buildId, keptComponentIds, removedComponentIds } = req.body;

    if (!buildId) {
        return res.status(400).json({ success: false, error: 'buildId is required' });
    }

    try {
        await recordComponentRetention(buildId, keptComponentIds || [], removedComponentIds || []);
        res.json({ success: true, message: 'Retention recorded successfully' });
    } catch (error) {
        console.error('[track-retention] Error recording retention:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
