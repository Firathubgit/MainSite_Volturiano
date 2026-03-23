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

export default router;
