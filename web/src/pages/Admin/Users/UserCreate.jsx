import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminCard from '../../../features/admin/components/ui/AdminCard';
import AdminInput from '../../../features/admin/components/ui/AdminInput';
import AdminSelect from '../../../features/admin/components/ui/AdminSelect';
import AdminButton from '../../../features/admin/components/ui/AdminButton';
import { createUser } from '../../../features/admin/api/users';
import styles from './UserCreate.module.css';

export default function UserCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    display_name: '',
    role: 'user',
    send_welcome_email: false
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      const result = await createUser(formData);
      navigate(`/admin/users/${result.user?.id || ''}`);
    } catch (error) {
      console.error('[UserCreate] Error creating user:', error);
      alert('Failed to create user: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.userCreate}>
        <div className={styles.header}>
          <AdminButton variant="secondary" onClick={() => navigate('/admin/users')}>
            ← Back to Users
          </AdminButton>
        </div>

        <AdminCard title="Create New User">
          <form onSubmit={handleSubmit} className={styles.form}>
            <AdminInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
              required
            />

            <AdminInput
              label="Display Name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              helperText="Optional display name for the user"
            />

            <AdminSelect
              label="Role"
              value={formData.role}
              onChange={(e) => {
                setFormData({ ...formData, role: e.target.value });
                setErrors({ ...errors, role: '' });
              }}
              options={[
                { value: 'user', label: 'User' },
                { value: 'support_admin', label: 'Support Admin' },
                { value: 'content_admin', label: 'Content Admin' },
                { value: 'super_admin', label: 'Super Admin' }
              ]}
              error={errors.role}
              required
            />

            <div className={styles.checkboxWrapper}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.send_welcome_email}
                  onChange={(e) => setFormData({ ...formData, send_welcome_email: e.target.checked })}
                />
                <span>Send welcome email</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <AdminButton type="submit" loading={saving}>
                Create User
              </AdminButton>
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => navigate('/admin/users')}
              >
                Cancel
              </AdminButton>
            </div>
          </form>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}






















