import { getUsers as getUsersAPI } from './users';
import { getVehicles as getVehiclesAPI } from './content';
import { getAuditLogs as getAuditLogsAPI, getUserMetrics, getConfigurationMetrics } from './analytics';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Get dashboard statistics
 * @returns {Promise<{totalUsers: number, activeConfigurations: number, totalRevenue: number, serverLoad: number}>}
 */
export async function getStats() {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get active configurations (garage items)
    const { count: activeConfigurations } = await supabase
      .from('garage_items')
      .select('*', { count: 'exact', head: true });

    // Placeholder for revenue (not implemented yet)
    const totalRevenue = 0;

    // Placeholder for server load (could be calculated from metrics)
    const serverLoad = 42;

    return {
      totalUsers: totalUsers || 0,
      activeConfigurations: activeConfigurations || 0,
      totalRevenue,
      serverLoad
    };
  } catch (error) {
    console.error('[adminService] Error fetching stats:', error);
    throw error;
  }
}

/**
 * Get users list
 * @returns {Promise<Array>}
 */
export async function getUsers() {
  try {
    const { data } = await getUsersAPI({ limit: 1000 });
    
    // Transform to match volturiano-admin User type
    // Note: profiles table doesn't have email, so we'll use a placeholder or try to get from auth
    return data.map(user => {
      // Try to get email from auth if available (this might not work without admin API)
      let email = user.email;
      if (!email) {
        // Use display_name or create placeholder from ID
        email = user.display_name || `user_${user.id.substring(0, 8)}@volturiano.com`;
      }
      
      return {
        id: user.id,
        email: email,
        role: user.role || 'user',
        lastActive: user.updated_at ? formatRelativeTime(user.updated_at) : 'Never',
        createdAt: user.created_at || '',
        status: user.role && ['super_admin', 'content_admin', 'support_admin'].includes(user.role) ? 'active' : 'active'
      };
    });
  } catch (error) {
    console.error('[adminService] Error fetching users:', error);
    throw error;
  }
}

/**
 * Get vehicles list
 * @returns {Promise<Array>}
 */
export async function getVehicles() {
  try {
    const { data } = await getVehiclesAPI({ limit: 1000 });
    
    // Get configuration counts for each vehicle
    const vehiclesWithCounts = await Promise.all(
      data.map(async (vehicle) => {
        const { count } = await supabase
          .from('garage_items')
          .select('*', { count: 'exact', head: true })
          .eq('vehicle_id', vehicle.id);
        
        return {
          id: vehicle.id,
          name: vehicle.name || 'Unnamed Vehicle',
          modelCode: vehicle.slug || vehicle.id.substring(0, 8),
          status: 'published', // Default to published, could check a status field if it exists
          configurationsCount: count || 0,
          thumbnail: vehicle.hero_image_url || 'https://picsum.photos/seed/' + vehicle.id + '/400/250',
          lastUpdated: vehicle.updated_at ? formatRelativeTime(vehicle.updated_at) : formatRelativeTime(vehicle.created_at)
        };
      })
    );
    
    return vehiclesWithCounts;
  } catch (error) {
    console.error('[adminService] Error fetching vehicles:', error);
    throw error;
  }
}

/**
 * Get audit logs
 * @returns {Promise<Array>}
 */
export async function getAuditLogs() {
  try {
    const { data } = await getAuditLogsAPI({ limit: 100 });
    
    // Transform to match volturiano-admin AuditLog type
    return data.map(log => ({
      id: log.id,
      action: log.action || 'UNKNOWN',
      adminEmail: log.profiles?.email || log.profiles?.display_name || 'Unknown Admin',
      resource: log.resource_type || 'unknown',
      timestamp: log.created_at ? formatTimestamp(log.created_at) : '',
      status: 'success', // Could check error details if available
      details: log.details ? JSON.stringify(log.details).substring(0, 100) : ''
    }));
  } catch (error) {
    console.error('[adminService] Error fetching audit logs:', error);
    throw error;
  }
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format timestamp for audit logs
 */
function formatTimestamp(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', '');
}

/**
 * Get manifest by ID
 */
export async function getManifestById(manifestId) {
  const { getManifestById: getManifest } = await import('./manifests');
  return getManifest(manifestId);
}

/**
 * Update manifest
 */
export async function updateManifest(manifestId, updates) {
  const { updateManifest: updateManifestAPI } = await import('./manifests');
  return updateManifestAPI(manifestId, updates);
}

/**
 * Validate manifest
 */
export async function validateManifest(manifestData) {
  const { validateManifest: validate } = await import('./manifests');
  return validate(manifestData);
}

/**
 * Publish manifest
 */
export async function publishManifest(manifestId) {
  const { publishManifest: publish } = await import('./manifests');
  return publish(manifestId);
}

/**
 * Upload asset to Supabase Storage
 */
export async function uploadAsset(file) {
  const { uploadImage } = await import('./content');
  return uploadImage(file, 'volturiano-assets-prod', 'admin-uploads');
}

/**
 * Get options with filters
 */
export async function getOptions(filters = {}) {
  const { getOptions: getOptionsAPI } = await import('./content');
  const result = await getOptionsAPI(filters);
  return result.data || [];
}

/**
 * Get option by ID
 */
export async function getOptionById(optionId) {
  const { getOptionById: getOption } = await import('./content');
  return getOption(optionId);
}

/**
 * Create option
 */
export async function createOption(optionData) {
  const { createOption: create } = await import('./content');
  return create(optionData);
}

/**
 * Update option
 */
export async function updateOption(optionId, updates) {
  const { updateOption: update } = await import('./content');
  return update(optionId, updates);
}

/**
 * Delete option
 */
export async function deleteOption(optionId) {
  const { deleteOption: deleteOpt } = await import('./content');
  return deleteOpt(optionId);
}

/**
 * Get analytics data
 */
export async function getAnalyticsData({ timeRange = '7d' } = {}) {
  const { getAnalyticsData: getAnalytics } = await import('./analytics');
  return getAnalytics({ timeRange });
}

/**
 * Get system settings
 */
export async function getSystemSettings() {
  const { getSystemSettings: getSettings } = await import('./settings');
  return getSettings();
}

/**
 * Update system settings
 */
export async function updateSystemSettings(settings) {
  const { updateSystemSettings: updateSettings } = await import('./settings');
  return updateSettings(settings);
}

/**
 * Get roles
 */
export async function getRoles() {
  const { getRoles: getRolesAPI } = await import('./settings');
  return getRolesAPI();
}

/**
 * Update role permissions
 */
export async function updateRolePermissions(role, permissions) {
  const { updateRolePermissions: updatePerms } = await import('./settings');
  return updatePerms(role, permissions);
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(userId, role) {
  const { assignRoleToUser: assignRole } = await import('./settings');
  return assignRole(userId, role);
}

