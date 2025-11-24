import { supabase } from '../../../lib/supabaseClient';

/**
 * Get user metrics for date range
 * @param {object} dateRange - {startDate, endDate}
 * @returns {Promise<object>}
 */
export async function getUserMetrics(dateRange = {}) {
  const { startDate, endDate } = dateRange;
  
  let query = supabase
    .from('profiles')
    .select('created_at', { count: 'exact' });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { count, error } = await query;

  if (error) throw error;

  return { totalUsers: count || 0 };
}

/**
 * Get configuration metrics
 * @param {object} dateRange - {startDate, endDate}
 * @returns {Promise<object>}
 */
export async function getConfigurationMetrics(dateRange = {}) {
  const { startDate, endDate } = dateRange;
  
  let query = supabase
    .from('garage_items')
    .select('created_at', { count: 'exact' });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { count, error } = await query;

  if (error) throw error;

  return { totalConfigurations: count || 0 };
}

/**
 * Get audit logs with filters
 * @param {object} filters - Filter options
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function getAuditLogs(filters = {}) {
  const {
    adminId = null,
    action = null,
    resourceType = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 100
  } = filters;

  let query = supabase
    .from('admin_audit_logs')
    .select('*, profiles!admin_audit_logs_admin_id_fkey(display_name, email)', { count: 'exact' });

  if (adminId) {
    query = query.eq('admin_id', adminId);
  }

  if (action) {
    query = query.eq('action', action);
  }

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  query = query.order('created_at', { ascending: false });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: data || [], count: count || 0 };
}



