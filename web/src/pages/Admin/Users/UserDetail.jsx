import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminCard from '../../../features/admin/components/ui/AdminCard';
import AdminInput from '../../../features/admin/components/ui/AdminInput';
import AdminSelect from '../../../features/admin/components/ui/AdminSelect';
import AdminButton from '../../../features/admin/components/ui/AdminButton';
import AdminModal from '../../../features/admin/components/ui/AdminModal';
import { getUserById, updateUser, deleteUser } from '../../../features/admin/api/users';
import { supabase } from '../../../lib/supabaseClient';
import styles from './UserDetail.module.css';

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    role: 'user',
    avatar_url: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const userData = await getUserById(userId);
      setUser(userData);
      setFormData({
        display_name: userData.display_name || '',
        role: userData.role || 'user',
        avatar_url: userData.avatar_url || ''
      });
    } catch (error) {
      console.error('[UserDetail] Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUser(userId, formData);
      setEditing(false);
      fetchUser();
    } catch (error) {
      console.error('[UserDetail] Error updating user:', error);
      alert('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(userId);
      navigate('/admin/users');
    } catch (error) {
      console.error('[UserDetail] Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleResetPassword = async () => {
    // This would typically call an Edge Function to send password reset email
    alert('Password reset email functionality to be implemented');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.userDetail}>
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className={styles.userDetail}>
          <p>User not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.userDetail}>
        <div className={styles.header}>
          <AdminButton variant="secondary" onClick={() => navigate('/admin/users')}>
            ← Back to Users
          </AdminButton>
          {!editing && (
            <AdminButton onClick={() => setEditing(true)}>
              Edit User
            </AdminButton>
          )}
        </div>

        <div className={styles.content}>
          <AdminCard title="User Profile">
            {editing ? (
              <div className={styles.form}>
                <AdminInput
                  label="Email"
                  value={user.email || 'N/A'}
                  disabled
                  helperText="Email cannot be changed"
                />
                <AdminInput
                  label="Display Name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                />
                <AdminSelect
                  label="Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  options={[
                    { value: 'user', label: 'User' },
                    { value: 'support_admin', label: 'Support Admin' },
                    { value: 'content_admin', label: 'Content Admin' },
                    { value: 'super_admin', label: 'Super Admin' }
                  ]}
                />
                <AdminInput
                  label="Avatar URL"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                />
                <div className={styles.formActions}>
                  <AdminButton onClick={handleSave} loading={saving}>
                    Save Changes
                  </AdminButton>
                  <AdminButton variant="secondary" onClick={() => {
                    setEditing(false);
                    setFormData({
                      display_name: user.display_name || '',
                      role: user.role || 'user',
                      avatar_url: user.avatar_url || ''
                    });
                  }}>
                    Cancel
                  </AdminButton>
                </div>
              </div>
            ) : (
              <div className={styles.profileInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Email:</span>
                  <span className={styles.value}>{user.email || 'N/A'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Display Name:</span>
                  <span className={styles.value}>{user.display_name || 'N/A'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Role:</span>
                  <span className={styles.value}>{user.role || 'user'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Created At:</span>
                  <span className={styles.value}>
                    {user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Updated At:</span>
                  <span className={styles.value}>
                    {user.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </AdminCard>

          <AdminCard title="Statistics">
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Garage Items:</span>
                <span className={styles.statValue}>{user.garageItemsCount || 0}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Configurations:</span>
                <span className={styles.statValue}>{user.configurationsCount || 0}</span>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Actions">
            <div className={styles.actionButtons}>
              <AdminButton variant="secondary" onClick={handleResetPassword}>
                Reset Password
              </AdminButton>
              <AdminButton variant="danger" onClick={() => setShowDeleteModal(true)}>
                Delete User
              </AdminButton>
            </div>
          </AdminCard>
        </div>

        <AdminModal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete User"
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </AdminButton>
              <AdminButton variant="danger" onClick={handleDelete}>
                Delete
              </AdminButton>
            </>
          }
        >
          <p>Are you sure you want to delete this user? This action cannot be undone.</p>
        </AdminModal>
      </div>
    </AdminLayout>
  );
}





















