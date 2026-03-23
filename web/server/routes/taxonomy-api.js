// Phase S7: Taxonomy API — Express Router
// All GET endpoints for categories, blueprints, verticals, themes, compatibility
import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';

const router = Router();
const sb = supabaseAdmin;

// ═══ GET /api/taxonomy/categories ═══
router.get('/categories', async (req, res) => {
    try {
        const t0 = Date.now();
        const { parent, depth } = req.query;
        console.log(`[taxonomy-api] GET /categories | parent=${parent || 'ALL'} depth=${depth || 'ALL'}`);
        let query = sb.from('component_categories').select('*').eq('is_active', true).order('sort_order');

        if (parent) {
            // Get parent first, then its children
            const { data: parentRow } = await sb.from('component_categories').select('id').eq('slug', parent).single();
            if (!parentRow) return res.status(404).json({ success: false, error: 'Parent category not found' });
            query = query.eq('parent_id', parentRow.id);
        } else if (depth === '0') {
            query = query.is('parent_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        // If no depth filter, nest sub-categories under their parents
        if (!parent && depth !== '0') {
            const topLevel = data.filter(c => !c.parent_id);
            const nested = topLevel.map(cat => ({
                ...cat,
                sub_categories: data.filter(c => c.parent_id === cat.id)
            }));
            const totalSubs = nested.reduce((s, c) => s + c.sub_categories.length, 0);
            console.log(`[taxonomy-api] ✅ /categories → ${topLevel.length} top-level, ${totalSubs} sub-categories (${Date.now() - t0}ms)`);
            return res.json({ success: true, categories: nested });
        }

        console.log(`[taxonomy-api] ✅ /categories → ${data.length} rows (${Date.now() - t0}ms)`);
        res.json({ success: true, categories: data });
    } catch (error) {
        console.error('[taxonomy-api] categories error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══ GET /api/taxonomy/categories/:slug ═══
router.get('/categories/:slug', async (req, res) => {
    try {
        console.log(`[taxonomy-api] GET /categories/${req.params.slug}`);
        const { data: category, error } = await sb.from('component_categories')
            .select('*').eq('slug', req.params.slug).single();
        if (error || !category) return res.status(404).json({ success: false, error: 'Category not found' });

        const { data: subs } = await sb.from('component_categories')
            .select('*').eq('parent_id', category.id).order('sort_order');

        console.log(`[taxonomy-api] ✅ /categories/${req.params.slug} → ${category.display_name} | ${(subs || []).length} sub-categories`);
        res.json({ success: true, category: { ...category, sub_categories: subs || [] } });
    } catch (error) {
        console.error('[taxonomy-api] category/:slug error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══ GET /api/taxonomy/blueprints ═══
router.get('/blueprints', async (req, res) => {
    try {
        const t0 = Date.now();
        const { industry, search, limit } = req.query;
        console.log(`[taxonomy-api] GET /blueprints | industry=${industry || 'ALL'} search=${search || 'NONE'} limit=${limit || 'ALL'}`);
        let query = sb.from('website_type_blueprints').select('*')
            .eq('is_active', true).order('popularity_score', { ascending: false });

        if (limit) query = query.limit(parseInt(limit));

        const { data, error } = await query;
        if (error) throw error;

        let results = data;
        // Filter by industry (check primary_industries JSONB array)
        if (industry) {
            results = results.filter(b => b.primary_industries?.includes(industry));
        }
        // Search by keyword overlap
        if (search) {
            const tokens = search.toLowerCase().split(/\s+/);
            results = results.filter(b =>
                b.prompt_keywords?.some(kw => tokens.some(t => kw.includes(t) || t.includes(kw)))
            );
        }

        console.log(`[taxonomy-api] ✅ /blueprints → ${results.length} results (${Date.now() - t0}ms)${search ? ' | search: ' + search : ''}`);
        res.json({ success: true, blueprints: results });
    } catch (error) {
        console.error('[taxonomy-api] blueprints error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══ GET /api/taxonomy/blueprints/:slug ═══
router.get('/blueprints/:slug', async (req, res) => {
    try {
        console.log(`[taxonomy-api] GET /blueprints/${req.params.slug}`);
        const { data, error } = await sb.from('website_type_blueprints')
            .select('*').eq('slug', req.params.slug).single();
        if (error || !data) return res.status(404).json({ success: false, error: 'Blueprint not found' });
        console.log(`[taxonomy-api] ✅ /blueprints/${req.params.slug} → ${data.name} | req=${data.required_categories?.length} categories | keywords=${data.prompt_keywords?.join(',')}`);
        res.json({ success: true, blueprint: data });
    } catch (error) {
        console.error('[taxonomy-api] blueprint/:slug error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══ GET /api/taxonomy/verticals ═══
router.get('/verticals', async (req, res) => {
    try {
        console.log(`[taxonomy-api] GET /verticals`);
        const { data, error } = await sb.from('industry_verticals')
            .select('*').eq('is_active', true).order('sort_order');
        if (error) throw error;
        console.log(`[taxonomy-api] ✅ /verticals → ${data.length} verticals`);
        res.json({ success: true, verticals: data });
    } catch (error) {
        console.error('[taxonomy-api] verticals error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══ GET /api/taxonomy/themes ═══
router.get('/themes', async (req, res) => {
    try {
        const { mode, warmth, industry } = req.query;
        let query = sb.from('color_themes').select('*').eq('is_active', true).order('sort_order');
        if (mode) query = query.eq('mode', mode);
        if (warmth) query = query.eq('warmth', warmth);

        const { data, error } = await query;
        if (error) throw error;

        let results = data;
        if (industry) {
            results = results.filter(t => t.suitable_industries?.includes(industry));
        }

        res.json({ success: true, themes: results });
    } catch (error) {
        console.error('[taxonomy-api] themes error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══ GET /api/taxonomy/compatibility ═══
router.get('/compatibility', async (req, res) => {
    try {
        const { component_id } = req.query;
        console.log(`[taxonomy-api] GET /compatibility | component_id=${component_id || 'MISSING'}`);
        if (!component_id) return res.status(400).json({ success: false, error: 'component_id required' });

        const { data, error } = await sb.from('component_compatibility')
            .select('*')
            .or(`component_a_id.eq.${component_id},component_b_id.eq.${component_id}`)
            .order('compatibility_score', { ascending: false });
        if (error) throw error;

        console.log(`[taxonomy-api] ✅ /compatibility → ${data.length} pairs for ${component_id}`);
        res.json({ success: true, pairs: data });
    } catch (error) {
        console.error('[taxonomy-api] compatibility error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
