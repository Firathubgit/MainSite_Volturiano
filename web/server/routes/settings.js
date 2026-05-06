import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { logger } from '../lib/logger.js';
import { logAuditEvent, writeAuditLog } from '../lib/audit/audit-logger.js';
import { logControl, warnControl } from '../lib/security/control-log.js';

const router = express.Router();

const GDPR_EXPORT_VERSION = '2026-05-03.0005';
const GDPR_RETENTION_NOTE = 'Financial ledger rows are retained and anonymized where required for accounting, tax, refund, dispute, and abuse-prevention obligations.';
const ALLOWED_CONSENT_TYPES = new Set([
    'terms',
    'privacy',
    'cookies_analytics',
    'community_license',
    'ip_attestation',
    'processing_restriction'
]);

function profileDisplayFromUser(user) {
    const meta = user?.user_metadata || {};
    return (
        meta.display_name ||
        meta.full_name ||
        meta.name ||
        user?.email?.split('@')?.[0] ||
        'Builder User'
    );
}

function ensureDatabase(res) {
    if (supabaseAdmin) return true;
    logger.error('GdprControl', 'Database client missing for settings/GDPR action');
    res.status(500).json({ success: false, error: 'Database not configured' });
    return false;
}

/**
 * POST /api/settings/ensure-profile
 * Ensures OAuth/magic-link users have a profiles row before dashboard/profile UI renders.
 */
