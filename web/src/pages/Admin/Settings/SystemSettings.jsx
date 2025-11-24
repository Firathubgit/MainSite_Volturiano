import React, { useEffect, useState } from 'react';
import { getSystemSettings, updateSystemSettings } from '../../../features/admin/api/adminService';
import AdminInput from '../../../features/admin/components/ui/AdminInput';
import AdminButton from '../../../features/admin/components/ui/AdminButton';
import AdminSelect from '../../../features/admin/components/ui/AdminSelect';
import AdminLoading from '../../../features/admin/components/ui/AdminLoading';
import { Save, Mail, Server, Sliders, Globe } from 'lucide-react';
import styles from './SystemSettings.module.css';

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    getSystemSettings().then(data => {
      setSettings(data);
      setLoading(false);
    }).catch(() => {
      // Default settings
      setSettings({
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
      });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if(!settings) return;
    setSaving(true);
    try {
      await updateSystemSettings(settings);
      alert('Settings saved successfully');
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (section, key, value) => {
    if(!settings) return;
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    });
  };

  if (loading || !settings) {
    return <AdminLoading fullScreen />;
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'email', label: 'Email (SMTP)', icon: Mail },
    { id: 'storage', label: 'Storage', icon: Server },
    { id: 'features', label: 'Feature Flags', icon: Sliders },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Settings</h1>
          <p className={styles.subtitle}>Configure global platform parameters.</p>
        </div>
        <AdminButton variant="primary" icon={Save} onClick={handleSave} loading={saving}>Save All Changes</AdminButton>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              >
                <Icon size={16} className={styles.tabIcon} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'general' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>General Configuration</h3>
              <div className={styles.form}>
                <AdminInput 
                  label="Site Name" 
                  value={settings.general.siteName || ''}
                  onChange={(e) => updateSection('general', 'siteName', e.target.value)}
                />
                <div className={styles.logoRow}>
                  <AdminInput 
                    label="Logo URL" 
                    value={settings.general.logoUrl || ''}
                    onChange={(e) => updateSection('general', 'logoUrl', e.target.value)}
                  />
                  <div className={styles.logoPreview}>
                    {settings.general.logoUrl && (
                      <img src={settings.general.logoUrl} alt="Preview" className={styles.logoImage} />
                    )}
                  </div>
                </div>
                <AdminSelect 
                  label="Default Locale"
                  value={settings.general.locale || 'en'}
                  onChange={(val) => updateSection('general', 'locale', val)}
                  options={[
                    {value: 'en', label: 'English'}, 
                    {value: 'sv', label: 'Swedish'}, 
                    {value: 'de', label: 'German'}
                  ]}
                />
                
                <div className={styles.maintenanceBox}>
                  <div className={styles.maintenanceHeader}>
                    <div>
                      <span className={styles.maintenanceTitle}>Maintenance Mode</span>
                      <span className={styles.maintenanceDesc}>Enable this to prevent non-admin users from accessing the site.</span>
                    </div>
                    <div 
                      className={`${styles.toggle} ${settings.general.maintenanceMode ? styles.toggleOn : ''}`}
                      onClick={() => updateSection('general', 'maintenanceMode', !settings.general.maintenanceMode)}
                    >
                      <div className={styles.toggleThumb}></div>
                    </div>
                  </div>
                  <textarea 
                    className={styles.maintenanceTextarea}
                    value={settings.general.maintenanceMessage || ''}
                    onChange={(e) => updateSection('general', 'maintenanceMessage', e.target.value)}
                    disabled={!settings.general.maintenanceMode}
                    placeholder="Maintenance message..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Email (SMTP)</h3>
              <div className={styles.form}>
                <div className={styles.formRow}>
                  <AdminInput 
                    label="SMTP Host" 
                    value={settings.email.smtpHost || ''}
                    onChange={(e) => updateSection('email', 'smtpHost', e.target.value)}
                  />
                  <AdminInput 
                    label="SMTP Port" 
                    type="number"
                    value={(settings.email.smtpPort || 587).toString()}
                    onChange={(e) => updateSection('email', 'smtpPort', parseInt(e.target.value) || 587)}
                  />
                </div>
                <div className={styles.formRow}>
                  <AdminInput 
                    label="Username" 
                    value={settings.email.smtpUser || ''}
                    onChange={(e) => updateSection('email', 'smtpUser', e.target.value)}
                  />
                  <AdminInput 
                    label="From Address" 
                    value={settings.email.smtpFrom || ''}
                    onChange={(e) => updateSection('email', 'smtpFrom', e.target.value)}
                  />
                </div>
                <div className={styles.testButton}>
                  <AdminButton variant="secondary" size="sm">Send Test Email</AdminButton>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'storage' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Storage & CDN</h3>
              <div className={styles.infoBox}>
                Storage configuration is managed via Supabase dashboard. These settings are read-only reflections of your current project environment.
              </div>
              <div className={styles.storageGrid}>
                <div className={styles.storageCard}>
                  <span className={styles.storageLabel}>Assets Bucket</span>
                  <span className={styles.storageValue}>volturiano-assets-prod</span>
                </div>
                <div className={styles.storageCard}>
                  <span className={styles.storageLabel}>CDN Region</span>
                  <span className={styles.storageValue}>eu-central-1</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Feature Flags</h3>
              <div className={styles.featuresList}>
                {Object.entries(settings.features || {}).map(([key, enabled]) => (
                  <div key={key} className={styles.featureItem}>
                    <div>
                      <span className={styles.featureName}>{key}</span>
                      <span className={styles.featureDesc}>Enable or disable the {key} module globally.</span>
                    </div>
                    <div 
                      className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`}
                      onClick={() => updateSection('features', key, !enabled)}
                    >
                      <div className={styles.toggleThumb}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
