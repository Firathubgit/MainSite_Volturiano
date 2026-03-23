// server/routes/community/submit-template.js
// Phase S10: Synchronous Template Submission Handler
// Returns submission_id in <500ms. LLM analysis runs async via job queue.

import { supabaseAdmin } from '../../lib/supabase-admin.js';

/**
 * POST /api/community/submit-template
 * 
 * SYNCHRONOUS — Returns submission_id in <500ms.
 * Actual LLM analysis runs asynchronously via job queue.
 * 
 * Body: { name, description?, componentIdsInOrder (array of UUIDs), source_mode, thumbnail? (base64) }
 * Auth: Required (JWT in Authorization header)
 * Response: { success, submissionId, templateId, message, statusEndpoint }
 */
export default async function submitTemplate(req, res) {
    console.group('[submit-template] ════════════════════════════════════');
    console.log('[submit-template] 🚀 INCOMING request at', new Date().toISOString());
    console.log('[submit-template] User ID:', req.user?.id || 'NONE');
    console.log('[submit-template] Body keys:', Object.keys(req.body || {}));
    console.log('[submit-template] Body:', JSON.stringify(req.body, null, 2));

    try {
        const userId = req.user?.id;
        if (!userId) {
            console.error('[submit-template] ❌ AUTH FAILED — No user ID');
            console.groupEnd();
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        console.log('[submit-template] ✅ Auth passed, userId:', userId);

        const { name, description, componentIdsInOrder, source_mode, thumbnail } = req.body;

        // ─── VALIDATION ───

        // 1. Required fields
        if (!name || !componentIdsInOrder || !Array.isArray(componentIdsInOrder)) {
            console.error('[submit-template] ❌ VALIDATION — Missing name or componentIdsInOrder', { name: !!name, isArray: Array.isArray(componentIdsInOrder), length: componentIdsInOrder?.length });
            console.groupEnd();
            return res.status(400).json({
                success: false,
                error: 'name and componentIdsInOrder (array) are required'
            });
        }

        if (name.length < 3 || name.length > 150) {
            console.error('[submit-template] ❌ VALIDATION — Name length:', name.length);
            console.groupEnd();
            return res.status(400).json({ success: false, error: 'Name must be 3-150 characters' });
        }

        console.log('[submit-template] ✅ Validation passed —', componentIdsInOrder.length, 'components, source_mode:', source_mode);

        if (componentIdsInOrder.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'A template must have at least 2 components'
            });
        }

        if (componentIdsInOrder.length > 20) {
            return res.status(400).json({
                success: false,
                error: 'A template can have at most 20 components'
            });
        }

        // 2. Validate source_mode
        const validModes = ['community-composed', 'community-extracted'];
        const finalSourceMode = validModes.includes(source_mode) ? source_mode : 'community-composed';

        console.log('[submit-template] 🔍 Checking rate limit (last 24h)...');
        const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();
        const { count, error: countError } = await supabaseAdmin
            .from('community_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('submission_type', 'template')
            .gte('created_at', twentyFourHoursAgo);

        if (countError) {
            console.error('[submit-template] ❌ RATE LIMIT CHECK FAILED:', countError.message);
            console.groupEnd();
            return res.status(500).json({ success: false, error: 'Failed to check submission rate' });
        }

        if (count >= 5) {
            console.error('[submit-template] ❌ RATE LIMIT HIT:', count, '/5 today');
            console.groupEnd();
            return res.status(429).json({
                success: false,
                error: 'Daily template submission limit reached (5/day). Try again tomorrow.'
            });
        }
        console.log('[submit-template] ✅ Rate limit OK:', count, '/5 today');

        // 4. Verify all component IDs exist and are active
        console.log('[submit-template] 🔍 Validating', componentIdsInOrder.length, 'component IDs against Supabase...');
        console.log('[submit-template] Component IDs:', componentIdsInOrder);
        const { data: validComponents, error: compError } = await supabaseAdmin
            .from('components')
            .select('id, name, category, description, visual_description')
            .in('id', componentIdsInOrder)
            .eq('status', 'active');

        if (compError) {
            console.error('[submit-template] ❌ COMPONENT VALIDATION QUERY ERROR:', compError.message);
            console.error('[submit-template] Error details:', JSON.stringify(compError));
            console.groupEnd();
            return res.status(500).json({ success: false, error: 'Failed to validate components' });
        }

        const validIds = new Set(validComponents.map(c => c.id));
        const invalidIds = componentIdsInOrder.filter(id => !validIds.has(id));

        console.log('[submit-template] Valid components found:', validComponents.length, '/', componentIdsInOrder.length);
        console.log('[submit-template] Valid component names:', validComponents.map(c => c.name));

        if (invalidIds.length > 0) {
            console.error('[submit-template] ❌ INVALID COMPONENT IDS:', invalidIds);
            console.groupEnd();
            return res.status(400).json({
                success: false,
                error: `The following component IDs are invalid or not active: ${invalidIds.join(', ')}`,
                invalidIds
            });
        }

        console.log('[submit-template] ✅ All', componentIdsInOrder.length, 'components validated');

        // ─── INSERT SUBMISSION (status='processing') ───
        console.log('[submit-template] 📝 Inserting community_submissions record...');
        const { data: submission, error: insertError } = await supabaseAdmin
            .from('community_submissions')
            .insert({
                user_id: userId,
                submission_type: 'template',
                name: name,
                code: JSON.stringify({ componentIdsInOrder, source_mode: finalSourceMode }),
                content_hash: null, // Templates don't need dedup by hash
                thumbnail_base64: thumbnail || null,
                quality_score: null,
                status: 'processing',
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('[submit-template] ❌ SUBMISSION INSERT FAILED:', insertError.message);
            console.error('[submit-template] Insert error details:', JSON.stringify(insertError));
            console.groupEnd();
            return res.status(500).json({ success: false, error: 'Failed to save submission' });
        }

        console.log('[submit-template] ✅ Submission created:', submission.id);

        // ─── INSERT TEMPLATE (status='draft', pending LLM analysis) ───
        console.log('[submit-template] 📝 Inserting templates record...');
        const { data: templateRow, error: templateError } = await supabaseAdmin
            .from('templates')
            .insert({
                name: name,
                description: description || null,
                author_id: userId,
                author_type: 'community',
                category: 'uncategorized',
                source_mode: finalSourceMode,
                component_ids: componentIdsInOrder,
                component_count: componentIdsInOrder.length,
                status: 'draft',
                quality_score: null,
                usage_count: 0,
            })
            .select('id')
            .single();

        if (templateError) {
            console.error('[submit-template] ❌ TEMPLATE INSERT FAILED:', templateError.message);
            console.error('[submit-template] Template error details:', JSON.stringify(templateError));
            // Clean up the submission
            console.log('[submit-template] 🧹 Cleaning up submission', submission.id);
            await supabaseAdmin.from('community_submissions').delete().eq('id', submission.id);
            console.groupEnd();
            return res.status(500).json({ success: false, error: 'Failed to create template record' });
        }

        console.log('[submit-template] ✅ Template created:', templateRow.id);

        // ─── INSERT TEMPLATE_SECTIONS (ordered junction records) ───
        console.log('[submit-template] 📝 Inserting', componentIdsInOrder.length, 'template_sections...');
        const sectionRows = componentIdsInOrder.map((compId, index) => {
            const comp = validComponents.find(c => c.id === compId);
            return {
                template_id: templateRow.id,
                component_id: compId,
                section_order: index + 1,
                section_label: comp?.name || `Section ${index + 1}`,
                component_version: 1,
            };
        });

        const { error: sectionsError } = await supabaseAdmin
            .from('template_sections')
            .insert(sectionRows);

        if (sectionsError) {
            console.error('[submit-template] ⚠️ SECTIONS INSERT FAILED (non-fatal):', sectionsError.message);
            console.error('[submit-template] Sections error details:', JSON.stringify(sectionsError));
        } else {
            console.log('[submit-template] ✅', sectionRows.length, 'sections inserted');
        }

        // ─── ENQUEUE ASYNC JOB ───
        console.log('[submit-template] 📝 Enqueuing submission_jobs...');
        const { error: jobError } = await supabaseAdmin.from('submission_jobs').insert({
            submission_id: submission.id,
            job_type: 'analyze_template',
            status: 'pending',
            attempts: 0,
            max_attempts: 3,
            metadata: JSON.stringify({
                template_id: templateRow.id,
                component_ids: componentIdsInOrder,
            }),
        });

        if (jobError) {
            console.error('[submit-template] ⚠️ JOB ENQUEUE FAILED (non-fatal):', jobError.message);
        } else {
            console.log('[submit-template] ✅ Async job enqueued for submission:', submission.id);
        }

        // ─── REPUTATION: +8 for submitting a template ───
        try {
            await supabaseAdmin.rpc('increment_reputation', {
                p_user_id: userId,
                p_points: 8,
            });
        } catch (repErr) {
            console.warn('[submit-template] Reputation increment failed (non-fatal):', repErr.message);
        }

        console.log('[submit-template] ✅✅✅ TEMPLATE SUBMISSION COMPLETE');
        console.log('[submit-template] submissionId:', submission.id);
        console.log('[submit-template] templateId:', templateRow.id);
        console.log('[submit-template] components:', componentIdsInOrder.length);
        console.groupEnd();

        return res.json({
            success: true,
            submissionId: submission.id,
            templateId: templateRow.id,
            message: 'Template submitted! Analysis in progress...',
            statusEndpoint: `/api/community/submission-status/${submission.id}`
        });
    } catch (err) {
        console.error('[submit-template] 💥 UNHANDLED EXCEPTION:', err);
        console.error('[submit-template] Stack:', err.stack);
        console.groupEnd();
        return res.status(500).json({ success: false, error: 'Internal server error processing template submission.' });
    }
}
