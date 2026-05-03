import { supabaseAdmin } from '../lib/supabase-admin.js';

/**
 * POST /api/issues
 * Allows users to report platform issues from various pages.
 */
export default async function submitIssue(req, res) {
    try {
        const { content, pageSource } = req.body;
        const userId = req.user?.id; // Supplied by optionalAuth middleware

        if (!content || typeof content !== 'string') {
            return res.status(400).json({ success: false, error: 'Issue content is required' });
        }
        if (!pageSource) {
             return res.status(400).json({ success: false, error: 'pageSource is required' });
        }
        if (!userId) {
             return res.status(401).json({ success: false, error: 'You must be logged in to report an issue' });
        }

        if (!supabaseAdmin) {
            console.error('[Issues API] supabaseAdmin is not initialized');
            return res.status(500).json({ success: false, error: 'Database configuration missing' });
        }

        const { data, error } = await supabaseAdmin
            .from('platform_issues')
            .insert({
                user_id: userId,
                content: content.trim(),
                page_source: pageSource
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Issues API] DB Insert Error:', error);
            return res.status(500).json({ success: false, error: `Database error: ${error.message}` });
        }

        console.log(`[Issues API] Captured new issue from user ${userId} on ${pageSource}`);
        
        res.status(200).json({ success: true, issueId: data.id });
    } catch (error) {
        console.error('[Issues API] Fatal Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error processing issue' });
    }
}
