import { supabaseAdmin } from '../lib/supabase-admin.js';

const MAX_CONTENT_CHARS = 4000;
const MAX_PAGE_SOURCE_CHARS = 200;

/**
 * POST /api/feedback
 * Allows authenticated users to submit platform feedback from various pages.
 */
export default async function submitFeedback(req, res) {
    try {
        const rawContent = req.body?.content;
        const rawPageSource = req.body?.pageSource;
        const userId = req.user?.id; // Supplied by optionalAuth middleware

        if (typeof rawContent !== 'string' || !rawContent.trim()) {
            return res.status(400).json({ success: false, error: 'Feedback content is required' });
        }
        if (typeof rawPageSource !== 'string' || !rawPageSource.trim()) {
            return res.status(400).json({ success: false, error: 'pageSource is required' });
        }
        if (!userId) {
            return res.status(401).json({ success: false, error: 'You must be logged in to submit feedback' });
        }

        const content = rawContent.trim().slice(0, MAX_CONTENT_CHARS);
        const pageSource = rawPageSource.trim().slice(0, MAX_PAGE_SOURCE_CHARS);

        if (!supabaseAdmin) {
            console.error('[Feedback API] supabaseAdmin is not initialized');
            return res.status(500).json({ success: false, error: 'Database configuration missing' });
        }

        const { data, error } = await supabaseAdmin
            .from('platform_feedback')
            .insert({
                user_id: userId,
                content,
                page_source: pageSource
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Feedback API] DB Insert Error:', error);
            return res.status(500).json({ success: false, error: `Database error: ${error.message}` });
        }

        console.log(`[Feedback API] Captured new feedback from user ${userId} on ${pageSource}`);

        res.status(200).json({ success: true, feedbackId: data.id });
    } catch (error) {
        console.error('[Feedback API] Fatal Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error processing feedback' });
    }
}
