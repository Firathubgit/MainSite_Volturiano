import { supabaseAdmin } from '../lib/supabase-admin.js';

export default async function getProject(req, res) {
    console.log('[API] /projects/get called');
    try {
        const { projectId } = req.query;
        const userId = req.user?.id;

        if (!projectId) {
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        // 1. Get project metadata
        const { data: project, error: pErr } = await supabaseAdmin
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (pErr || !project) {
            console.error('[API] /projects/get error fetching project:', pErr);
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // 2. Security check: if user_id is set, it must match
        if (project.user_id && project.user_id !== userId) {
            // Note: If user is not logged in but project has a user_id, we block it.
            // If project is anonymous, let it pass.
            return res.status(403).json({ success: false, error: 'Access denied to this project.' });
        }

        // 3. Get latest snapshot to restore files
        // We fetch the last 5 snapshots to ensure we pick the most recent one that IS NOT EMPTY.
        // This is a safety measure against sandbox timeout failures that might have saved empty snapshots.
        const { data: snapshots, error: sErr } = await supabaseAdmin
            .from('snapshots')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(5);

        // Find the first snapshot that actually has files
        // Files can be stored as an Object (key-value map) OR as an Array depending on the save path
        const latestSnapshot = snapshots?.find(s => {
            if (!s.files) return false;
            if (Array.isArray(s.files)) return s.files.length > 0;
            if (typeof s.files === 'object') return Object.keys(s.files).length > 0;
            // Handle stringified JSON
            if (typeof s.files === 'string') {
                try {
                    const parsed = JSON.parse(s.files);
                    if (Array.isArray(parsed)) return parsed.length > 0;
                    if (typeof parsed === 'object') return Object.keys(parsed).length > 0;
                } catch { return false; }
            }
            return false;
        }) || null;

        return res.status(200).json({
            success: true,
            project,
            latestSnapshot
        });

    } catch (err) {
        console.error('[API] /projects/get exception:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
}
