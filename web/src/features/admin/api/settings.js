import { supabase } from '../../../lib/supabaseClient';
import { logAdminAction } from './adminClient';

/**
 * Get system settings
 * @returns {Promise<object>}
 */
export async function getSystemSettings() {
  try {
    // Try to get from Supabase table
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist, return defaults
      return {
        general: {
          siteName: 'Volturiano',
          logoUrl: '',
          locale: 'en',
          maintenanceMode: false,
          maintenanceMessage: ''
        },
        email: {
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpFrom: ''
        },
        features: {
          configurator: true,
          garage: true,
          sharing: true,
          analytics: true
        }
      };
    }

    if (data && data.settings) {
      return data.settings;
    }

    // Return defaults if no data
    return {
      general: {
        siteName: 'Volturiano',
        logoUrl: '',
        locale: 'en',
        maintenanceMode: false,
        maintenanceMessage: ''
      },
      email: {
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpFrom: ''
      },
      features: {
        configurator: true,
        garage: true,
        sharing: true,
        analytics: true
      }
    };
  } catch (err) {
    console.error('[settings] Error fetching settings:', err);
    // Return defaults on error
    return {
      general: {
        siteName: 'Volturiano',
        logoUrl: '',
        locale: 'en',
        maintenanceMode: false,
        maintenanceMessage: ''
      },
      email: {
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpFrom: ''
      },
      features: {
        configurator: true,
        garage: true,
        sharing: true,
        analytics: true
      }
    };
  }
}

/**
 * Update system settings
 * @param {object} settings - Settings object
 * @returns {Promise<object>}
 */
export async function updateSystemSettings(settings) {
  try {
    // Try to upsert to Supabase table
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'default',
        settings: settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error && error.code === '42P01') {
      // Table doesn't exist, just return the settings (could create table later)
      console.warn('[settings] system_settings table does not exist');
      return settings;
    }

    if (error) throw error;

    await logAdminAction('settings_updated', 'system_settings', 'default', {});
    return data?.settings || settings;
  } catch (err) {
    console.error('[settings] Error updating settings:', err);
    // Return the settings anyway (could be stored in localStorage as fallback)
    return settings;
  }
}

/**
 * Get roles with permissions
 * @returns {Promise<Array>}
 */
export async function getRoles() {
  try {
    // Query admin_permissions table
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('*');

    if (error && error.code === '42P01') {
      // Table doesn't exist, return defaults
      return getDefaultRoles();
    }

    if (error) throw error;

    // Group by role and count users
    const rolesMap = {};
    const roleCounts = {};

    // Get user counts per role
    const { data: profiles } = await supabase
      .from('profiles')
      .select('role');

    (profiles || []).forEach(profile => {
      const role = profile.role || 'user';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    // Group permissions by role
    (data || []).forEach(perm => {
      if (!rolesMap[perm.role]) {
        rolesMap[perm.role] = {
          role: perm.role,
          userCount: roleCounts[perm.role] || 0,
          permissions: []
        };
      }
      rolesMap[perm.role].permissions.push({
        resource: perm.resource,
        read: perm.read || false,
        write: perm.write || false,
        delete: perm.delete || false,
        publish: perm.publish || false
      });
    });

    return Object.values(rolesMap);
  } catch (err) {
    console.error('[settings] Error fetching roles:', err);
    return getDefaultRoles();
  }
}

function getDefaultRoles() {
  return [
    {
      role: 'super_admin',
      userCount: 0,
      permissions: [
        { resource: 'users', read: true, write: true, delete: true, publish: true },
        { resource: 'vehicles', read: true, write: true, delete: true, publish: true },
        { resource: 'manifests', read: true, write: true, delete: true, publish: true },
        { resource: 'options', read: true, write: true, delete: true, publish: true },
        { resource: 'settings', read: true, write: true, delete: true, publish: true },
        { resource: 'logs', read: true, write: false, delete: false, publish: false }
      ]
    },
    {
      role: 'content_admin',
      userCount: 0,
      permissions: [
        { resource: 'users', read: true, write: false, delete: false, publish: false },
        { resource: 'vehicles', read: true, write: true, delete: false, publish: true },
        { resource: 'manifests', read: true, write: true, delete: false, publish: true },
        { resource: 'options', read: true, write: true, delete: false, publish: true },
        { resource: 'settings', read: false, write: false, delete: false, publish: false },
        { resource: 'logs', read: true, write: false, delete: false, publish: false }
      ]
    },
    {
      role: 'support_admin',
      userCount: 0,
      permissions: [
        { resource: 'users', read: true, write: false, delete: false, publish: false },
        { resource: 'vehicles', read: true, write: false, delete: false, publish: false },
        { resource: 'manifests', read: true, write: false, delete: false, publish: false },
        { resource: 'options', read: true, write: false, delete: false, publish: false },
        { resource: 'settings', read: false, write: false, delete: false, publish: false },
        { resource: 'logs', read: true, write: false, delete: false, publish: false }
      ]
    }
  ];
}

/**
 * Update role permissions
 * @param {string} role - Role name
 * @param {Array} permissions - Permissions array
 * @returns {Promise<void>}
 */
export async function updateRolePermissions(role, permissions) {
  try {
    // Delete existing permissions for this role
    await supabase
      .from('admin_permissions')
      .delete()
      .eq('role', role);

    // Insert new permissions
    const permsToInsert = permissions.map(perm => ({
      role: role,
      resource: perm.resource,
      read: perm.read || false,
      write: perm.write || false,
      delete: perm.delete || false,
      publish: perm.publish || false
    }));

    const { error } = await supabase
      .from('admin_permissions')
      .insert(permsToInsert);

    if (error && error.code === '42P01') {
      console.warn('[settings] admin_permissions table does not exist');
      return;
    }

    if (error) throw error;

    await logAdminAction('role_permissions_updated', 'admin_permissions', role, { permissions });
  } catch (err) {
    console.error('[settings] Error updating role permissions:', err);
    throw err;
  }
}

/**
 * Assign role to user
 * @param {string} userId - User UUID
 * @param {string} role - Role name
 * @returns {Promise<void>}
 */
export async function assignRoleToUser(userId, role) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: role })
      .eq('id', userId);

    if (error) throw error;

    await logAdminAction('role_assigned', 'profiles', userId, { role });
  } catch (err) {
    console.error('[settings] Error assigning role:', err);
    throw err;
  }
}

/**
 * Send test email
 * @returns {Promise<void>}
 */
export async function sendTestEmail() {
  // This would call an Edge Function
  // For now, just log
  console.log('[settings] Test email would be sent');
}

