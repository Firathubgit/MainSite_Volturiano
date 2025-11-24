import { supabase } from '../../../lib/supabaseClient';
import { logAdminAction } from './adminClient';

/**
 * Get vehicles with filters
 * @param {object} filters - Filter options
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function getVehicles(filters = {}) {
  const {
    search = '',
    page = 1,
    limit = 50,
    sortColumn = 'created_at',
    sortDirection = 'desc'
  } = filters;

  let query = supabase
    .from('vehicles')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: data || [], count: count || 0 };
}

/**
 * Get vehicle by ID
 * @param {string} vehicleId - Vehicle UUID
 * @returns {Promise<object>}
 */
export async function getVehicleById(vehicleId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create vehicle
 * @param {object} vehicleData - Vehicle data
 * @returns {Promise<object>}
 */
export async function createVehicle(vehicleData) {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(vehicleData)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('vehicle_created', 'vehicle', data.id, vehicleData);
  return data;
}

/**
 * Update vehicle
 * @param {string} vehicleId - Vehicle UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>}
 */
export async function updateVehicle(vehicleId, updates) {
  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', vehicleId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('vehicle_updated', 'vehicle', vehicleId, { updates });
  return data;
}

/**
 * Delete vehicle
 * @param {string} vehicleId - Vehicle UUID
 * @returns {Promise<void>}
 */
export async function deleteVehicle(vehicleId) {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId);

  if (error) throw error;

  await logAdminAction('vehicle_deleted', 'vehicle', vehicleId, {});
}

/**
 * Get vehicle options
 * @param {object} filters - Filter options
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function getOptions(filters = {}) {
  const {
    vehicleId = null,
    category = null,
    search = null,
    visible = null,
    page = 1,
    limit = 50
  } = filters;

  let query = supabase
    .from('vehicle_options')
    .select('*', { count: 'exact' });

  if (vehicleId && vehicleId !== 'all') {
    query = query.eq('vehicle_id', vehicleId);
  }

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`code.ilike.%${search}%,label.ilike.%${search}%`);
  }

  if (visible !== null) {
    query = query.eq('configurator_visible', visible);
  }

  query = query.order('configurator_order', { ascending: true });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    // If table doesn't exist, return empty array
    if (error.code === '42P01') {
      return { data: [], count: 0 };
    }
    throw error;
  }

  // Transform to match expected format
  const transformed = (data || []).map(opt => ({
    id: opt.id,
    vehicleId: opt.vehicle_id,
    category: opt.category,
    code: opt.code,
    label: opt.label,
    description: opt.description,
    priceCents: opt.price_cents || 0,
    currency: opt.currency || 'EUR',
    mediaUrl: opt.media_url,
    configuratorVisible: opt.configurator_visible !== false,
    configuratorGroup: opt.configurator_group,
    configuratorOrder: opt.configurator_order,
    dependencies: opt.dependencies || [],
    updatedAt: opt.updated_at || opt.created_at
  }));

  return { data: transformed, count: count || 0 };
}

/**
 * Get option by ID
 * @param {string} optionId - Option UUID
 * @returns {Promise<object>}
 */
export async function getOptionById(optionId) {
  const { data, error } = await supabase
    .from('vehicle_options')
    .select('*')
    .eq('id', optionId)
    .single();

  if (error) throw error;
  
  // Transform to app format
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    category: data.category,
    code: data.code,
    label: data.label,
    description: data.description,
    priceCents: data.price_cents || 0,
    currency: data.currency || 'EUR',
    mediaUrl: data.media_url,
    configuratorVisible: data.configurator_visible !== false,
    configuratorGroup: data.configurator_group,
    configuratorOrder: data.configurator_order,
    dependencies: data.dependencies || [],
    updatedAt: data.updated_at || data.created_at
  };
}

/**
 * Create option
 * @param {object} optionData - Option data
 * @returns {Promise<object>}
 */
export async function createOption(optionData) {
  // Transform to database format
  const dbData = {
    vehicle_id: optionData.vehicleId,
    category: optionData.category,
    code: optionData.code,
    label: optionData.label,
    description: optionData.description,
    price_cents: optionData.priceCents || 0,
    currency: optionData.currency || 'EUR',
    media_url: optionData.mediaUrl,
    configurator_visible: optionData.configuratorVisible !== false,
    configurator_group: optionData.configuratorGroup,
    configurator_order: optionData.configuratorOrder,
    dependencies: optionData.dependencies || []
  };

  const { data, error } = await supabase
    .from('vehicle_options')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('option_created', 'vehicle_option', data.id, optionData);
  
  // Transform back to app format
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    category: data.category,
    code: data.code,
    label: data.label,
    description: data.description,
    priceCents: data.price_cents || 0,
    currency: data.currency || 'EUR',
    mediaUrl: data.media_url,
    configuratorVisible: data.configurator_visible !== false,
    configuratorGroup: data.configurator_group,
    configuratorOrder: data.configurator_order,
    dependencies: data.dependencies || [],
    updatedAt: data.updated_at || data.created_at
  };
}

/**
 * Update option
 * @param {string} optionId - Option UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>}
 */
export async function updateOption(optionId, updates) {
  // Transform to database format
  const dbUpdates = {};
  if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.code !== undefined) dbUpdates.code = updates.code;
  if (updates.label !== undefined) dbUpdates.label = updates.label;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.priceCents !== undefined) dbUpdates.price_cents = updates.priceCents;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.mediaUrl !== undefined) dbUpdates.media_url = updates.mediaUrl;
  if (updates.configuratorVisible !== undefined) dbUpdates.configurator_visible = updates.configuratorVisible;
  if (updates.configuratorGroup !== undefined) dbUpdates.configurator_group = updates.configuratorGroup;
  if (updates.configuratorOrder !== undefined) dbUpdates.configurator_order = updates.configuratorOrder;
  if (updates.dependencies !== undefined) dbUpdates.dependencies = updates.dependencies;

  const { data, error } = await supabase
    .from('vehicle_options')
    .update(dbUpdates)
    .eq('id', optionId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('option_updated', 'vehicle_option', optionId, { updates });
  
  // Transform back to app format
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    category: data.category,
    code: data.code,
    label: data.label,
    description: data.description,
    priceCents: data.price_cents || 0,
    currency: data.currency || 'EUR',
    mediaUrl: data.media_url,
    configuratorVisible: data.configurator_visible !== false,
    configuratorGroup: data.configurator_group,
    configuratorOrder: data.configurator_order,
    dependencies: data.dependencies || [],
    updatedAt: data.updated_at || data.created_at
  };
}

/**
 * Delete option
 * @param {string} optionId - Option UUID
 * @returns {Promise<void>}
 */
export async function deleteOption(optionId) {
  const { error } = await supabase
    .from('vehicle_options')
    .delete()
    .eq('id', optionId);

  if (error) throw error;

  await logAdminAction('option_deleted', 'vehicle_option', optionId, {});
}

/**
 * Upload image to Supabase Storage
 * @param {File} file - Image file
 * @param {string} bucket - Storage bucket name
 * @param {string} path - Path in bucket
 * @returns {Promise<string>} Public URL
 */
export async function uploadImage(file, bucket, path) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}/${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}






