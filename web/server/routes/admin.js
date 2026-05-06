/**
 * Admin API routes for VolturianoBuilder.
 * 
 * All routes require authentication + admin_role = true on the profile.
 * The admin_role is verified server-side on every request by querying the profiles table.
 */
import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBuilderAdmin } from '../lib/security/admin-access.js';
import { logAuditEvent } from '../lib/audit/audit-logger.js';

const router = Router();

// ═══ Middleware: Verify admin_role ═══
// Allowed fields that admins can update on components
const ALLOWED_FIELDS = new Set([
    'description',
    'visual_description',
    'mood_tone',
    'design_personality',
    'color_mode',
    'suitable_for',
    'not_suitable_for',
    'quality_score',
    'preview_image_url',
    'preview_video_url',
    'thumbnail_url',
    'is_premium',
    'usage_count',
    'rating_avg',
    'rating_count',
    'status',
    'has_animation',
    'category',
    'subcategory',
    'tags',
    'industry_tags',
]);

function submissionStatusForComponentStatus(status) {
    if (status === 'active') return 'approved';
    if (status === 'pending_review' || status === 'pending') return 'pending_review';
    if (status === 'flagged') return 'flagged';
    if (status === 'rejected') return 'rejected';
    if (status === 'deprecated') return 'deprecated';
    if (status === 'archived') return 'archived';
    return null;
}

async function syncSubmissionStatusFromComponent(req, component, status, reason = null) {
    const submissionId = component?.submission_id;
    const nextStatus = submissionStatusForComponentStatus(status);
    if (!submissionId || !nextStatus) return;

    const updates = {
        status: nextStatus,
        reviewed_by: req.user?.id || req.userId || null,
        reviewed_at: new Date().toISOString(),
        review_reason: reason,
        updated_at: new Date().toISOString()
    };

    if (nextStatus === 'rejected') {
        updates.rejection_reason = reason || 'Rejected during admin review.';
    }

    const { error } = await supabaseAdmin
        .from('community_submissions')
        .update(updates)
        .eq('id', submissionId);

    if (error) {
        console.warn('[Admin] Failed to sync submission review status:', error.message);
    }
}

function submissionStatusForDecision(decision) {
    if (decision === 'approve') return 'approved';
    if (decision === 'restore') return 'pending_review';
    if (decision === 'archive') return 'archived';
    if (decision === 'flag') return 'flagged';
    if (decision === 'reject') return 'rejected';
    return null;
}

function componentStatusForDecision(decision) {
    if (decision === 'approve') return 'active';
    if (decision === 'restore') return 'pending_review';
    if (decision === 'archive') return 'archived';
    if (decision === 'flag') return 'flagged';
    if (decision === 'reject') return 'rejected';
    return null;
}

function buildStatementOfReasons({ action, targetStatus, reason, basis = 'Terms of Service and Acceptable Use Policy' }) {
    return {
        action,
        target_status: targetStatus,
        basis,
        reason: reason || 'Moderation action taken by Volturiano admin review.',
        generated_at: new Date().toISOString()
    };
}

function getTemplateIdFromSubmission(submission) {
    const metadata = submission?.moderation_metadata || {};
    if (metadata.template_id) return metadata.template_id;

    const rawCode = submission?.code;
    if (!rawCode || typeof rawCode !== 'string') return null;
    try {
        const parsed = JSON.parse(rawCode);
        return parsed.template_id || parsed.templateId || null;
    } catch {
        return null;
    }
}

