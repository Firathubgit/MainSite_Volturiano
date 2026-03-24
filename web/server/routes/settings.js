import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

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

        if (!supabaseAdmin) {
            logger.error('Settings', 'supabaseAdmin is null! Check env vars.');
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

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

        logger.info('Settings', '✅ preferred_mode updated successfully', { userId, mode: preferred_mode });
        return res.json({ success: true, preferred_mode });
    } catch (err) {
        logger.error('Settings', 'Unhandled error in preferred-mode', { error: err.message });
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/settings/export-data
 * Compiles ALL personal data into a JSON file for download. (GDPR Right to Access)
 */
router.get('/export-data', requireAuth, async (req, res) => {
    const userId = req.userId;
    try {
        logger.info('GDPR', 'Data export requested', { userId });

        const exportData = {
            exported_at: new Date().toISOString(),
            data_controller: 'Volturiano',
            contact: 'contact@volturiano.com',
            user_id: userId,
            data: {}
        };

        const userIdTables = [
            'projects', 'published_sites', 'credit_transactions', 'snapshots',
            'community_submissions', 'component_likes', 'component_ratings',
            'platform_feedback'
        ];

        const { data: profileData, error: profileErr } = await supabaseAdmin
            .from('profiles').select('*').eq('id', userId).single();
        
        // --- Issue #7 Fix: Wrap in array for consistency with other tables ---
        exportData.data.profiles = profileErr ? { error: 'Failed to fetch' } : [profileData];

        for (const table of userIdTables) {
            const { data, error } = await supabaseAdmin
                .from(table).select('*').eq('user_id', userId);
            if (error) {
                logger.error('GDPR', `Error exporting table ${table}`, { userId, error });
                exportData.data[table] = { error: 'Failed to fetch' };
            } else {
                exportData.data[table] = data;
            }
        }

        const { data: authoredComponents, error: compErr } = await supabaseAdmin
            .from('components').select('*').eq('author_id', userId);
        exportData.data.authored_components = compErr ? { error: 'Failed to fetch' } : authoredComponents;

        res.setHeader('Content-Disposition', `attachment; filename="volturiano-data-${userId}.json"`);
        res.setHeader('Content-Type', 'application/json');
        return res.json(exportData);
    } catch (err) {
        logger.error('GDPR', 'Export fatal error', { userId, error: err.message });
        return res.status(500).json({ success: false, error: 'Failed to generate data export' });
    }
});

/**
 * DELETE /api/settings/delete-account
 */
router.delete('/delete-account', requireAuth, async (req, res) => {
    const userId = req.userId;
    try {
        logger.warn('GDPR', '🚨 ACCOUNT DELETION INITIATED', { userId });

        const { data: profile } = await supabaseAdmin
            .from('profiles').select('stripe_customer_id, stripe_subscription_id').eq('id', userId).single();

        if (profile?.stripe_subscription_id) {
            try {
                const Stripe = (await import('stripe')).default;
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                await stripe.subscriptions.cancel(profile.stripe_subscription_id);
                logger.info('GDPR', '✅ Stripe subscription cancelled', { subscriptionId: profile.stripe_subscription_id });
            } catch (stripeErr) {
                logger.warn('GDPR', 'Stripe cancellation failed (may already be cancelled)', { userId, error: stripeErr.message });
            }
        }

        const { data: projects } = await supabaseAdmin
            .from('projects').select('id').eq('user_id', userId);

        if (projects?.length) {
            for (const project of projects) {
                try {
                    const { data: thumbFiles } = await supabaseAdmin.storage.from('project-thumbnails').list(project.id);
                    if (thumbFiles?.length) {
                        await supabaseAdmin.storage.from('project-thumbnails').remove(thumbFiles.map(f => `${project.id}/${f.name}`));
                    }
                } catch (stEr) { logger.warn('GDPR', `Storage cleanup error for project ${project.id}`, { error: stEr.message }); }
            }
        }

        const { data: publishedSites } = await supabaseAdmin
            .from('published_sites').select('storage_path').eq('user_id', userId);

        if (publishedSites?.length) {
            for (const site of publishedSites) {
                try {
                    if (site.storage_path) {
                        const { data: siteFiles } = await supabaseAdmin.storage.from('published-sites').list(site.storage_path);
                        if (siteFiles?.length) {
                            await supabaseAdmin.storage.from('published-sites').remove(siteFiles.map(f => `${site.storage_path}/${f.name}`));
                        }
                    }
                } catch (stEr) { logger.warn('GDPR', 'Published site storage cleanup error', { error: stEr.message }); }
            }
        }

        await supabaseAdmin.from('snapshots').delete().eq('user_id', userId);
        await supabaseAdmin.from('published_sites').delete().eq('user_id', userId);

        await supabaseAdmin
            .from('credit_transactions')
            .update({ user_id: null, project_id: null, description: 'ANONYMIZED (Account Deleted)' })
            .eq('user_id', userId);

        await supabaseAdmin.from('projects').delete().eq('user_id', userId);
        await supabaseAdmin.from('component_likes').delete().eq('user_id', userId);
        await supabaseAdmin.from('component_ratings').delete().eq('user_id', userId);

        await supabaseAdmin.from('components').update({ author_id: null }).eq('author_id', userId);
        await supabaseAdmin.from('community_submissions').delete().eq('user_id', userId);
        await supabaseAdmin.from('platform_feedback').delete().eq('user_id', userId);
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authErr) {
            logger.error('GDPR', 'Failed to delete auth user', { userId, error: authErr });
        }

        logger.info('GDPR', '✅ Account and ALL data deleted', { userId });
        return res.json({ success: true, message: 'Account permanently deleted.' });

    } catch (err) {
        logger.error('GDPR', 'Delete account fatal error', { userId, error: err.message });
        return res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
});

export default router;
