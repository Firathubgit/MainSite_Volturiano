// Phase S7: Category-based component filtering utilities
import { supabaseAdmin } from './supabase-admin.js';

const sb = supabaseAdmin;

/**
 * Filter components by category slugs
 * @param {string[]} categories - Array of category slugs to filter by
 * @param {object} options - { limit, offset, includeVariants }
 */
export async function filterComponentsByCategories(categories, options = {}) {
    const { limit = 50, offset = 0, includeVariants = false } = options;

    if (!sb) {
        console.warn('[category-filter] No Supabase client');
        return [];
    }

    let query = sb.from('components').select('*')
        .in('category', categories)
        .eq('status', 'active')
        .range(offset, offset + limit - 1);

    if (!includeVariants) {
        query = query.is('variant_of', null);
    }

    const { data, error } = await query;
    if (error) {
        console.error('[category-filter] Filter error:', error.message);
        return [];
    }

    return data || [];
}

/**
 * Get components that are compatible with a given component
 * @param {string} componentId - The component ID to find compatible pairs for
 * @returns {Promise<Array>} Compatible component entries with scores
 */
export async function getCompatibleComponents(componentId) {
    if (!sb) return [];

    const { data, error } = await sb.from('component_compatibility')
        .select('*')
        .or(`component_a_id.eq.${componentId},component_b_id.eq.${componentId}`)
        .gte('compatibility_score', 0.5)
        .order('compatibility_score', { ascending: false });

    if (error) {
        console.error('[category-filter] Compatibility error:', error.message);
        return [];
    }

    return data || [];
}

/**
 * Get all category slugs for a blueprint's required + optional categories
 */
export async function getBlueprintCategories(blueprintSlug) {
    if (!sb) return { required: [], optional: [] };

    const { data, error } = await sb.from('website_type_blueprints')
        .select('required_categories, optional_categories')
        .eq('slug', blueprintSlug)
        .single();

    if (error || !data) return { required: [], optional: [] };
    return {
        required: data.required_categories || [],
        optional: data.optional_categories || [],
    };
}
