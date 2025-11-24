import { supabase } from '../../../lib/supabaseClient';
import { logAdminAction } from './adminClient';

/**
 * Get users with filters, pagination, and sorting
 * @param {object} filters - Filter options
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function getUsers(filters = {}) {
  const {
    search = '',
    role = null,
    page = 1,
    limit = 50,
    sortColumn = 'created_at',
    sortDirection = 'desc'
  } = filters;

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  // Apply search filter
  if (search) {
    query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  }

  // Apply role filter
  if (role) {
    query = query.eq('role', role);
  }

  // Apply sorting
  query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get user by ID with related data
 * @param {string} userId - User UUID
 * @returns {Promise<object>}
 */
export async function getUserById(userId) {
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    throw profileError;
  }

  // Get user email from auth.users (via admin API or Edge Function)
  // For now, we'll get it from auth if available, otherwise leave null
  let email = null;
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    email = user?.email || null;
  } catch (e) {
    // If admin API not available, email will be null
    console.warn('Could not fetch user email:', e);
  }

  // Get garage items count
  const { count: garageCount } = await supabase
    .from('garage_items')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId);

  // Get configurations count
  const { count: configsCount } = await supabase
    .from('configurations')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId);

  return {
    ...profile,
    email,
    garageItemsCount: garageCount || 0,
    configurationsCount: configsCount || 0
  };
}

/**
 * Update user profile
 * @param {string} userId - User UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>}
 */
export async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log admin action
  await logAdminAction('user_updated', 'user', userId, { updates });

  return data;
}

/**
 * Delete user (soft delete by setting role to null or archiving)
 * @param {string} userId - User UUID
 * @returns {Promise<void>}
 */
export async function deleteUser(userId) {
  // For now, we'll just remove admin role if present
  // In production, you might want to soft delete or archive
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'user' })
    .eq('id', userId);

  if (error) {
    throw error;
  }

  // Log admin action
  await logAdminAction('user_deleted', 'user', userId, {});
}

/**
 * Create new user via Edge Function
 * @param {object} userData - User creation data
 * @returns {Promise<object>}
 */
export async function createUser(userData) {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: userData
  });

  if (error) {
    throw error;
  }

  // Log admin action
  if (data?.user?.id) {
    await logAdminAction('user_created', 'user', data.user.id, { email: userData.email });
  }

  return data;
}

/**
 * Bulk update user roles
 * @param {Array<string>} userIds - Array of user UUIDs
 * @param {string} role - New role
 * @returns {Promise<void>}
 */
export async function bulkUpdateUserRoles(userIds, role) {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .in('id', userIds);

  if (error) {
    throw error;
  }

  // Log admin action for each user
  for (const userId of userIds) {
    await logAdminAction('user_role_updated', 'user', userId, { role });
  }
}

/**
 * Export users to CSV format
 * @param {object} filters - Same filters as getUsers
 * @returns {Promise<string>} CSV string
 */
export async function exportUsersToCSV(filters = {}) {
  const { data } = await getUsers({ ...filters, limit: 10000 });
  
  const headers = ['ID', 'Email', 'Display Name', 'Role', 'Created At', 'Updated At'];
  const rows = data.map(user => [
    user.id,
    user.email || '',
    user.display_name || '',
    user.role || 'user',
    user.created_at || '',
    user.updated_at || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

