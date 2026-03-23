// server/routes/community/my-submissions.js
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function mySubmissions(req, res) {
    const userId = req.user.id;
    console.log(`[MySubmissions] Fetch started for user: ${userId}`);
    
    try {
        // 1. Fetch component submissions
        console.log('[MySubmissions] Fetching submissions...');
        const { data: submissions, error: subError } = await supabaseAdmin
            .from('community_submissions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (subError) {
            console.error('[MySubmissions] Submissions error:', subError);
            throw subError;
        }
        console.log(`[MySubmissions] Found ${submissions?.length || 0} submissions`);

        // 2. Fetch templates
        console.log('[MySubmissions] Fetching templates...');
        const { data: templates, error: templateError } = await supabaseAdmin
            .from('templates')
            .select('id, name, description, category, status, quality_score, usage_count, component_count, thumbnail_url, preview_image_url, created_at, source_mode')
            .eq('author_id', userId)
            .order('created_at', { ascending: false });

        if (templateError) {
            console.error('[MySubmissions] Templates error:', templateError);
            // Don't fail the whole request if only templates fail, but log it
        }
        console.log(`[MySubmissions] Found ${templates?.length || 0} templates`);

        // 3. Enriched submissions with component details
        const submissionIds = (submissions || []).map(s => s.id);
        let componentMap = {};
        let totalUses = 0;

        if (submissionIds.length > 0) {
            console.log('[MySubmissions] Fetching component metadata...');
            const { data: components } = await supabaseAdmin
                .from('components')
                .select('submission_id, preview_image_url, thumbnail_url, preview_video_url, usage_count')
                .in('submission_id', submissionIds);

            if (components) {
                for (const comp of components) {
                    totalUses += comp.usage_count || 0;
                    componentMap[comp.submission_id] = {
                        image: comp.preview_image_url || comp.thumbnail_url,
                        video: comp.preview_video_url,
                        usage_count: comp.usage_count || 0
                    };
                }
            }
        }

        const enrichedSubmissions = (submissions || []).map(sub => ({
            ...sub,
            thumbnail_url: sub.thumbnail_url || componentMap[sub.id]?.image || null,
            preview_video_url: sub.preview_video_url || componentMap[sub.id]?.video || null,
            usage_count: componentMap[sub.id]?.usage_count || 0
        }));

        // 4. Fetch profile stats
        console.log('[MySubmissions] Fetching profile stats...');
        const { data: profile, error: profError } = await supabaseAdmin
            .from('profiles')
            .select('reputation_score, components_submitted')
            .eq('id', userId)
            .single();

        if (profError) {
            console.warn('[MySubmissions] Profile stats error:', profError.message);
        }

        console.log('[MySubmissions] Success. Sending response.');
        res.json({
            success: true,
            submissions: enrichedSubmissions,
            templates: templates || [],
            stats: {
                reputation: profile?.reputation_score || 0,
                active_components: profile?.components_submitted || 0,
                total_uses: totalUses
            }
        });
    } catch (err) {
        console.error('[MySubmissions] Fatal Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}
