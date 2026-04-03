/**
 * Admin API routes for VolturianoBuilder.
 * 
 * All routes require authentication + admin_role = true on the profile.
 * The admin_role is verified server-side on every request by querying the profiles table.
 */
import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// ═══ Middleware: Verify admin_role ═══
async function requireBuilderAdmin(req, res, next) {
    if (!supabaseAdmin) {
        return res.status(503).json({ error: 'Database not configured' });
    }
    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('admin_role')
            .eq('id', req.userId)
            .single();

        if (error || !profile?.admin_role) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (err) {
        console.error('[Admin] Admin check failed:', err);
        return res.status(500).json({ error: 'Admin verification failed' });
    }
}

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

// ═══ GET /api/admin/components — Fetch all components for admin panel ═══
router.get('/components', requireAuth, requireBuilderAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('components')
            .select('id, component_id, name, display_name, category, subcategory, component_type, description, visual_description, mood_tone, design_personality, color_mode, suitable_for, not_suitable_for, quality_score, preview_image_url, preview_video_url, thumbnail_url, is_premium, usage_count, rating_avg, rating_count, status, has_animation, tags, industry_tags, bundle_code, created_at, updated_at')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({ success: true, components: data || [] });
    } catch (err) {
        console.error('[Admin] Fetch components failed:', err);
        res.status(500).json({ success: false, error: err.message });
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

        res.json({ success: true, component: data });
    } catch (err) {
        console.error('[Admin] Update component failed:', err.message || err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══ POST /api/admin/upload-asset — Upload image/video to Supabase Storage ═══
router.post('/upload-asset', requireAuth, requireBuilderAdmin, async (req, res) => {
    const { fileName, fileData, contentType, componentId } = req.body;

    if (!fileName || !fileData || !contentType) {
        return res.status(400).json({ error: 'fileName, fileData (base64), and contentType required' });
    }

    try {
        // Convert base64 to buffer
        const buffer = Buffer.from(fileData, 'base64');
        const storagePath = `admin-uploads/${componentId || 'general'}/${Date.now()}-${fileName}`;

        const { data, error } = await supabaseAdmin.storage
            .from('builder-assets')
            .upload(storagePath, buffer, {
                contentType,
                upsert: false,
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('builder-assets')
            .getPublicUrl(storagePath);

        res.json({ success: true, url: urlData.publicUrl, path: storagePath });
    } catch (err) {
        console.error('[Admin] Upload asset failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
