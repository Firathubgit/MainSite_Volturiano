import React, { useState } from 'react';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import AdminCard from '../../../features/admin/components/ui/AdminCard';
import AdminInput from '../../../features/admin/components/ui/AdminInput';
import AdminButton from '../../../features/admin/components/ui/AdminButton';
import styles from './SystemSettings.module.css';

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    siteName: 'VOLTURIANO',
    defaultLocale: 'en',
    maintenanceMode: false
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // In a real implementation, this would save to a settings table
    setTimeout(() => {
      setSaving(false);
      alert('Settings saved (implementation pending)');
    }, 500);
  };

  return (
    <AdminLayout>
      <div className={styles.settings}>
        <h1 className={styles.title}>System Settings</h1>

        <AdminCard title="General Settings">
          <div className={styles.form}>
            <AdminInput
              label="Site Name"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            />
            <AdminInput
              label="Default Locale"
              value={settings.defaultLocale}
              onChange={(e) => setSettings({ ...settings, defaultLocale: e.target.value })}
            />
            <div className={styles.checkboxWrapper}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                />
                <span>Maintenance Mode</span>
              </label>
            </div>
            <div className={styles.formActions}>
              <AdminButton onClick={handleSave} loading={saving}>
                Save Settings
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}



