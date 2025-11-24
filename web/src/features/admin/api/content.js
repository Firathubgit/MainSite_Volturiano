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
    search = '',
    page = 1,
    limit = 50
  } = filters;

  let query = supabase
    .from('vehicle_options')
    .select('*', { count: 'exact' });

  if (vehicleId) {
    query = query.eq('vehicle_id', vehicleId);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`code.ilike.%${search}%,label.ilike.%${search}%`);
  }

  query = query.order('configurator_order', { ascending: true });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: data || [], count: count || 0 };
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
  return data;
}

/**
 * Create option
 * @param {object} optionData - Option data
 * @returns {Promise<object>}
 */
export async function createOption(optionData) {
  const { data, error } = await supabase
    .from('vehicle_options')
    .insert(optionData)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('option_created', 'vehicle_option', data.id, optionData);
  return data;
}

/**
 * Update option
 * @param {string} optionId - Option UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>}
 */
export async function updateOption(optionId, updates) {
  const { data, error } = await supabase
    .from('vehicle_options')
    .update(updates)
    .eq('id', optionId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('option_updated', 'vehicle_option', optionId, { updates });
  return data;
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



