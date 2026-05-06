// server/routes/community/index.js
// Phase S9.17: Community API Routes — Consolidated Router
// All community endpoints registered under /api/community/*

import { Router } from 'express';
import submitComponent from './submit-component.js';
import submitTemplate from './submit-template.js';
import extractTemplate from './extract-template.js';
import suggestFix from './suggest-fix.js';
import mySubmissions from './my-submissions.js';
import { createHash } from 'crypto';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAuth, optionalAuth } from '../../middleware/authMiddleware.js';
import { requireBuilderAdmin } from '../../lib/security/admin-access.js';

const router = Router();

function submissionStatusMessage(status) {
    if (status === 'active' || status === 'approved') return 'Component approved and live!';
    if (status === 'rejected') return 'Component did not meet quality standards.';
    if (status === 'flagged') return 'Component is flagged for review.';
    return 'Component is prepared and pending admin review.';
}

async function getActiveComponent(componentId, select = 'id') {
    const { data, error } = await supabaseAdmin
        .from('components')
        .select(select)
        .eq('id', componentId)
        .eq('status', 'active')
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

// TEMPORARY Admin route to update component media
// TEMPORARY Admin route to update component media (Native Upload)
router.post('/components/:id/update-media', requireAuth, requireBuilderAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            type,       // 'image' or 'video'
            fileData,   // raw base64 data
            fileName,   // original filename
            thumbnail_url,
            preview_image_url,
            preview_video_url
        } = req.body;

        const updates = {};

        // Handle raw file data if provided
        if (fileData) {
            console.log(`[Backend-Upload] Starting native ${type} upload for ID: ${id}`);

            // Extract clean base64 and mime type
            const base64Parts = fileData.split('base64,');
            const dataHeader = base64Parts[0];
            const base64Body = base64Parts[1] || base64Parts[0];
            const buffer = Buffer.from(base64Body, 'base64');

            let mimeType = 'application/octet-stream';
            let fileExt = fileName?.split('.').pop() || 'bin';

            if (dataHeader.startsWith('data:')) {
                const match = dataHeader.match(/^data:([^;]+);/);
                if (match) {
                    mimeType = match[1];
                }
            }

            const nativePath = `previews/native_${id}_${Date.now()}.${fileExt}`;
            console.log(`[Backend-Upload] Destination: ${nativePath} (${buffer.length} bytes)`);

            // Upload using Admin client to bypass RLS
            const { error: uploadErr } = await supabaseAdmin.storage
                .from('component-previews')
                .upload(nativePath, buffer, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('component-previews')
                .getPublicUrl(nativePath);

            console.log(`[Backend-Upload] Success! URL: ${publicUrl}`);

            if (type === 'image') {
                updates.thumbnail_url = publicUrl;
                updates.preview_image_url = publicUrl;
            } else {
                updates.preview_video_url = publicUrl;
            }
        }

        // Direct URL updates
        if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
        if (preview_image_url !== undefined) updates.preview_image_url = preview_image_url;
        if (preview_video_url !== undefined) updates.preview_video_url = preview_video_url;

        if (Object.keys(updates).length > 0) {
            const { error } = await supabaseAdmin
                .from('components')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        }

        res.json({ success: true, message: 'Media updated natively', updates });
    } catch (err) {
        console.error('Native Update media error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// 2. POST /api/community/submit-component
// Body: { name, description?, categoryHint?, code, thumbnail?, video? }
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
router.post('/submit-component', requireAuth, submitComponent);

// ═══════════════════════════════════════════════════════════════
// Phase S10: POST /api/community/submit-template
// Body: { name, description?, componentIdsInOrder, source_mode, thumbnail? }
// ═══════════════════════════════════════════════════════════════
router.post('/submit-template', requireAuth, submitTemplate);

// ═══════════════════════════════════════════════════════════════
// Phase S10: POST /api/community/extract-template
// Extracts component stack from a build and submits as template
// ═══════════════════════════════════════════════════════════════
router.post('/extract-template', requireAuth, extractTemplate);

// ═══════════════════════════════════════════════════════════════
// 3. GET /api/community/my-submissions
// Returns user submissions and profile stats
// ═══════════════════════════════════════════════════════════════
router.get('/my-submissions', requireAuth, mySubmissions);

// ═══════════════════════════════════════════════════════════════
// 2. GET /api/community/submission-status/:id  (JSON snapshot)
//
// NOTE — Why this is JSON and not SSE:
//   The browser's native EventSource cannot attach an Authorization
//   header, so SSE clients are forced to put the JWT in the query
//   string. Our auth middleware (correctly) rejects query-string
//   tokens because they leak through browser history, server logs,
//   and Referer headers. So we hand back a one-shot JSON snapshot
//   per request and let the client poll with a normal Bearer header.
//   The shape mirrors what the SSE event stream used to emit so
//   nothing else needs to change.
// ═══════════════════════════════════════════════════════════════
router.get('/submission-status/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const submissionId = req.params.id;

    try {
        const { data: submission, error } = await supabaseAdmin
            .from('community_submissions')
            .select('id, user_id, status, quality_score, name')
            .eq('id', submissionId)
            .single();

        if (error || !submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }
        if (submission.user_id !== userId) {
            return res.status(403).json({ success: false, error: 'Not your submission' });
        }

        const FINISHED = ['active', 'approved', 'rejected', 'flagged', 'pending', 'pending_review'];

        if (FINISHED.includes(submission.status)) {
            return res.json({
                success: true,
                step: 'complete',
                progress: 100,
                status: submission.status,
                qualityScore: submission.quality_score,
                message: submissionStatusMessage(submission.status),
                done: true,
            });
        }

        const { data: job } = await supabaseAdmin
            .from('submission_jobs')
            .select('status, attempts, error_log')
            .eq('submission_id', submissionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (job?.status === 'failed') {
            return res.json({
                success: true,
                step: 'failed',
                progress: 0,
                status: 'failed',
                message: job.error_log || 'Processing failed. Please try again.',
                done: true,
            });
        }

        let step = 'queued';
        let progress = 15;
        if (job?.status === 'running') {
            step = 'analyzing';
            progress = 65;
        }

        return res.json({
            success: true,
            step,
            progress,
            status: submission.status || 'processing',
            done: false,
        });
    } catch (err) {
        console.error('[community] submission-status error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch submission status' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 4. PUT /api/community/submissions/:id
// Auth: Must be author, only if status = 'draft' or 'rejected'
// Body: { code, name?, description? }
// ═══════════════════════════════════════════════════════════════
router.put('/submissions/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const submissionId = req.params.id;
    const { code, name, description } = req.body;

    try {
        // Fetch and verify ownership + editable status
        const { data: submission } = await supabaseAdmin
            .from('community_submissions')
            .select('id, user_id, status')
            .eq('id', submissionId)
            .eq('user_id', userId)
            .single();

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found or not yours' });
        }

        if (!['draft', 'rejected'].includes(submission.status)) {
            return res.status(400).json({ success: false, error: 'Only draft or rejected submissions can be edited' });
        }

        // Build update object
        const updates = { updated_at: new Date().toISOString() };
        if (code) {
            updates.code = code;
            updates.content_hash = createHash('sha256').update(code.replace(/\s+/g, ' ').trim()).digest('hex');
        }
        if (name) updates.name = name;
        if (description) updates.description = description;

        const { error } = await supabaseAdmin
            .from('community_submissions')
            .update(updates)
            .eq('id', submissionId);

        if (error) throw error;

        return res.json({ success: true, submissionId });
    } catch (err) {
        console.error('[community] update submission error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to update submission' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 5. DELETE /api/community/submissions/:id (soft-delete → deprecated)
// ═══════════════════════════════════════════════════════════════
router.delete('/submissions/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const submissionId = req.params.id;

    try {
        const { data: submission } = await supabaseAdmin
            .from('community_submissions')
            .select('id, user_id, status')
            .eq('id', submissionId)
            .eq('user_id', userId)
            .single();

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found or not yours' });
        }

        // 1. Delete linked component from components table
        await supabaseAdmin.from('components')
            .delete()
            .eq('submission_id', submissionId);

        // 2. Delete linked jobs
        await supabaseAdmin.from('submission_jobs')
            .delete()
            .eq('submission_id', submissionId);

        // 3. Delete screenshot from storage (non-fatal if missing)
        try {
            await supabaseAdmin.storage
                .from('component-previews')
                .remove([`submissions/${submissionId}/preview.png`]);
        } catch (e) { /* ignore */ }

        // 4. Delete the submission itself
        await supabaseAdmin.from('community_submissions')
            .delete()
            .eq('id', submissionId);

        return res.json({ success: true, message: 'Submission permanently deleted' });
    } catch (err) {
        console.error('[community] delete submission error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to delete submission' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 6. POST /api/community/submissions/:id/edit (VERSIONING)
// Auth: Must be author, component must be 'active'
// Body: { code } — Creates new version via job queue
// S9.10: Edit → deprecate v1 → create v2 submission → enqueue analysis
// ═══════════════════════════════════════════════════════════════
router.post('/submissions/:id/edit', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const componentDbId = req.params.id;
    const { code } = req.body;

    if (!code || code.length < 100) {
        return res.status(400).json({ success: false, error: 'Code is required (minimum 100 characters)' });
    }

    try {
        // 1. Fetch existing component (must be active and owned by user)
        const { data: existing } = await supabaseAdmin
            .from('components')
            .select('*')
            .eq('id', componentDbId)
            .eq('author_id', userId)
            .eq('status', 'active')
            .single();

        if (!existing) {
            return res.status(404).json({ success: false, error: 'Component not found, not yours, or not active' });
        }

        // 2. Deprecate old version (immutable — templates keep referencing it)
        await supabaseAdmin.from('components')
            .update({ status: 'deprecated', updated_at: new Date().toISOString() })
            .eq('id', componentDbId);

        // 3. Create new submission for the new version
        const newVersionNumber = (existing.version_number || 1) + 1;
        const contentHash = createHash('sha256').update(code.replace(/\s+/g, ' ').trim()).digest('hex');

        const { data: submission, error: insertError } = await supabaseAdmin
            .from('community_submissions')
            .insert({
                user_id: userId,
                submission_type: 'component',
                name: existing.name || existing.display_name,
                code: code,
                content_hash: contentHash,
                status: 'processing',
                ip_attestation_accepted_at: new Date().toISOString(),
                license_grant_accepted_at: new Date().toISOString(),
                attestation_version: 'community-version-update-v1',
                license_type: 'MIT',
            })
            .select('id')
            .single();

        if (insertError) throw insertError;

        // 4. Enqueue analysis job (same async pipeline as new submissions)
        await supabaseAdmin.from('submission_jobs').insert({
            submission_id: submission.id,
            status: 'pending',
            attempts: 0,
            max_attempts: 3,
        });

        console.log(`[community] Version bump: ${existing.component_id} v${existing.version_number} → v${newVersionNumber}`);

        return res.json({
            success: true,
            submissionId: submission.id,
            newVersion: newVersionNumber,
            message: `Version ${newVersionNumber} submitted for analysis. Previous version deprecated.`,
            statusEndpoint: `/api/community/submission-status/${submission.id}`,
        });
    } catch (err) {
        console.error('[community] edit/version error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to create new version' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 7. POST /api/community/submissions/:id/deprecate
// Author soft-deletes their active component
// ═══════════════════════════════════════════════════════════════
router.post('/submissions/:id/deprecate', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const componentId = req.params.id;

    try {
        // Find the active component owned by this user
        const { data: component } = await supabaseAdmin
            .from('components')
            .select('id, author_id, usage_count, status')
            .eq('id', componentId)
            .eq('author_id', userId)
            .eq('status', 'active')
            .single();

        if (!component) {
            return res.status(404).json({ success: false, error: 'Component not found, not yours, or not active' });
        }

        // Soft-delete: deprecated (templates can still reference it)
        await supabaseAdmin.from('components')
            .update({ status: 'deprecated', updated_at: new Date().toISOString() })
            .eq('id', componentId);

        // Also deprecate the linked submission
        await supabaseAdmin.from('community_submissions')
            .update({ status: 'deprecated', updated_at: new Date().toISOString() })
            .eq('component_id', componentId)
            .eq('user_id', userId);

        // Reputation: -5 for self-deprecation
        try {
            await supabaseAdmin.rpc('increment_reputation', {
                p_user_id: userId,
                p_points: -5,
            });
        } catch (repErr) {
            console.warn('[community] Reputation decrement failed (non-fatal):', repErr.message);
        }

        return res.json({
            success: true,
            message: 'Component deprecated. Templates using it will continue to work.',
        });
    } catch (err) {
        console.error('[community] deprecate error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to deprecate component' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 8. POST /api/community/rate/:componentId
// Auth: Required (cannot rate own component — DB trigger enforces)
// Body: { rating: 1-5, reviewText?, reviewTitle? }
// ═══════════════════════════════════════════════════════════════
router.post('/rate/:componentId', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const componentId = req.params.componentId;
    const { rating, reviewText, reviewTitle } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    try {
        const activeComponent = await getActiveComponent(componentId, 'id, author_id');
        if (!activeComponent) {
            return res.status(404).json({ success: false, error: 'Component not found' });
        }

        // Upsert: update if exists, insert if new
        const { error } = await supabaseAdmin
            .from('component_ratings')
            .upsert({
                component_id: componentId,
                user_id: userId,
                rating: parseInt(rating),
                review_text: reviewText || null,
                review_title: reviewTitle || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'component_id,user_id',
            });

        if (error) {
            // Self-rating trigger will throw 'Cannot rate your own component'
            if (error.message?.includes('Cannot rate your own')) {
                return res.status(403).json({ success: false, error: 'You cannot rate your own component' });
            }
            throw error;
        }

        // Reputation: +3 for the component author if rating >= 4
        if (rating >= 4) {
            if (activeComponent?.author_id) {
                try {
                    await supabaseAdmin.rpc('increment_reputation', {
                        p_user_id: activeComponent.author_id,
                        p_points: 3,
                    });
                } catch (repErr) {
                    console.warn('[community] Rating reputation increment failed:', repErr.message);
                }
            }
        }

        return res.json({ success: true, message: 'Rating saved' });
    } catch (err) {
        console.error('[community] rate error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to save rating' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 9. GET /api/community/components/:id/ratings
// Public — anyone can read ratings
// Query: ?page=1&limit=10&sort=newest|helpful
// ═══════════════════════════════════════════════════════════════
router.get('/components/:id/ratings', async (req, res) => {
    const componentId = req.params.id;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
        const orderCol = sort === 'helpful' ? 'helpful_count' : 'created_at';

        const { data: ratings, count, error } = await supabaseAdmin
            .from('component_ratings')
            .select('*', { count: 'exact' })
            .eq('component_id', componentId)
            .order(orderCol, { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Get average
        const { data: comp } = await supabaseAdmin
            .from('components')
            .select('rating_avg, rating_count')
            .eq('id', componentId)
            .single();

        return res.json({
            success: true,
            ratings: ratings || [],
            average: comp?.rating_avg || 0,
            total: count || 0,
            page: parseInt(page),
            pages: Math.ceil((count || 0) / parseInt(limit)),
        });
    } catch (err) {
        console.error('[community] get ratings error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch ratings' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 10. POST /api/community/report/:componentId
// Auth: Required
// Body: { reason: 'copyright'|'malicious'|'nsfw'|'low-quality', details? }
// ═══════════════════════════════════════════════════════════════
router.post('/report/:componentId', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const componentId = req.params.componentId;
    const { reason, details } = req.body;

    const validReasons = ['copyright', 'malicious', 'nsfw', 'low-quality', 'other'];
    if (!reason || !validReasons.includes(reason)) {
        return res.status(400).json({
            success: false,
            error: `Invalid reason. Must be one of: ${validReasons.join(', ')}`
        });
    }

    try {
        const { data: comp } = await supabaseAdmin
            .from('components')
            .select('id, author_id, status')
            .eq('id', componentId)
            .eq('status', 'active')
            .single();

        if (!comp) {
            return res.status(404).json({ success: false, error: 'Component not found' });
        }

        const { error: reportError } = await supabaseAdmin
            .from('component_reports')
            .insert({
                component_id: componentId,
                reported_by: userId,
                reason,
                details: details ? String(details).slice(0, 2000) : null,
                status: 'open',
                metadata: { source: 'community_report_endpoint' }
            });

        if (reportError && !/duplicate|unique/i.test(reportError.message || '')) {
            throw reportError;
        }

        // Hide from catalog while an admin reviews the report.
        await supabaseAdmin.from('components')
            .update({
                status: 'flagged',
                updated_at: new Date().toISOString(),
            })
            .eq('id', componentId);

        // Reputation: -5 for the author (flagged for review)
        if (comp?.author_id) {
            try {
                await supabaseAdmin.rpc('increment_reputation', {
                    p_user_id: comp.author_id,
                    p_points: -5,
                });
            } catch (repErr) {
                console.warn('[community] Flag reputation decrement failed:', repErr.message);
            }
        }

        console.log(`[community] Component ${componentId} flagged by ${userId}: ${reason}`);

        return res.json({ success: true, message: 'Component flagged for review. Thank you for reporting.' });
    } catch (err) {
        console.error('[community] report error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to report component' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 10b. POST /api/community/takedown
// Public notice intake for copyright/IP claims.
// Body: { componentId?, submissionId?, requesterEmail, requesterName?, claimSummary, evidence? }
// ═══════════════════════════════════════════════════════════════
router.post('/takedown', async (req, res) => {
    const {
        componentId = null,
        submissionId = null,
        requesterEmail,
        requesterName = null,
        claimSummary,
        evidence = []
    } = req.body || {};

    const cleanEmail = String(requesterEmail || '').trim().slice(0, 320);
    const cleanSummary = String(claimSummary || '').trim().slice(0, 4000);

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, error: 'A valid requester email is required.' });
    }
    if (!cleanSummary) {
        return res.status(400).json({ success: false, error: 'A claim summary is required.' });
    }

    try {
        const { data: requestRow, error } = await supabaseAdmin
            .from('copyright_takedown_requests')
            .insert({
                component_id: componentId || null,
                submission_id: submissionId || null,
                requester_email: cleanEmail,
                requester_name: requesterName ? String(requesterName).trim().slice(0, 200) : null,
                claim_summary: cleanSummary,
                evidence: Array.isArray(evidence) ? evidence.slice(0, 20) : [],
                status: 'open',
                metadata: { source: 'community_takedown_endpoint' }
            })
            .select('id,status,created_at')
            .single();

        if (error) throw error;

        if (componentId) {
            await supabaseAdmin
                .from('components')
                .update({ status: 'flagged', updated_at: new Date().toISOString() })
                .eq('id', componentId)
                .eq('status', 'active');
        }

        return res.json({ success: true, takedownRequest: requestRow });
    } catch (err) {
        console.error('[community] takedown request error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to submit takedown request' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 11. GET /api/community/author-stats
// Auth: Required — returns the requesting user's community stats
// ═══════════════════════════════════════════════════════════════
router.get('/author-stats', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        // Profile stats
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('reputation_score, components_submitted')
            .eq('id', userId)
            .single();

        // Submission counts by status
        const { data: submissions } = await supabaseAdmin
            .from('community_submissions')
            .select('status')
            .eq('user_id', userId);

        const statusCounts = {};
        (submissions || []).forEach(s => {
            statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
        });

        // Total usage count across all user's active components
        const { data: components } = await supabaseAdmin
            .from('components')
            .select('usage_count, rating_avg')
            .eq('author_id', userId)
            .eq('status', 'active');

        const totalUses = (components || []).reduce((sum, c) => sum + (c.usage_count || 0), 0);
        const avgRating = components?.length > 0
            ? (components.reduce((sum, c) => sum + (c.rating_avg || 0), 0) / components.length).toFixed(1)
            : 0;

        return res.json({
            success: true,
            stats: {
                reputationScore: profile?.reputation_score || 0,
                componentsSubmitted: profile?.components_submitted || 0,
                statusCounts,
                totalUses,
                averageRating: parseFloat(avgRating),
                activeComponents: components?.length || 0,
            }
        });
    } catch (err) {
        console.error('[community] author-stats error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 12. GET /api/community/submission/:id
// Auth: Required (must be author or admin)
// Returns full submission details
// ═══════════════════════════════════════════════════════════════
router.get('/submission/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const submissionId = req.params.id;

    try {
        const { data: submission, error } = await supabaseAdmin
            .from('community_submissions')
            .select('*')
            .eq('id', submissionId)
            .single();

        if (error || !submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        if (submission.user_id !== userId) {
            return res.status(403).json({ success: false, error: 'Not your submission' });
        }

        return res.json({ success: true, submission });
    } catch (err) {
        console.error('[community] get submission error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch submission' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 13. POST /api/community/submissions/:id/resubmit
// Auth: Must be author, only if status = 'rejected'
// Resubmits a rejected component for re-analysis
// ═══════════════════════════════════════════════════════════════
router.post('/submissions/:id/resubmit', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const submissionId = req.params.id;

    try {
        const { data: submission } = await supabaseAdmin
            .from('community_submissions')
            .select('id, user_id, status')
            .eq('id', submissionId)
            .eq('user_id', userId)
            .single();

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found or not yours' });
        }

        if (submission.status !== 'rejected') {
            return res.status(400).json({ success: false, error: 'Only rejected submissions can be resubmitted' });
        }

        // Reset status and enqueue new analysis
        await supabaseAdmin.from('community_submissions')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', submissionId);

        await supabaseAdmin.from('submission_jobs').insert({
            submission_id: submissionId,
            status: 'pending',
            attempts: 0,
            max_attempts: 3,
        });

        return res.json({
            success: true,
            message: 'Submission resubmitted for analysis',
            statusEndpoint: `/api/community/submission-status/${submissionId}`,
        });
    } catch (err) {
        console.error('[community] resubmit error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to resubmit' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 14b. POST /api/community/suggest-fix
// Public (no auth) — AI-powered code fix for preview errors
// Body: { code, error, stage?, line? }
// ═══════════════════════════════════════════════════════════════
router.post('/suggest-fix', suggestFix);

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// 15. POST /api/community/like/:componentId
// Auth: Required — toggle like on a component
// ═══════════════════════════════════════════════════════════════
router.post('/like/:componentId', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const componentId = req.params.componentId;

    try {
        const activeComponent = await getActiveComponent(componentId);
        if (!activeComponent) {
            return res.status(404).json({ success: false, error: 'Component not found' });
        }

        // Check if already liked
        const { data: existing } = await supabaseAdmin
            .from('component_likes')
            .select('id')
            .eq('user_id', userId)
            .eq('component_id', componentId)
            .maybeSingle();

        if (existing) {
            // Remove like
            await supabaseAdmin.from('component_likes')
                .delete()
                .eq('id', existing.id);
            return res.json({ success: true, liked: false, message: 'Component unliked' });
        } else {
            // Add like
            await supabaseAdmin.from('component_likes')
                .insert({ user_id: userId, component_id: componentId });
            return res.json({ success: true, liked: true, message: 'Component liked' });
        }
    } catch (err) {
        console.error('[community] like error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to toggle like' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 15a. GET /api/community/liked-components
// Auth: Required — fetch all components liked by the user
// ═══════════════════════════════════════════════════════════════
router.get('/liked-components', requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
        const { data, error } = await supabaseAdmin
            .from('component_likes')
            .select('component_id, components(*, profiles!components_author_id_fkey(id, username, display_name, avatar_url, reputation_score))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Flatten structure: extract the components from the join
        const items = (data || []).map(d => d.components).filter(c => c?.status === 'active');
        
        return res.json({ success: true, items });
    } catch (err) {
        console.error('[community] liked-components error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch liked components' });
    }
});

// ═══════════════════════════════════════════════════════════════
// Phase S11: MARKETPLACE BROWSE API ENDPOINTS (Public — No Auth)
// 5 new endpoints for the community marketplace browse experience
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// 16. GET /api/community/browse
// Public — paginated browse with filters, search, sorting, facets
// Query: ?type=component|template&category=&subcategory=&sort=popular|newest|quality|most_used
//        &industry=&color=light|dark|mixed|adaptive&style=&page=1&limit=20&search=
// ───────────────────────────────────────────────────────────────
router.get('/browse', async (req, res) => {
    const {
        type = 'component',
        category,
        subcategory,
        sort = 'popular',
        industry,
        color,
        style,
        page = 1,
        limit = 20,
        search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Sort mapping
    const sortMap = {
        popular: { column: 'usage_count', ascending: false },
        newest: { column: 'created_at', ascending: false },
        quality: { column: 'quality_score', ascending: false },
        most_used: { column: 'usage_count', ascending: false },
    };
    const sortConfig = sortMap[sort] || sortMap.popular;

    try {
        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        let items = [];
        let total = 0;
        let facets = {};

        if (type === 'template') {
            // ── Templates ──
            let query = supabaseAdmin
                .from('templates')
                .select('*, profiles!templates_author_id_fkey(id, username, display_name, avatar_url, reputation_score)', { count: 'exact' })
                .eq('status', 'active');

            if (category) query = query.eq('category', category);
            if (subcategory) query = query.eq('subcategory', subcategory);
            if (industry) query = query.contains('suitable_for', [industry]);
            if (color) query = query.eq('color_mode_type', color);
            if (search) query = query.textSearch('search_vector', search, { type: 'websearch' });

            query = query
                .order('featured_priority', { ascending: true, nullsFirst: false })
                .order(sortConfig.column, { ascending: sortConfig.ascending })
                .range(offset, offset + limitNum - 1);

            const { data, count, error } = await query;
            if (error) throw error;

            // For each template, get a count of template_sections
            if (data && data.length > 0) {
                const templateIds = data.map(t => t.id);
                const { data: sectionCounts, error: scError } = await supabaseAdmin
                    .from('template_sections')
                    .select('template_id')
                    .in('template_id', templateIds);

                if (!scError && sectionCounts) {
                    const countMap = {};
                    sectionCounts.forEach(s => {
                        countMap[s.template_id] = (countMap[s.template_id] || 0) + 1;
                    });
                    data.forEach(t => {
                        t.section_count = countMap[t.id] || 0;
                    });
                }
            }

            items = data || [];
            total = count || 0;

            // Facets for templates (distinct categories with counts)
            const { data: facetData } = await supabaseAdmin
                .from('templates')
                .select('category')
                .eq('status', 'active');

            if (facetData) {
                const catCounts = {};
                facetData.forEach(r => {
                    if (r.category) {
                        catCounts[r.category] = (catCounts[r.category] || 0) + 1;
                    }
                });
                facets = { categories: Object.entries(catCounts).map(([name, count]) => ({ name, slug: name, count })) };
            }
        } else {
            // ── Components (default) ──
            let query = supabaseAdmin
                .from('components')
                .select('*, profiles!components_author_id_fkey(id, username, display_name, avatar_url, reputation_score)', { count: 'exact' })
                .eq('status', 'active');

            if (category) query = query.eq('category', category);
            if (subcategory) query = query.eq('subcategory', subcategory);
            if (industry) query = query.contains('industry_tags', [industry]);
            if (color) query = query.eq('color_mode', color);
            if (style) query = query.eq('style', style);
            if (search) query = query.textSearch('search_vector', search, { type: 'websearch' });
            query = query
                .order('featured_priority', { ascending: true, nullsFirst: false })
                .order(sortConfig.column, { ascending: sortConfig.ascending })
                .range(offset, offset + limitNum - 1);

            const { data, count, error } = await query;
            if (error) throw error;

            items = data || [];
            total = count || 0;

            // Facets for components (distinct categories with counts)
            const { data: facetData } = await supabaseAdmin
                .from('components')
                .select('category')
                .eq('status', 'active');

            if (facetData) {
                const catCounts = {};
                facetData.forEach(r => {
                    if (r.category) {
                        catCounts[r.category] = (catCounts[r.category] || 0) + 1;
                    }
                });
                facets = { categories: Object.entries(catCounts).map(([name, count]) => ({ name, slug: name, count })) };
            }
        }

        return res.json({
            success: true,
            items,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            facets,
        });
    } catch (err) {
        console.error('[community-browse] browse error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch marketplace items' });
    }
});

// ───────────────────────────────────────────────────────────────
// 17. GET /api/community/browse/trending
// Public — top 5 components + templates by usage_count
// ───────────────────────────────────────────────────────────────
router.get('/browse/trending', async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        // Top 5 components by usage
        const { data: components, error: compError } = await supabaseAdmin
            .from('components')
            .select('*, profiles!components_author_id_fkey(id, username, display_name, avatar_url, reputation_score)')
            .eq('status', 'active')
            .order('featured_priority', { ascending: true, nullsFirst: false })
            .order('usage_count', { ascending: false })
            .limit(5);

        if (compError) throw compError;

        // Top 5 templates by usage
        const { data: templates, error: tmplError } = await supabaseAdmin
            .from('templates')
            .select('*, profiles!templates_author_id_fkey(id, username, display_name, avatar_url, reputation_score)')
            .eq('status', 'active')
            .order('featured_priority', { ascending: true, nullsFirst: false })
            .order('usage_count', { ascending: false })
            .limit(5);

        if (tmplError) throw tmplError;

        return res.json({
            success: true,
            components: components || [],
            templates: templates || [],
        });
    } catch (err) {
        console.error('[community-browse] trending error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch trending items' });
    }
});

// ───────────────────────────────────────────────────────────────
// 18. GET /api/community/components/:id  (detail view)
// Public — single component with author, ratings, related templates
// NOTE: This does NOT conflict with the existing /components/:id/ratings
//       endpoint (registered at line 513) because Express matches the
//       more-specific /components/:id/ratings path first.
// ───────────────────────────────────────────────────────────────
router.get('/components/:id', optionalAuth, async (req, res) => {
    const componentId = req.params.id;

    try {
        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        // Fetch component with author join
        const { data: component, error: compError } = await supabaseAdmin
            .from('components')
            .select('*, profiles!components_author_id_fkey(id, username, display_name, avatar_url, reputation_score)')
            .eq('id', componentId)
            .eq('status', 'active')
            .single();

        if (compError || !component) {
            return res.status(404).json({ success: false, error: 'Component not found' });
        }

        // Extract author from the joined profile
        const author = component.profiles || null;
        delete component.profiles;

        // Rating stats from component_ratings
        const { data: ratingsData, error: ratingsError } = await supabaseAdmin
            .from('component_ratings')
            .select('rating')
            .eq('component_id', componentId);

        let ratings = { average: 0, count: 0 };
        if (!ratingsError && ratingsData && ratingsData.length > 0) {
            const sum = ratingsData.reduce((acc, r) => acc + r.rating, 0);
            ratings = {
                average: parseFloat((sum / ratingsData.length).toFixed(1)),
                count: ratingsData.length,
            };
        }

        // Related templates: find templates that use this component
        const { data: relatedSections, error: relError } = await supabaseAdmin
            .from('template_sections')
            .select('template_id, templates!template_sections_template_id_fkey(id, name, description, thumbnail_url, rating_avg, usage_count, status)')
            .eq('component_id', componentId);

        let relatedTemplates = [];
        if (!relError && relatedSections) {
            // Filter to active templates and deduplicate
            const seen = new Set();
            relatedSections.forEach(s => {
                const tmpl = s.templates;
                if (tmpl && tmpl.status === 'active' && !seen.has(tmpl.id)) {
                    seen.add(tmpl.id);
                    relatedTemplates.push(tmpl);
                }
            });
        }

        // Check if current user likes this component
        let isLiked = false;
        if (req.user) {
            const { data: like } = await supabaseAdmin
                .from('component_likes')
                .select('id')
                .eq('user_id', req.user.id)
                .eq('component_id', componentId)
                .maybeSingle();
            isLiked = !!like;
        }

        return res.json({
            success: true,
            component,
            author,
            ratings,
            relatedTemplates,
            isLiked,
        });
    } catch (err) {
        console.error('[community-browse] component detail error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch component details' });
    }
});

// ───────────────────────────────────────────────────────────────
// 19. GET /api/community/templates/:id  (detail view)
// Public — single template with author, sections, ratings
// ───────────────────────────────────────────────────────────────
router.get('/templates/:id', async (req, res) => {
    const templateId = req.params.id;

    try {
        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        // Fetch template with author join
        const { data: template, error: tmplError } = await supabaseAdmin
            .from('templates')
            .select('*, profiles!templates_author_id_fkey(id, username, display_name, avatar_url, reputation_score)')
            .eq('id', templateId)
            .eq('status', 'active')
            .single();

        if (tmplError || !template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        // Extract author from the joined profile
        const author = template.profiles || null;
        delete template.profiles;

        // Fetch sections with component details, ordered by section_order
        const { data: sections, error: secError } = await supabaseAdmin
            .from('template_sections')
            .select('*, components!template_sections_component_id_fkey(id, name, display_name, thumbnail_url, category, quality_score)')
            .eq('template_id', templateId)
            .order('section_order', { ascending: true });

        if (secError) throw secError;

        // Ratings from template's own fields
        const ratings = {
            average: template.rating_avg || 0,
            count: template.rating_count || 0,
        };

        return res.json({
            success: true,
            template,
            author,
            sections: sections || [],
            ratings,
        });
    } catch (err) {
        console.error('[community-browse] template detail error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch template details' });
    }
});

// ───────────────────────────────────────────────────────────────
// 20. GET /api/community/categories
// Public — distinct categories with counts and subcategories
// ───────────────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        // Fetch all active components' category + subcategory
        const { data: rows, error } = await supabaseAdmin
            .from('components')
            .select('category, subcategory')
            .eq('status', 'active');

        if (error) throw error;

        // Aggregate: group by category, collect subcategories and counts
        const categoryMap = {};
        (rows || []).forEach(r => {
            if (!r.category) return;
            if (!categoryMap[r.category]) {
                categoryMap[r.category] = { count: 0, subcategories: new Set() };
            }
            categoryMap[r.category].count += 1;
            if (r.subcategory) {
                categoryMap[r.category].subcategories.add(r.subcategory);
            }
        });

        const categories = Object.entries(categoryMap).map(([name, data]) => ({
            slug: name,
            name,
            count: data.count,
            subcategories: Array.from(data.subcategories).sort(),
        }));

        // Sort by count descending
        categories.sort((a, b) => b.count - a.count);

        return res.json({
            success: true,
            categories,
        });
    } catch (err) {
        console.error('[community-browse] categories error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});

export default router;
