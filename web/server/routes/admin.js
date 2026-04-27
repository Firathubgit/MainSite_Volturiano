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
        res.json({ success: true, template: data });
    } catch (err) {
        console.error('[Admin] Create template failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