router.post('/ensure-profile', requireAuth, async (req, res) => {
    const userId = req.userId;

    try {
        if (!ensureDatabase(res)) return;

        logControl('GdprControl', 'Profile bootstrap check started', req);

        const { data: existing, error: lookupError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (lookupError) throw lookupError;

        if (existing) {
            const { data: updatedProfile, error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    last_active_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select('*')
                .single();

            if (updateError) throw updateError;

            logControl('GdprControl', 'Profile bootstrap check passed existing profile', req);
            return res.json({ success: true, profile: updatedProfile || existing, created: false });
        }

        const meta = req.user?.user_metadata || {};
        const now = new Date().toISOString();
        const insertPayload = {
            id: userId,
            display_name: profileDisplayFromUser(req.user),
            full_name: meta.full_name || meta.name || null,
            avatar_url: meta.avatar_url || meta.picture || null,
            created_at: now,
            updated_at: now,
            last_active_at: now,
            gdpr_consent_at: meta.gdpr_consent_at || null,
            terms_accepted_at: meta.terms_accepted_at || null,
            privacy_accepted_at: meta.privacy_accepted_at || null
        };

        const { data: createdProfile, error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert(insertPayload)
            .select('*')
            .single();

        if (insertError) throw insertError;

        void logAuditEvent(req, {
            action: 'profile_bootstrapped',
            entityType: 'profile',
            entityId: userId,
            metadata: { source: 'ensure-profile' }
        });

        logControl('GdprControl', 'Profile bootstrap created missing profile', req);
        return res.json({ success: true, profile: createdProfile, created: true });
    } catch (error) {
        warnControl('GdprControl', 'Profile bootstrap failed', req, {
            error: error?.message || String(error)
        });
        return res.status(500).json({
            success: false,
            error: 'Failed to initialize account profile'
        });
    }
});

async function createGdprRequest(req, { requestType, status = 'processing', notes = null, metadata = {} }) {
    if (!supabaseAdmin || !req?.userId) {
        warnControl('GdprControl', 'GDPR request log skipped: missing database or user', req, { requestType });
        return null;
    }

    try {
        logControl('GdprControl', 'GDPR request log insert started', req, { requestType, status });
        const { data, error } = await supabaseAdmin
            .from('gdpr_requests')
            .insert({
                user_id: req.userId,
                request_type: requestType,
                status,
                requested_via: 'dashboard',
                notes,
                metadata
            })
            .select('id')
            .single();

        if (error) throw error;
        logControl('GdprControl', 'GDPR request log insert passed', req, {
            requestType,
            gdprRequestId: data?.id
        });
        return data;
    } catch (error) {
        warnControl('GdprControl', 'GDPR request log insert failed but primary request continues', req, {
            requestType,
            error: error?.message || error
        });
        return null;
    }
}

async function finishGdprRequest(requestId, patch = {}) {
    if (!supabaseAdmin || !requestId) return;

    try {
        logger.info('GdprControl', 'GDPR request status update started', {
            gdprRequestId: requestId,
            status: patch.status || 'completed'
        });
        const { error } = await supabaseAdmin
            .from('gdpr_requests')
            .update({
                status: patch.status || 'completed',
                notes: patch.notes,
                metadata: patch.metadata,
                fulfilled_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (error) throw error;
        logger.info('GdprControl', 'GDPR request status update passed', {
            gdprRequestId: requestId,
            status: patch.status || 'completed'
        });
    } catch (error) {
        logger.warn('GdprControl', 'GDPR request status update failed but primary request continues', {
            gdprRequestId: requestId,
            error: error?.message || error
        });
    }
}

async function recordConsentEvent(req, { consentType, accepted, version, metadata = {} }) {
    if (!supabaseAdmin || !req?.userId) {
        warnControl('GdprControl', 'Consent event log skipped: missing database or user', req, { consentType });
        return null;
    }

    try {
        logControl('GdprControl', 'Consent event insert started', req, {
            consentType,
            accepted: Boolean(accepted),
            version
        });
        const { data, error } = await supabaseAdmin
            .from('consent_events')
            .insert({
                user_id: req.userId,
                consent_type: consentType,
                consent_version: version,
                accepted: Boolean(accepted),
                metadata
            })
            .select('id')
            .single();

        if (error) throw error;
        logControl('GdprControl', 'Consent event insert passed', req, {
            consentType,
            accepted: Boolean(accepted),
            consentEventId: data?.id
        });
        return data;
    } catch (error) {
        warnControl('GdprControl', 'Consent event insert failed but primary request continues', req, {
            consentType,
            error: error?.message || error
        });
        return null;
    }
}

async function selectEq(table, column, value) {
    const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq(column, value);

    if (error) {
        logger.warn('GdprControl', `Data export table read failed: ${table}`, {
            column,
            error: error.message
        });
        return { error: 'Failed to fetch' };
    }

    logger.info('GdprControl', `Data export table read passed: ${table}`, {
        column,
        rowCount: data?.length || 0
    });
    return data || [];
}

async function selectIn(table, column, values) {
    if (!values?.length) return [];

    const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .in(column, values);

    if (error) {
        logger.warn('GdprControl', `Data export table read failed: ${table}`, {
            column,
            inputCount: values.length,
            error: error.message
        });
        return { error: 'Failed to fetch' };
    }

    logger.info('GdprControl', `Data export table read passed: ${table}`, {
        column,
        inputCount: values.length,
        rowCount: data?.length || 0
    });
    return data || [];
}

function idsFrom(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => row?.id).filter(Boolean);
}

function mergeUniqueRows(...groups) {
    const map = new Map();
    for (const group of groups) {
        if (!Array.isArray(group)) continue;
        for (const row of group) {
            if (row?.id) map.set(row.id, row);
        }
    }
    return [...map.values()];
}

async function deleteEq(table, column, value) {
    const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
    if (error) logger.warn('GDPR', `Delete skipped for ${table}`, { error: error.message });
}

async function deleteIn(table, column, values) {
    if (!values?.length) return;
    const { error } = await supabaseAdmin.from(table).delete().in(column, values);
    if (error) logger.warn('GDPR', `Delete skipped for ${table}`, { error: error.message });
}

/**
 * PATCH /api/settings/preferred-mode
 * Updates the user's preferred builder mode (hybrid / premium).
 */
router.patch('/preferred-mode', requireAuth, async (req, res) => {
    const userId = req.userId;
    logger.info('Settings', 'PATCH /preferred-mode hit', { userId, mode: req.body?.preferred_mode });

    try {
        const { preferred_mode } = req.body;

        const VALID_MODES = ['free', 'hybrid', 'premium'];
        if (!preferred_mode || !VALID_MODES.includes(preferred_mode)) {
            logger.warn('Settings', 'Invalid mode received', { preferred_mode });
            return res.status(400).json({
                success: false,
                error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}`
            });
        }

        if (!ensureDatabase(res)) return;

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                preferred_mode,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            logger.error('Settings', 'Supabase update error', { error });
            return res.status(500).json({ success: false, error: error.message });
        }

        logger.info('Settings', 'preferred_mode updated successfully', { userId, mode: preferred_mode });
        return res.json({ success: true, preferred_mode });
    } catch (err) {
        logger.error('Settings', 'Unhandled error in preferred-mode', { error: err.message });
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * PATCH /api/settings/processing-restriction
 * Auditable GDPR restriction toggle used by the account settings UI.
 */
router.patch('/processing-restriction', requireAuth, async (req, res) => {
    const userId = req.userId;
    const processingRestricted = Boolean(req.body?.processing_restricted);

    try {
        if (!ensureDatabase(res)) return;

        const gdprRequest = await createGdprRequest(req, {
            requestType: processingRestricted ? 'restrict_processing' : 'withdraw_consent',
            status: 'processing',
            notes: processingRestricted
                ? 'User restricted AI/data processing from account settings.'
                : 'User removed account-level processing restriction from account settings.',
            metadata: {
                processing_restricted: processingRestricted,
                version: GDPR_EXPORT_VERSION
            }
        });

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                processing_restricted: processingRestricted,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            await finishGdprRequest(gdprRequest?.id, {
                status: 'rejected',
                notes: error.message,
                metadata: { processing_restricted: processingRestricted }
            });
            return res.status(500).json({ success: false, error: error.message });
        }

        await finishGdprRequest(gdprRequest?.id, {
            status: 'completed',
            metadata: { processing_restricted: processingRestricted }
        });

        void recordConsentEvent(req, {
            consentType: 'processing_restriction',
            accepted: processingRestricted,
            version: GDPR_EXPORT_VERSION,
            metadata: { source: 'account_settings' }
        });

        void logAuditEvent(req, {
            action: processingRestricted ? 'account_processing_restricted' : 'account_processing_unrestricted',
            entityType: 'profile',
            entityId: userId,
            metadata: { processing_restricted: processingRestricted }
        });

        return res.json({ success: true, processing_restricted: processingRestricted });
    } catch (err) {
        logger.error('GDPR', 'Processing restriction update failed', { userId, error: err.message });
        return res.status(500).json({ success: false, error: 'Failed to update processing restriction' });
    }
});

/**
 * POST /api/settings/consent
 * Records auditable consent evidence for auth, cookies, and community attestations.
 */
router.post('/consent', requireAuth, async (req, res) => {
    const userId = req.userId;
    const {
        consent_type,
        consent_version = GDPR_EXPORT_VERSION,
        accepted = true,
        metadata = {}
    } = req.body || {};

    if (!ALLOWED_CONSENT_TYPES.has(consent_type)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid consent type.'
        });
    }

    try {
        if (!ensureDatabase(res)) return;

        const event = await recordConsentEvent(req, {
            consentType: consent_type,
            accepted,
            version: String(consent_version || GDPR_EXPORT_VERSION).slice(0, 80),
            metadata: {
                ...(metadata && typeof metadata === 'object' ? metadata : {}),
                route: '/api/settings/consent'
            }
        });

        if (accepted && (consent_type === 'terms' || consent_type === 'privacy')) {
            const acceptedAt = new Date().toISOString();
            const profilePatch = {
                updated_at: acceptedAt
            };

            if (consent_type === 'terms') {
                profilePatch.terms_accepted_at = acceptedAt;
                profilePatch.terms_version = consent_version;
            }

            if (consent_type === 'privacy') {
                profilePatch.privacy_accepted_at = acceptedAt;
                profilePatch.privacy_version = consent_version;
                profilePatch.gdpr_consent_at = acceptedAt;
            }

            const { error } = await supabaseAdmin
                .from('profiles')
                .update(profilePatch)
                .eq('id', userId);

            if (error) throw error;
        }

        void logAuditEvent(req, {
            action: `consent_${accepted ? 'accepted' : 'withdrawn'}`,
            entityType: 'consent_event',
            entityId: event?.id || consent_type,
            metadata: {
                consent_type,
                consent_version,
                accepted
            }
        });

        return res.json({ success: true, consentEventId: event?.id || null });
    } catch (err) {
        logger.error('GDPR', 'Consent recording failed', { userId, consent_type, error: err.message });
        return res.status(500).json({ success: false, error: 'Failed to record consent.' });
    }
});

/**
 * GET /api/settings/export-data
 * Compiles personal data into a JSON file for download. (GDPR Right to Access)
 */
router.get('/export-data', requireAuth, async (req, res) => {
    const userId = req.userId;
    let gdprRequest = null;

    try {
        if (!ensureDatabase(res)) return;

        logger.info('GDPR', 'Data export requested', { userId });
        gdprRequest = await createGdprRequest(req, {
            requestType: 'export',
            status: 'processing',
            notes: 'Dashboard data export requested.',
            metadata: { version: GDPR_EXPORT_VERSION }
        });

        const exportData = {
            exported_at: new Date().toISOString(),
            export_version: GDPR_EXPORT_VERSION,
            data_controller: 'Volturiano',
            contact: 'contact@volturiano.com',
            user_id: userId,
            retention_note: GDPR_RETENTION_NOTE,
            data: {}
        };

        const { data: profileData, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        exportData.data.profiles = profileErr ? { error: 'Failed to fetch' } : [profileData];

        exportData.data.projects = await selectEq('projects', 'user_id', userId);
        exportData.data.published_sites = await selectEq('published_sites', 'user_id', userId);
        exportData.data.snapshots = await selectEq('snapshots', 'user_id', userId);
        exportData.data.credit_transactions = await selectEq('credit_transactions', 'user_id', userId);
        exportData.data.refund_requests = await selectEq('refund_requests', 'user_id', userId);
        exportData.data.community_submissions = await selectEq('community_submissions', 'user_id', userId);
        exportData.data.component_likes = await selectEq('component_likes', 'user_id', userId);
        exportData.data.component_ratings = await selectEq('component_ratings', 'user_id', userId);
        exportData.data.platform_feedback = await selectEq('platform_feedback', 'user_id', userId);
        exportData.data.platform_issues = await selectEq('platform_issues', 'user_id', userId);
        exportData.data.authored_components = await selectEq('components', 'author_id', userId);
        exportData.data.authored_templates = await selectEq('templates', 'author_id', userId);
        exportData.data.agent_sessions = await selectEq('agent_sessions', 'user_id', userId);
        exportData.data.agent_turns = await selectEq('agent_turns', 'user_id', userId);
        exportData.data.agent_memory = await selectEq('agent_memory', 'user_id', userId);
        exportData.data.consent_events = await selectEq('consent_events', 'user_id', userId);
        exportData.data.gdpr_requests = await selectEq('gdpr_requests', 'user_id', userId);

        const sessionIds = idsFrom(exportData.data.agent_sessions);
        const turnIds = idsFrom(exportData.data.agent_turns);
        const messagesBySession = await selectIn('agent_messages', 'session_id', sessionIds);
        const messagesByTurn = await selectIn('agent_messages', 'turn_id', turnIds);
        const eventsBySession = await selectIn('agent_tool_events', 'session_id', sessionIds);
        const eventsByTurn = await selectIn('agent_tool_events', 'turn_id', turnIds);

        exportData.data.agent_messages = mergeUniqueRows(messagesBySession, messagesByTurn);
        exportData.data.agent_tool_events = mergeUniqueRows(eventsBySession, eventsByTurn);

        await supabaseAdmin
            .from('profiles')
            .update({ last_data_export_at: new Date().toISOString() })
            .eq('id', userId);

        await finishGdprRequest(gdprRequest?.id, {
            status: 'completed',
            metadata: {
                version: GDPR_EXPORT_VERSION,
                tables: Object.keys(exportData.data)
            }
        });

        void logAuditEvent(req, {
            action: 'account_data_exported',
            entityType: 'profile',
            entityId: userId,
            metadata: {
                gdprRequestId: gdprRequest?.id || null,
                version: GDPR_EXPORT_VERSION,
                tables: Object.keys(exportData.data)
            }
        });

        res.setHeader('Content-Disposition', `attachment; filename="volturiano-data-${userId}.json"`);
        res.setHeader('Content-Type', 'application/json');
        return res.json(exportData);
    } catch (err) {
        logger.error('GDPR', 'Export fatal error', { userId, error: err.message });
        await finishGdprRequest(gdprRequest?.id, {
            status: 'rejected',
            notes: err.message,
            metadata: { version: GDPR_EXPORT_VERSION }
        });
        return res.status(500).json({ success: false, error: 'Failed to generate data export' });
    }
});

/**
 * DELETE /api/settings/delete-account
 */
router.delete('/delete-account', requireAuth, async (req, res) => {
    const userId = req.userId;
    let gdprRequest = null;

    try {
        if (!ensureDatabase(res)) return;

        logger.warn('GDPR', 'ACCOUNT DELETION INITIATED', { userId });
        gdprRequest = await createGdprRequest(req, {
            requestType: 'delete',
            status: 'processing',
            notes: 'Dashboard account deletion requested.',
            metadata: { version: GDPR_EXPORT_VERSION }
        });

        void logAuditEvent(req, {
            action: 'account_delete_requested',
            entityType: 'profile',
            entityId: userId,
            metadata: { gdprRequestId: gdprRequest?.id || null }
        });

        await supabaseAdmin
            .from('profiles')
            .update({ deletion_requested_at: new Date().toISOString() })
            .eq('id', userId);

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('stripe_customer_id, stripe_subscription_id')
            .eq('id', userId)
            .single();

        if (profile?.stripe_subscription_id) {
            try {
                const Stripe = (await import('stripe')).default;
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                await stripe.subscriptions.cancel(profile.stripe_subscription_id);
                logger.info('GDPR', 'Stripe subscription cancelled', { subscriptionId: profile.stripe_subscription_id });
            } catch (stripeErr) {
                logger.warn('GDPR', 'Stripe cancellation failed (may already be cancelled)', {
                    userId,
                    error: stripeErr.message
                });
            }
        }

        const { data: projects } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('user_id', userId);

        if (projects?.length) {
            for (const project of projects) {
                try {
                    const { data: thumbFiles } = await supabaseAdmin.storage
                        .from('project-thumbnails')
                        .list(project.id);
                    if (thumbFiles?.length) {
                        await supabaseAdmin.storage
                            .from('project-thumbnails')
                            .remove(thumbFiles.map(f => `${project.id}/${f.name}`));
                    }
                } catch (stEr) {
                    logger.warn('GDPR', `Storage cleanup error for project ${project.id}`, { error: stEr.message });
                }
            }
        }

        const { data: publishedSites } = await supabaseAdmin
            .from('published_sites')
            .select('storage_path')
            .eq('user_id', userId);

        if (publishedSites?.length) {
            for (const site of publishedSites) {
                try {
                    if (site.storage_path) {
                        const { data: siteFiles } = await supabaseAdmin.storage
                            .from('published-sites')
                            .list(site.storage_path);
                        if (siteFiles?.length) {
                            await supabaseAdmin.storage
                                .from('published-sites')
                                .remove(siteFiles.map(f => `${site.storage_path}/${f.name}`));
                        }
                    }
                } catch (stEr) {
                    logger.warn('GDPR', 'Published site storage cleanup error', { error: stEr.message });
                }
            }
        }

        const agentSessions = await selectEq('agent_sessions', 'user_id', userId);
        const agentTurns = await selectEq('agent_turns', 'user_id', userId);
        const sessionIds = idsFrom(agentSessions);
        const turnIds = idsFrom(agentTurns);

        await deleteIn('agent_tool_events', 'session_id', sessionIds);
        await deleteIn('agent_tool_events', 'turn_id', turnIds);
        await deleteIn('agent_messages', 'session_id', sessionIds);
        await deleteIn('agent_messages', 'turn_id', turnIds);
        await deleteEq('agent_memory', 'user_id', userId);
        await deleteEq('agent_turns', 'user_id', userId);
        await deleteEq('agent_sessions', 'user_id', userId);

        await deleteEq('snapshots', 'user_id', userId);
        await deleteEq('published_sites', 'user_id', userId);

        // Financial ledger is retained for accounting/refund/dispute evidence, but detached from the deleted account.
        await supabaseAdmin
            .from('credit_transactions')
            .update({
                user_id: null,
                project_id: null,
                description: 'ANONYMIZED (Account Deleted)'
            })
            .eq('user_id', userId);

        await deleteEq('projects', 'user_id', userId);
        await deleteEq('component_likes', 'user_id', userId);
        await deleteEq('component_ratings', 'user_id', userId);

        await supabaseAdmin
            .from('components')
            .update({ author_id: null, submission_id: null })
            .eq('author_id', userId);
        await supabaseAdmin.from('templates').update({ author_id: null }).eq('author_id', userId);
        await deleteEq('community_submissions', 'user_id', userId);
        await deleteEq('platform_feedback', 'user_id', userId);
        await deleteEq('platform_issues', 'user_id', userId);

        await finishGdprRequest(gdprRequest?.id, {
            status: 'completed',
            metadata: {
                version: GDPR_EXPORT_VERSION,
                financialLedgerAnonymized: true
            }
        });

        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authErr) {
            logger.error('GDPR', 'Failed to delete auth user', { userId, error: authErr });
        }

        logger.info('GDPR', 'Account and user-scoped data deleted/anonymized', { userId });
        void writeAuditLog({
            actorUserId: null,
            action: 'account_delete_completed',
            entityType: 'profile',
            entityId: userId,
            metadata: {
                gdprRequestId: gdprRequest?.id || null,
                authUserDeleted: !authErr,
                financialLedgerAnonymized: true
            }
        });

        return res.json({ success: true, message: 'Account permanently deleted.' });
    } catch (err) {
        logger.error('GDPR', 'Delete account fatal error', { userId, error: err.message });
        await finishGdprRequest(gdprRequest?.id, {
            status: 'rejected',
            notes: err.message,
            metadata: { version: GDPR_EXPORT_VERSION }
        });
        void logAuditEvent(req, {
            action: 'account_delete_failed',
            entityType: 'profile',
            entityId: userId,
            metadata: {
                gdprRequestId: gdprRequest?.id || null,
                error: err.message
            }
        });
        return res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
});

export default router;