async function fetchByIds(table, ids, select = '*') {
    const uniqueIds = [...new Set((ids || []).filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
        .from(table)
        .select(select)
        .in('id', uniqueIds);

    if (error) throw error;
    return data || [];
}

function mapById(rows) {
    return Object.fromEntries((rows || []).map(row => [row.id, row]));
}

function groupBy(rows, key) {
    return (rows || []).reduce((acc, row) => {
        const value = row?.[key];
        if (!value) return acc;
        if (!acc[value]) acc[value] = [];
        acc[value].push(row);
        return acc;
    }, {});
}

async function awardApprovalReputation(userId, qualityScore, entityType = 'component') {
    if (!userId) return;
    try {
        const points = entityType === 'template'
            ? 15
            : (Number(qualityScore || 0) >= 8 ? 15 : 5);
        await supabaseAdmin.rpc('increment_reputation', {
            p_user_id: userId,
            p_points: points,
        });
    } catch (repErr) {
        console.warn('[Admin] Approval reputation update failed:', repErr.message);
    }
}

// ═══ GET /api/admin/components — Fetch all components for admin panel ═══
router.get('/components', requireAuth, requireBuilderAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('components')
            .select('id, component_id, name, display_name, category, subcategory, component_type, description, visual_description, mood_tone, design_personality, color_mode, suitable_for, not_suitable_for, quality_score, preview_image_url, preview_video_url, thumbnail_url, is_premium, usage_count, rating_avg, rating_count, status, has_animation, tags, industry_tags, bundle_code, submission_id, created_at, updated_at')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({ success: true, components: data || [] });
    } catch (err) {
        console.error('[Admin] Fetch components failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══ GET /api/admin/review-queue — Pending submissions, reports, and takedowns ═══
router.get('/review-queue', requireAuth, requireBuilderAdmin, async (req, res) => {
    try {
        const { data: submissionsRaw, error: submissionsError } = await supabaseAdmin
            .from('community_submissions')
            .select('id, user_id, submission_type, name, description, category_hint, code, css_code, cleaned_code, quality_score, status, rejection_reason, improvement_suggestions, thumbnail_url, preview_video_url, thumbnail_base64, created_at, updated_at, component_id, ip_attestation_accepted_at, license_grant_accepted_at, attestation_version, license_type, reviewed_by, reviewed_at, review_reason, moderation_metadata')
            .in('status', ['pending_review', 'flagged'])
            .order('updated_at', { ascending: false })
            .limit(100);

        if (submissionsError) throw submissionsError;

        const submissions = submissionsRaw || [];
        const componentIds = submissions.map(s => s.component_id).filter(Boolean);
        const templateIds = submissions.map(getTemplateIdFromSubmission).filter(Boolean);
        const authorIds = submissions.map(s => s.user_id).filter(Boolean);

        const [components, templates, authors] = await Promise.all([
            fetchByIds('components', componentIds, 'id, component_id, name, display_name, status, category, thumbnail_url, preview_image_url, preview_video_url, quality_score, submission_id, created_at, updated_at'),
            fetchByIds('templates', templateIds, 'id, template_id, name, description, status, thumbnail_url, preview_image_url, quality_score, source_mode, created_at, updated_at'),
            fetchByIds('profiles', authorIds, 'id, username, display_name, avatar_url, reputation_score')
        ]);

        const componentMap = mapById(components);
        const templateMap = mapById(templates);
        const authorMap = mapById(authors);

        const { data: reportsRaw, error: reportsError } = await supabaseAdmin
            .from('component_reports')
            .select('*')
            .in('status', ['open', 'triaged'])
            .order('created_at', { ascending: false })
            .limit(100);

        if (reportsError) throw reportsError;

        const reports = reportsRaw || [];
        const reportComponentIds = reports.map(r => r.component_id).filter(Boolean);
        const reportUserIds = reports.map(r => r.reported_by).filter(Boolean);
        const [reportComponents, reportUsers] = await Promise.all([
            fetchByIds('components', reportComponentIds, 'id, component_id, name, display_name, status, thumbnail_url, preview_image_url, submission_id'),
            fetchByIds('profiles', reportUserIds, 'id, username, display_name, avatar_url')
        ]);
        const reportComponentMap = mapById(reportComponents);
        const reportUserMap = mapById(reportUsers);
        const reportsByComponent = groupBy(reports, 'component_id');

        const { data: takedownsRaw, error: takedownsError } = await supabaseAdmin
            .from('copyright_takedown_requests')
            .select('*')
            .in('status', ['open', 'under_review'])
            .order('created_at', { ascending: false })
            .limit(100);

        if (takedownsError) throw takedownsError;

        const takedowns = takedownsRaw || [];
        const takedownComponentIds = takedowns.map(t => t.component_id).filter(Boolean);
        const takedownSubmissionIds = takedowns.map(t => t.submission_id).filter(Boolean);
        const [takedownComponents, takedownSubmissions] = await Promise.all([
            fetchByIds('components', takedownComponentIds, 'id, component_id, name, display_name, status, thumbnail_url, preview_image_url, submission_id'),
            fetchByIds('community_submissions', takedownSubmissionIds, 'id, name, submission_type, status, user_id, component_id')
        ]);
        const takedownComponentMap = mapById(takedownComponents);
        const takedownSubmissionMap = mapById(takedownSubmissions);

        const enrichedSubmissions = submissions.map(submission => {
            const templateId = getTemplateIdFromSubmission(submission);
            const component = componentMap[submission.component_id] || null;
            return {
                ...submission,
                author: authorMap[submission.user_id] || null,
                component,
                template: templateId ? (templateMap[templateId] || null) : null,
                reports: component?.id ? (reportsByComponent[component.id] || []) : [],
                takedowns: takedowns.filter(t => t.submission_id === submission.id || (component?.id && t.component_id === component.id))
            };
        });

        const enrichedReports = reports.map(report => ({
            ...report,
            component: reportComponentMap[report.component_id] || null,
            reporter: reportUserMap[report.reported_by] || null
        }));

        const enrichedTakedowns = takedowns.map(takedown => ({
            ...takedown,
            component: takedownComponentMap[takedown.component_id] || null,
            submission: takedownSubmissionMap[takedown.submission_id] || null
        }));

        return res.json({
            success: true,
            submissions: enrichedSubmissions,
            reports: enrichedReports,
            takedowns: enrichedTakedowns
        });
    } catch (err) {
        console.error('[Admin] Review queue failed:', err.message || err);
        return res.status(500).json({ success: false, error: err.message || 'Failed to load review queue' });
    }
});

// ═══ POST /api/admin/update-component — Update a single component ═══
router.post('/update-component', requireAuth, requireBuilderAdmin, async (req, res) => {
    const { componentId, updates } = req.body;

    if (!componentId || !updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'componentId and updates object required' });
    }

    // Filter to only allowed fields
    const safeUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_FIELDS.has(key)) {
            safeUpdates[key] = value;
        }
    }

    if (Object.keys(safeUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    console.log(`[Admin] Updating component ${componentId}:`, JSON.stringify(safeUpdates, null, 2));

    try {
        const { data, error } = await supabaseAdmin
            .from('components')
            .update(safeUpdates)
            .eq('id', componentId)
            .select()
            .single();

        if (error) {
            console.error('[Admin] Supabase update error:', error.message, '| Code:', error.code, '| Details:', error.details, '| Hint:', error.hint);
            throw error;
        }

        if (safeUpdates.status) {
            await syncSubmissionStatusFromComponent(req, data, safeUpdates.status);
        }

        void logAuditEvent(req, {
            action: safeUpdates.status ? 'admin_component_status_changed' : 'admin_component_updated',
            entityType: 'component',
            entityId: componentId,
            metadata: {
                updateKeys: Object.keys(safeUpdates),
                status: safeUpdates.status || data?.status || null,
                componentId: data?.component_id || null
            }
        });
        res.json({ success: true, component: data });
    } catch (err) {
        console.error('[Admin] Update component failed:', err.message || err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══ POST /api/admin/review-submission — Approve/reject/flag analyzed community submissions ═══
router.post('/review-submission', requireAuth, requireBuilderAdmin, async (req, res) => {
    const { submissionId, decision, reason = null } = req.body || {};

    const targetStatus = componentStatusForDecision(decision);
    const submissionStatus = submissionStatusForDecision(decision);

    if (!submissionId || !targetStatus || !submissionStatus) {
        return res.status(400).json({ success: false, error: 'submissionId and decision are required' });
    }

    try {
        const { data: submission, error: subError } = await supabaseAdmin
            .from('community_submissions')
            .select('id, user_id, submission_type, component_id, status, quality_score, moderation_metadata, code')
            .eq('id', submissionId)
            .maybeSingle();

        if (subError) throw subError;
        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        let reviewedEntity = null;
        let entityType = submission.submission_type === 'template' ? 'template' : 'component';

        if (submission.component_id) {
            const { data: component, error: compError } = await supabaseAdmin
                .from('components')
                .update({ status: targetStatus, updated_at: new Date().toISOString() })
                .eq('id', submission.component_id)
                .select()
                .single();

            if (compError) throw compError;
            reviewedEntity = component;
            entityType = 'component';
        } else {
            const templateId = getTemplateIdFromSubmission(submission);
            if (!templateId) {
                return res.status(400).json({ success: false, error: 'Submission has no analyzed component or template to review' });
            }

            const { data: template, error: templateError } = await supabaseAdmin
                .from('templates')
                .update({ status: targetStatus, updated_at: new Date().toISOString() })
                .eq('id', templateId)
                .select()
                .single();

            if (templateError) throw templateError;
            reviewedEntity = template;
            entityType = 'template';
        }

        const submissionUpdates = {
            status: submissionStatus,
            reviewed_by: req.user?.id || req.userId || null,
            reviewed_at: new Date().toISOString(),
            review_reason: reason,
            updated_at: new Date().toISOString(),
            moderation_metadata: {
                ...(submission.moderation_metadata || {}),
                statement_of_reasons: buildStatementOfReasons({
                    action: decision,
                    targetStatus,
                    reason
                })
            }
        };
        if (decision === 'reject') {
            submissionUpdates.rejection_reason = reason || 'Rejected during admin review.';
        }

        const { error: submissionUpdateError } = await supabaseAdmin
            .from('community_submissions')
            .update(submissionUpdates)
            .eq('id', submissionId);

        if (submissionUpdateError) throw submissionUpdateError;

        if (decision === 'approve') {
            await awardApprovalReputation(submission.user_id, submission.quality_score, entityType);
        }

        void logAuditEvent(req, {
            action: `admin_submission_${decision}`,
            entityType: 'community_submission',
            entityId: submissionId,
            metadata: {
                reviewedEntityId: reviewedEntity?.id || null,
                reviewedEntityType: entityType,
                publicId: reviewedEntity?.component_id || reviewedEntity?.template_id || null,
                decision,
                targetStatus,
                reason,
                statementOfReasons: submissionUpdates.moderation_metadata.statement_of_reasons
            }
        });

        return res.json({ success: true, submissionId, decision, status: submissionStatus, entity: reviewedEntity });
    } catch (err) {
        console.error('[Admin] Review submission failed:', err.message || err);
        return res.status(500).json({ success: false, error: err.message || 'Failed to review submission' });
    }
});

// ═══ POST /api/admin/review-report — Triage/resolve component reports ═══
router.post('/review-report', requireAuth, requireBuilderAdmin, async (req, res) => {
    const { reportId, action, reason = null } = req.body || {};
    const statusByAction = {
        triage: 'triaged',
        resolve: 'resolved',
        reject: 'rejected',
        archive: 'resolved',
        restore: 'resolved',
        flag: 'triaged'
    };
    const nextStatus = statusByAction[action];

    if (!reportId || !nextStatus) {
        return res.status(400).json({ success: false, error: 'reportId and action are required' });
    }

    try {
        const { data: report, error: reportError } = await supabaseAdmin
            .from('component_reports')
            .select('*')
            .eq('id', reportId)
            .maybeSingle();

        if (reportError) throw reportError;
        if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

        const componentStatusByAction = {
            archive: 'archived',
            restore: 'active',
            flag: 'flagged'
        };
        const componentStatus = componentStatusByAction[action];
        if (componentStatus && report.component_id) {
            const { error: componentError } = await supabaseAdmin
                .from('components')
                .update({ status: componentStatus, updated_at: new Date().toISOString() })
                .eq('id', report.component_id);
            if (componentError) throw componentError;
        }

        const { data: updatedReport, error: updateError } = await supabaseAdmin
            .from('component_reports')
            .update({
                status: nextStatus,
                reviewed_by: req.user?.id || req.userId || null,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: {
                    ...(report.metadata || {}),
                    admin_action: action,
                    admin_reason: reason,
                    statement_of_reasons: buildStatementOfReasons({
                        action,
                        targetStatus: componentStatus || nextStatus,
                        reason
                    })
                }
            })
            .eq('id', reportId)
            .select()
            .single();

        if (updateError) throw updateError;

        void logAuditEvent(req, {
            action: `admin_report_${action}`,
            entityType: 'component_report',
            entityId: reportId,
            metadata: {
                componentId: report.component_id,
                nextStatus,
                componentStatus: componentStatus || null,
                reason,
                statementOfReasons: buildStatementOfReasons({
                    action,
                    targetStatus: componentStatus || nextStatus,
                    reason
                })
            }
        });

        return res.json({ success: true, report: updatedReport });
    } catch (err) {
        console.error('[Admin] Review report failed:', err.message || err);
        return res.status(500).json({ success: false, error: err.message || 'Failed to review report' });
    }
});

// ═══ POST /api/admin/review-takedown — Handle copyright/IP notices ═══
router.post('/review-takedown', requireAuth, requireBuilderAdmin, async (req, res) => {
    const { takedownId, action, reason = null } = req.body || {};
    const statusByAction = {
        under_review: 'under_review',
        accept: 'accepted',
        reject: 'rejected',
        withdraw: 'withdrawn',
        archive: 'accepted',
        restore: 'rejected',
        flag: 'under_review'
    };
    const nextStatus = statusByAction[action];

    if (!takedownId || !nextStatus) {
        return res.status(400).json({ success: false, error: 'takedownId and action are required' });
    }

    try {
        const { data: takedown, error: takedownError } = await supabaseAdmin
            .from('copyright_takedown_requests')
            .select('*')
            .eq('id', takedownId)
            .maybeSingle();

        if (takedownError) throw takedownError;
        if (!takedown) return res.status(404).json({ success: false, error: 'Takedown request not found' });

        const componentStatusByAction = {
            accept: 'archived',
            archive: 'archived',
            restore: 'active',
            flag: 'flagged'
        };
        const componentStatus = componentStatusByAction[action];
        if (componentStatus && takedown.component_id) {
            const { error: componentError } = await supabaseAdmin
                .from('components')
                .update({ status: componentStatus, updated_at: new Date().toISOString() })
                .eq('id', takedown.component_id);
            if (componentError) throw componentError;
        }

        const { data: updatedTakedown, error: updateError } = await supabaseAdmin
            .from('copyright_takedown_requests')
            .update({
                status: nextStatus,
                handled_by: req.user?.id || req.userId || null,
                handled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: {
                    ...(takedown.metadata || {}),
                    admin_action: action,
                    admin_reason: reason,
                    statement_of_reasons: buildStatementOfReasons({
                        action,
                        targetStatus: componentStatus || nextStatus,
                        reason,
                        basis: 'Copyright/IP notice, Terms of Service, and Acceptable Use Policy'
                    })
                }
            })
            .eq('id', takedownId)
            .select()
            .single();

        if (updateError) throw updateError;

        void logAuditEvent(req, {
            action: `admin_takedown_${action}`,
            entityType: 'copyright_takedown_request',
            entityId: takedownId,
            metadata: {
                componentId: takedown.component_id,
                submissionId: takedown.submission_id,
                nextStatus,
                componentStatus: componentStatus || null,
                reason,
                statementOfReasons: buildStatementOfReasons({
                    action,
                    targetStatus: componentStatus || nextStatus,
                    reason,
                    basis: 'Copyright/IP notice, Terms of Service, and Acceptable Use Policy'
                })
            }
        });

        return res.json({ success: true, takedown: updatedTakedown });
    } catch (err) {
        console.error('[Admin] Review takedown failed:', err.message || err);
        return res.status(500).json({ success: false, error: err.message || 'Failed to review takedown' });
    }
});

// ═══ POST /api/admin/upload-asset — Upload image/video to Supabase Storage ═══
router.post('/upload-asset', requireAuth, requireBuilderAdmin, async (req, res) => {
    const { fileName, fileData, contentType, componentId, bucket = 'builder-assets' } = req.body;

    if (!fileName || !fileData || !contentType) {
        return res.status(400).json({ error: 'fileName, fileData (base64), and contentType required' });
    }

    try {
        // Convert base64 to buffer
        const buffer = Buffer.from(fileData, 'base64');
        const storagePath = `admin-uploads/${componentId || 'general'}/${Date.now()}-${fileName}`;

        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(storagePath, buffer, {
                contentType,
                upsert: false,
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(storagePath);

        void logAuditEvent(req, {
            action: 'admin_asset_uploaded',
            entityType: componentId ? 'component' : 'asset',
            entityId: componentId || storagePath,
            metadata: {
                bucket,
                storagePath,
                contentType
            }
        });
        res.json({ success: true, url: urlData.publicUrl, path: storagePath });
    } catch (err) {
        console.error('[Admin] Upload asset failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══ GET /api/admin/templates — Fetch all templates for admin panel ═══
router.get('/templates', requireAuth, requireBuilderAdmin, async (req, res) => {
    try {
        // Try with agent_prompt column first
        let queryResult = await supabaseAdmin
            .from('templates')
            .select('id, template_id, name, description, thumbnail_url, agent_prompt, status, usage_count, quality_score, priority, visit_url, created_at, updated_at')
            .order('priority', { ascending: true, nullsFirst: false });

        // Fallback: if agent_prompt column doesn't exist yet
        if (queryResult.error && queryResult.error.code === '42703') {
            console.warn('[Admin] agent_prompt column not found, querying without it.');
            queryResult = await supabaseAdmin
                .from('templates')
                .select('id, template_id, name, description, thumbnail_url, status, usage_count, quality_score, created_at, updated_at')
                .order('name', { ascending: true });
        }

        if (queryResult.error) throw queryResult.error;

        // Ensure agent_prompt field exists on each row (empty string fallback)
        const templates = (queryResult.data || []).map(t => ({
            ...t,
            agent_prompt: t.agent_prompt || '',
            priority: t.priority ?? null,
            visit_url: t.visit_url || ''
        }));

        res.json({ success: true, templates });
    } catch (err) {
        console.error('[Admin] Fetch templates failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══ POST /api/admin/update-template — Update a single template ═══
const ALLOWED_TEMPLATE_FIELDS = new Set([
    'agent_prompt',
    'name',
    'description',
    'status',
    'quality_score',
    'thumbnail_url',
    'priority',
    'visit_url',
]);

router.post('/update-template', requireAuth, requireBuilderAdmin, async (req, res) => {
    const { templateId, updates } = req.body;

    if (!templateId || !updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'templateId and updates object required' });
    }

    // Filter to only allowed fields
    const safeUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_TEMPLATE_FIELDS.has(key)) {
            safeUpdates[key] = value;
        }
    }

    if (Object.keys(safeUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    console.log(`[Admin] Updating template ${templateId}:`, JSON.stringify(safeUpdates, null, 2));

    try {
        const { data, error } = await supabaseAdmin
            .from('templates')
            .update(safeUpdates)
            .eq('id', templateId)
            .select()
            .single();

        if (error) throw error;
        void logAuditEvent(req, {
            action: safeUpdates.status ? 'admin_template_status_changed' : 'admin_template_updated',
            entityType: 'template',
            entityId: templateId,
            metadata: {
                updateKeys: Object.keys(safeUpdates),
                status: safeUpdates.status || data?.status || null,
                templateId: data?.template_id || null
            }
        });
        res.json({ success: true, template: data });
    } catch (err) {
        console.error('[Admin] Update template failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══ POST /api/admin/create-template — Create a new template ═══
router.post('/create-template', requireAuth, requireBuilderAdmin, async (req, res) => {
    const { template_id, name, description, agent_prompt, thumbnail_url, priority, visit_url } = req.body;

    if (!template_id || !name) {
        return res.status(400).json({ error: 'template_id and name are required' });
    }

    try {
        const newTemplate = {
            template_id,
            name,
            description: description || '',
            agent_prompt: agent_prompt || '',
            thumbnail_url: thumbnail_url || null,
            priority: priority ?? null,
            visit_url: visit_url || '',
            status: 'active',
            usage_count: 0,
            quality_score: 5,
            template_code: { components: [] } // Standard empty template structure
        };

        console.log(`[Admin] Creating new template:`, JSON.stringify(newTemplate, null, 2));

        const { data, error } = await supabaseAdmin
            .from('templates')
            .insert([newTemplate])
            .select()
            .single();

        if (error) throw error;
        void logAuditEvent(req, {
            action: 'admin_template_created',
            entityType: 'template',
            entityId: data?.id || template_id,
            metadata: {
                templateId: data?.template_id || template_id,
                name
            }
        });
        res.json({ success: true, template: data });
    } catch (err) {
        console.error('[Admin] Create template failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══ GET /api/admin/feedback — Fetch platform feedback ═══
router.get('/feedback', requireAuth, requireBuilderAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('platform_feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, feedback: data || [] });
    } catch (err) {
        console.error('[Admin] Fetch feedback failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══ GET /api/admin/issues — Fetch platform issues ═══
router.get('/issues', requireAuth, requireBuilderAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('platform_issues')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, issues: data || [] });
    } catch (err) {
        console.error('[Admin] Fetch issues failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
