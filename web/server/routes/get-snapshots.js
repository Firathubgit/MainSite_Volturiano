import { db } from '../lib/store/index.js';
import { assertProjectOwner, sendOwnershipError } from '../lib/security/project-access.js';

export default async function getSnapshots(req, res) {
    try {
        const { projectId } = req.query;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        await assertProjectOwner(projectId, req.user.id);

        const { data, error } = await db
            .from('snapshots')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, error: 'Failed to fetch snapshots' });
        }
        return res.json({ success: true, snapshots: data });
    } catch (err) {
        if (err?.name === 'OwnershipError') return sendOwnershipError(res, err);
        console.error('[API] /snapshots get failed:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
}
