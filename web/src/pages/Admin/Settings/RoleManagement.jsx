import React, { useEffect, useState } from 'react';
import { getRoles, updateRolePermissions, assignRoleToUser } from '../../../features/admin/api/adminService';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminLoading from '../../../features/admin/components/ui/AdminLoading';
import AdminButton from '../../../features/admin/components/ui/AdminButton';
import AdminSelect from '../../../features/admin/components/ui/AdminSelect';
import { Shield, Check, X, Save } from 'lucide-react';
import styles from './RoleManagement.module.css';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getRoles().then(data => {
      setRoles(data || []);
      setLoading(false);
    }).catch(() => {
      setRoles([]);
      setLoading(false);
    });
  }, []);

  const handleTogglePermission = (resource, action) => {
    const newRoles = [...roles];
    const role = newRoles[activeRoleIndex];
    const permission = role.permissions.find(p => p.resource === resource);
    if (permission) {
      permission[action] = !permission[action];
      setRoles(newRoles);
    }
  };

  const handleSave = async () => {
    try {
      await updateRolePermissions(roles[activeRoleIndex].role, roles[activeRoleIndex].permissions);
      alert('Permissions saved successfully');
    } catch (err) {
      alert('Failed to save permissions');
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUserId) return;
    try {
      await assignRoleToUser(selectedUserId, roles[activeRoleIndex].role);
      alert('Role assigned successfully');
      setSelectedUserId('');
    } catch (err) {
      alert('Failed to assign role');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <AdminLoading fullScreen />
      </AdminLayout>
    );
  }

  const activeRole = roles[activeRoleIndex];

  if (!activeRole) {
    return (
      <AdminLayout>
        <div className={styles.empty}>No roles found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Role Management</h1>
          <p className={styles.subtitle}>Configure RBAC permissions for administrative access.</p>
        </div>
        <AdminButton variant="primary" icon={Save} onClick={handleSave}>Save Permissions</AdminButton>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Defined Roles</h3>
          {roles.map((def, idx) => (
            <button
              key={def.role}
              onClick={() => setActiveRoleIndex(idx)}
              className={`${styles.roleButton} ${idx === activeRoleIndex ? styles.roleButtonActive : ''}`}
            >
              <div className={styles.roleHeader}>
                <Shield size={14} />
                {def.role}
              </div>
              <div className={styles.roleCount}>{def.userCount} assigned users</div>
            </button>
          ))}
        </div>

        <div className={styles.matrix}>
          <h3 className={styles.matrixTitle}>
            <Shield size={20} className={styles.matrixIcon} />
            Permissions: {activeRole.role}
          </h3>
          
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.tableHeader}>Resource</th>
                  <th className={styles.tableHeaderCenter}>Read</th>
                  <th className={styles.tableHeaderCenter}>Write</th>
                  <th className={styles.tableHeaderCenter}>Delete</th>
                  <th className={styles.tableHeaderCenter}>Publish</th>
                </tr>
              </thead>
              <tbody>
                {activeRole.permissions.map((perm) => (
                  <tr key={perm.resource} className={styles.tableRow}>
                    <td className={styles.resourceCell}>{perm.resource}</td>
                    {['read', 'write', 'delete', 'publish'].map(action => (
                      <td key={action} className={styles.actionCell}>
                        <div 
                          className={`${styles.checkbox} ${perm[action] ? styles.checkboxChecked : ''}`}
                          onClick={() => handleTogglePermission(perm.resource, action)}
                        >
                          {perm[action] ? <Check size={12} strokeWidth={4} /> : <X size={12} />}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.assignSection}>
            <h4 className={styles.assignTitle}>Assign Role to User</h4>
            <div className={styles.assignControls}>
              <div className={styles.userSelect}>
                <AdminSelect 
                  value={selectedUserId}
                  onChange={(val) => setSelectedUserId(val)}
                  options={users.map(u => ({ value: u.id, label: u.email }))}
                  placeholder="Select user..."
                  searchable
                />
              </div>
              <AdminButton variant="secondary" onClick={handleAssignRole}>Assign {activeRole.role}</AdminButton>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

