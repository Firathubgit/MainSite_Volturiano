import { updateProject } from '../lib/db/projects.js';

export default async function updateProjectRoute(req, res) {
    console.log('[API] /projects/update called');
    try {
        const { buildId, updates } = req.body;
        const userId = req.user?.id; // from optionalAuth

        if (!buildId) {
            return res.status(400).json({ success: false, error: 'buildId is required' });
        }

        // Optional: We can strictly enforce that updates don't alter user_id
        if (updates && updates.user_id) {
            delete updates.user_id;
        }

        // Phase S2: We update the project data dynamically as it generates
        await updateProject(buildId, updates);

        return res.status(200).json({ success: true, message: 'Project updated successfully.' });

    } catch (err) {
        console.error('[API] /projects/update error:', err);
        res.status(500).json({ success: false, error: 'Internal server error updating project.' });
    }
}
