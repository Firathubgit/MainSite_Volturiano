import { supabase } from '../../../lib/supabaseClient';
import { useAdminStore } from '../../../stores/adminStore';

/**
 * Admin API request wrapper with authentication checks
 * @param {string} table - Supabase table name
 * @param {string} method - Query method ('select', 'insert', 'update', 'delete')
 * @param {object} options - Query options
 * @returns {Promise} Query result
 */
export async function adminRequest(table, method, options = {}) {
  const { isAdmin } = useAdminStore.getState();
  
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  let query = supabase.from(table);
  
  switch (method) {
    case 'select':
      query = query.select(options.select || '*');
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending });
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + options.limit - 1);
      }
      break;
    case 'insert':
      query = query.insert(options.data);
      break;
    case 'update':
      query = query.update(options.data);
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      break;
    case 'delete':
      query = query.delete();
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      break;
    default:
      throw new Error(`Unknown method: ${method}`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Log an admin action to the audit trail
 * @param {string} action - Action name (e.g., 'user_created', 'manifest_published')
 * @param {string} resourceType - Resource type (e.g., 'user', 'manifest')
 * @param {string|null} resourceId - Resource UUID (optional)
 * @param {object} details - Additional details as JSON object
 * @returns {Promise<uuid>} Audit log ID
 */
export async function logAdminAction(action, resourceType, resourceId = null, details = {}) {
  try {
    const { data, error } = await supabase.rpc('log_admin_action', {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details
    });
    
    if (error) {
      console.error('[AdminClient] Failed to log admin action:', error);
      // Don't throw - logging failures shouldn't break the main operation
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[AdminClient] Error logging admin action:', error);
    return null;
  }
}






