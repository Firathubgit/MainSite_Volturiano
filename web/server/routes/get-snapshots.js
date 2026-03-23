import { supabaseAdmin } from '../lib/supabase-admin.js';

export default async function getSnapshots(req, res) {
    try {
        const { projectId } = req.query;
        const userId = req.user?.id;

        if (!projectId) {
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        let query = supabaseAdmin
            .from('snapshots')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (userId) {
            // Optional: for added security if we want to bypass admin role check, 
            // but since we use admin client we just filter.
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[API] /snapshots get error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch snapshots' });
        }

        return res.status(200).json({ success: true, snapshots: data });

    } catch (err) {
        console.error('[API] /snapshots get exception:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
}
