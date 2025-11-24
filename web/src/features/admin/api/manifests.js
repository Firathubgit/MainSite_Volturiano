import { supabase } from '../../../lib/supabaseClient';
import { logAdminAction } from './adminClient';

/**
 * Get manifests with filters
 * @param {object} filters - Filter options
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function getManifests(filters = {}) {
  const {
    status = null,
    vehicleModel = null,
    search = '',
    page = 1,
    limit = 50
  } = filters;

  let query = supabase
    .from('config_2d_manifests')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  if (vehicleModel) {
    query = query.eq('data->>vehicleModel', vehicleModel);
  }

  if (search) {
    query = query.ilike('slug', `%${search}%`);
  }

  query = query.order('created_at', { ascending: false });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: data || [], count: count || 0 };
}

/**
 * Get manifest by ID
 * @param {string} manifestId - Manifest UUID
 * @returns {Promise<object>}
 */
export async function getManifestById(manifestId) {
  const { data, error } = await supabase
    .from('config_2d_manifests')
    .select('*')
    .eq('id', manifestId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create manifest
 * @param {object} manifestData - Manifest data
 * @returns {Promise<object>}
 */
export async function createManifest(manifestData) {
  const { data, error } = await supabase
    .from('config_2d_manifests')
    .insert({
      slug: manifestData.id || manifestData.slug,
      data: manifestData,
      status: 'draft',
      version: 1
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('manifest_created', 'manifest', data.id, { slug: data.slug });
  return data;
}

/**
 * Update manifest
 * @param {string} manifestId - Manifest UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>}
 */
export async function updateManifest(manifestId, updates) {
  const { data, error } = await supabase
    .from('config_2d_manifests')
    .update(updates)
    .eq('id', manifestId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('manifest_updated', 'manifest', manifestId, {});
  return data;
}

/**
 * Publish manifest with validation
 * @param {string} manifestId - Manifest UUID
 * @returns {Promise<object>}
 */
export async function publishManifest(manifestId) {
  // Get current manifest
  const manifest = await getManifestById(manifestId);

  if (!manifest) {
    throw new Error('Manifest not found');
  }

  // Archive current published version if exists
  if (manifest.status === 'published') {
    await supabase
      .from('config_2d_manifests')
      .update({ status: 'archived' })
      .eq('slug', manifest.slug)
      .eq('status', 'published')
      .neq('id', manifestId);
  }

  // Update to published with incremented version
  const { data, error } = await supabase
    .from('config_2d_manifests')
    .update({
      status: 'published',
      version: manifest.version + 1,
      published_at: new Date().toISOString()
    })
    .eq('id', manifestId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('manifest_published', 'manifest', manifestId, { version: data.version });
  return data;
}

/**
 * Archive manifest
 * @param {string} manifestId - Manifest UUID
 * @returns {Promise<void>}
 */
export async function archiveManifest(manifestId) {
  const { error } = await supabase
    .from('config_2d_manifests')
    .update({ status: 'archived' })
    .eq('id', manifestId);

  if (error) throw error;

  await logAdminAction('manifest_archived', 'manifest', manifestId, {});
}

/**
 * Get manifest versions
 * @param {string} manifestSlug - Manifest slug
 * @returns {Promise<Array>}
 */
export async function getManifestVersions(manifestSlug) {
  const { data, error } = await supabase
    .from('config_2d_manifests')
    .select('*')
    .eq('slug', manifestSlug)
    .order('version', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Rollback manifest to specific version
 * @param {string} manifestSlug - Manifest slug
 * @param {number} targetVersion - Version to rollback to
 * @returns {Promise<object>}
 */
export async function rollbackManifest(manifestSlug, targetVersion) {
  const versions = await getManifestVersions(manifestSlug);
  const targetManifest = versions.find(v => v.version === targetVersion);

  if (!targetManifest) {
    throw new Error(`Version ${targetVersion} not found`);
  }

  // Create new version from target
  const { data, error } = await supabase
    .from('config_2d_manifests')
    .insert({
      slug: manifestSlug,
      data: targetManifest.data,
      status: 'draft',
      version: Math.max(...versions.map(v => v.version)) + 1
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('manifest_rollback', 'manifest', data.id, { targetVersion });
  return data;
}

/**
 * Validate manifest structure
 * @param {object} manifestData - Manifest data to validate
 * @returns {Promise<{valid: boolean, errors: Array}>}
 */
export async function validateManifest(manifestData) {
  const errors = [];

  if (!manifestData.id && !manifestData.slug) {
    errors.push('Manifest must have an id or slug');
  }

  if (!manifestData.vehicleModel) {
    errors.push('Manifest must specify vehicleModel');
  }

  if (!Array.isArray(manifestData.layers)) {
    errors.push('Manifest must have a layers array');
  }

  if (!Array.isArray(manifestData.variants)) {
    errors.push('Manifest must have a variants array');
  }

  // Check for circular dependencies (simplified check)
  if (manifestData.layers) {
    manifestData.layers.forEach((layer, index) => {
      if (layer.dependencies) {
        layer.dependencies.forEach(dep => {
          const depIndex = manifestData.layers.findIndex(l => l.id === dep);
          if (depIndex > index) {
            errors.push(`Layer ${layer.id} depends on ${dep} which comes after it`);
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}



