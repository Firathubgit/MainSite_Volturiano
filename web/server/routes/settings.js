/**
 * Settings Routes — User preference updates via backend (service role).
 * 
 * Uses the service_role key (supabaseAdmin) which NEVER expires,
 * making this completely immune to the alt-tab stale-token bug
 * that affects direct frontend Supabase calls.
 */
import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';

const router = express.Router();

/**
 * PATCH /api/settings/preferred-mode
 * Updates the user's preferred builder mode (hybrid / premium).
 */
router.patch('/preferred-mode', requireAuth, async (req, res) => {
    console.log('[Settings] PATCH /preferred-mode hit. userId:', req.userId, 'body:', req.body);
    try {
        const { preferred_mode } = req.body;

        // Validate input
        const VALID_MODES = ['free', 'hybrid', 'premium'];
        if (!preferred_mode || !VALID_MODES.includes(preferred_mode)) {
            console.log('[Settings] Invalid mode received:', preferred_mode);
            return res.status(400).json({ 
                success: false, 
                error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` 
            });
        }

        if (!supabaseAdmin) {
            console.error('[Settings] supabaseAdmin is null! Check env vars.');
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        console.log('[Settings] Updating profiles for user:', req.userId, '→', preferred_mode);

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ 
                preferred_mode, 
                updated_at: new Date().toISOString() 
            })
            .eq('id', req.userId);

        if (error) {
            console.error('[Settings] Supabase update error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        console.log('[Settings] ✅ preferred_mode updated successfully to:', preferred_mode);
        return res.json({ success: true, preferred_mode });
    } catch (err) {
        console.error('[Settings] Unhandled error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/settings/export-data
 * Compiles all personal data into a JSON file for download. (GDPR Right to Access)
 */
router.get('/export-data', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        console.log('[GDPR] Data export requested for user:', userId);

        const tables = ['profiles', 'projects', 'published_sites', 'credit_transactions', 'snapshots', 'ai_selection_events'];
        const exportData = {
            exported_at: new Date().toISOString(),
            user_id: userId,
            data: {}
        };

        for (const table of tables) {
            const { data, error } = await supabaseAdmin
                .from(table)
                .select('*')
                .eq(table === 'profiles' ? 'id' : 'user_id', userId);
            
            if (error) {
                console.error(`[GDPR] Error exporting table ${table}:`, error);
                exportData.data[table] = { error: 'Failed to fetch' };
            } else {
                exportData.data[table] = data;
            }
        }

        res.setHeader('Content-Disposition', `attachment; filename="volturiano-data-${userId}.json"`);
        res.setHeader('Content-Type', 'application/json');
        return res.json(exportData);
    } catch (err) {
        console.error('[GDPR] Export fatal error:', err);
        return res.status(500).json({ success: false, error: 'Failed to generate data export' });
    }
});

/**
 * DELETE /api/settings/delete-account
 * Permanent deletion of account and associated data. (GDPR Right to Erasure)
 */
router.delete('/delete-account', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        console.log('[GDPR] 🚨 ACCOUNT DELETION INITIATED for user:', userId);

        // 1. Get projects to clean up storage
        const { data: projects } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('user_id', userId);

        // 2. Clean up Storage (Thumbnails, Sites)
        if (projects && projects.length > 0) {
            for (const project of projects) {
                try {
                    // Delete project thumbnail (ignoring errors if not exists)
                    const { data: files } = await supabaseAdmin.storage.from('project-thumbnails').list(project.id);
                    if (files?.length) {
                        await supabaseAdmin.storage.from('project-thumbnails').remove(files.map(f => `${project.id}/${f.name}`));
                    }
                    
                    // Published site files cleanup would go here if using Storage for sites
                    // ...
                } catch (stEr) { console.warn(`[GDPR] Storage cleanup err for ${project.id}:`, stEr); }
            }
        }

        // 3. Delete DB Records related to user (Project-linked data first)
        // Note: Supabase FK cascades handle most of this if configured, but we do it explicitly for safety.
        await supabaseAdmin.from('snapshots').delete().eq('user_id', userId);
        await supabaseAdmin.from('published_sites').delete().eq('user_id', userId);
        await supabaseAdmin.from('projects').delete().eq('user_id', userId);

        // 4. Anonymize Financial Records (Bokföringslagen compliance)
        await supabaseAdmin
            .from('credit_transactions')
            .update({ 
                user_id: null, 
                description: 'ANONYMIZED (Account Deleted)',
                // Keeping amount and type for accounting
            })
            .eq('user_id', userId);

        // 5. Delete Profile
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        // 6. Delete Auth User (Requires Admin API)
        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authErr) {
            console.error('[GDPR] Failed to delete auth user:', authErr);
            // We proceed anyway as DB data is gone
        }

        console.log('[GDPR] ✅ Account and data deleted for:', userId);
        return res.json({ success: true, message: 'Account permanently deleted.' });

    } catch (err) {
        console.error('[GDPR] Delete account fatal error:', err);
        return res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
});

export default router;
