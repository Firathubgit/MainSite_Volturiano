import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOption, getVehicles } from '../../../../features/admin/api/adminService';
import { Save, ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';
import AdminLayout from '../../../../features/admin/components/AdminLayout/AdminLayout';
import AdminInput from '../../../../features/admin/components/ui/AdminInput';
import AdminSelect from '../../../../features/admin/components/ui/AdminSelect';
import AdminButton from '../../../../features/admin/components/ui/AdminButton';
import styles from './OptionCreate.module.css';

export default function OptionCreate() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    label: '',
    code: '',
    category: 'paint',
    priceCents: 0,
    currency: 'EUR',
    configuratorVisible: true,
    dependencies: [],
    mediaUrl: '',
    vehicleId: ''
  });

  useEffect(() => {
    getVehicles().then(data => {
      setVehicles(data || []);
      if(data && data.length > 0 && !formData.vehicleId) {
        setFormData(prev => ({ ...prev, vehicleId: data[0].id }));
      }
    }).catch(() => setVehicles([]));
  }, []);

  const handleSave = async () => {
    if (!formData.code || !formData.label || !formData.vehicleId) {
      alert("Please fill required fields");
      return;
    }
    setSaving(true);
    try {
      await createOption(formData);
      navigate('/admin/content/options');
    } catch (e) {
      alert('Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      // TODO: Implement uploadAsset
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, mediaUrl: url }));
    } catch (e) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={() => navigate('/admin/content/options')} 
          className={styles.backButton}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className={styles.title}>Create Option</h1>
          <p className={styles.subtitle}>Add a new configuration option.</p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.main}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>
            
            <div className={styles.row}>
              <AdminSelect
                label="Vehicle"
                value={formData.vehicleId || ''}
                onChange={(val) => setFormData({...formData, vehicleId: val})}
                options={vehicles.map(v => ({ value: v.id, label: v.name }))}
                required
              />
              <AdminInput 
                label="Code" 
                value={formData.code || ''} 
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="e.g. paint_red_001"
                required
              />
            </div>

            <AdminInput 
              label="Label" 
              value={formData.label || ''} 
              onChange={(e) => setFormData({...formData, label: e.target.value})}
              required
            />

            <div className={styles.textareaField}>
              <label className={styles.fieldLabel}>Description</label>
              <textarea 
                className={styles.textarea}
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className={styles.row}>
              <AdminInput 
                label="Category" 
                value={formData.category || ''} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
              />
              <div className={styles.checkboxField}>
                <label className={styles.fieldLabel}>Configurator</label>
                <div className={styles.checkboxRow}>
                  <input 
                    type="checkbox" 
                    id="visible"
                    checked={formData.configuratorVisible}
                    onChange={(e) => setFormData({...formData, configuratorVisible: e.target.checked})}
                    className={styles.checkbox}
                  />
                  <label htmlFor="visible" className={styles.checkboxLabel}>Visible to users</label>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Pricing</h3>
            <div className={styles.row}>
              <AdminInput 
                label="Price (Cents)" 
                type="number"
                value={(formData.priceCents || 0).toString()} 
                onChange={(e) => setFormData({...formData, priceCents: parseInt(e.target.value) || 0})}
              />
              <AdminSelect
                label="Currency"
                value={formData.currency || 'EUR'}
                onChange={(val) => setFormData({...formData, currency: val})}
                options={[
                  {value: 'EUR', label: 'EUR (€)'}, 
                  {value: 'USD', label: 'USD ($)'}, 
                  {value: 'GBP', label: 'GBP (£)'}
                ]}
              />
            </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.section}>
            <h3 className={styles.sidebarTitle}>Media</h3>
            <div className={styles.mediaPreview}>
              {formData.mediaUrl ? (
                <img src={formData.mediaUrl} alt="Preview" className={styles.mediaImage} />
              ) : (
                <div className={styles.mediaPlaceholder}>
                  <ImageIcon size={32} />
                  <span>No image</span>
                </div>
              )}
              {uploading && (
                <div className={styles.uploadingOverlay}>
                  <span>Uploading...</span>
                </div>
              )}
            </div>
            <div className={styles.mediaInput}>
              <AdminInput 
                value={formData.mediaUrl || ''} 
                onChange={(e) => setFormData({...formData, mediaUrl: e.target.value})}
                placeholder="https://..."
                className={styles.urlInput}
              />
              <div className={styles.uploadButton}>
                <input type="file" className={styles.fileInput} id="opt-upload" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <label htmlFor="opt-upload" className={styles.uploadLabel}>
                  <Upload size={16} />
                </label>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sidebarTitle}>Actions</h3>
            <AdminButton variant="primary" icon={Save} className={styles.actionButton} onClick={handleSave} loading={saving}>
              Create Option
            </AdminButton>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

