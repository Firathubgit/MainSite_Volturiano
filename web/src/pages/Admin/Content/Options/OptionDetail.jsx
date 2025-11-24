import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOptionById, updateOption, deleteOption, getVehicles, getOptions } from '../../../../features/admin/api/adminService';
import { Save, Trash2, ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import AdminLayout from '../../../../features/admin/components/AdminLayout/AdminLayout';
import AdminInput from '../../../../features/admin/components/ui/AdminInput';
import AdminSelect from '../../../../features/admin/components/ui/AdminSelect';
import AdminButton from '../../../../features/admin/components/ui/AdminButton';
import AdminLoading from '../../../../features/admin/components/ui/AdminLoading';
import AdminModal from '../../../../features/admin/components/ui/AdminModal';
import styles from './OptionDetail.module.css';

export default function OptionDetail() {
  const navigate = useNavigate();
  const { optionId } = useParams();
  const [option, setOption] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availableOptions, setAvailableOptions] = useState([]);
  const [showDepModal, setShowDepModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [opt, vehs] = await Promise.all([
          getOptionById(optionId),
          getVehicles()
        ]);
        setOption(opt);
        setVehicles(vehs || []);
        
        if (opt) {
          const opts = await getOptions({ vehicleId: opt.vehicleId });
          setAvailableOptions((opts || []).filter(o => o.id !== opt.id));
        }
      } catch (err) {
        console.error('Failed to load option:', err);
      } finally {
        setLoading(false);
      }
    };
    if (optionId) fetchData();
  }, [optionId]);

  const handleSave = async () => {
    if (!option) return;
    setSaving(true);
    try {
      await updateOption(option.id, option);
      navigate('/admin/content/options');
    } catch (e) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!option) return;
    if (window.confirm('Are you sure you want to delete this option?')) {
      try {
        await deleteOption(option.id);
        navigate('/admin/content/options');
      } catch (e) {
        alert('Failed to delete');
      }
    }
  };

  const handleUpload = async (file) => {
    if (!option) return;
    setUploading(true);
    try {
      // TODO: Implement uploadAsset
      const url = URL.createObjectURL(file);
      setOption({ ...option, mediaUrl: url });
    } catch (e) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !option) {
    return (
      <AdminLayout>
        <AdminLoading fullScreen />
      </AdminLayout>
    );
  }

  const vehicleName = vehicles.find(v => v.id === option.vehicleId)?.name || option.vehicleId;

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
          <h1 className={styles.title}>Edit Option</h1>
          <p className={styles.subtitle}>Update configuration details for {option.code}.</p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.main}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>
            
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Vehicle</label>
                <div className={styles.readOnly}>{vehicleName}</div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Code</label>
                <div className={styles.readOnlyCode}>{option.code}</div>
              </div>
            </div>

            <AdminInput 
              label="Label" 
              value={option.label || ''} 
              onChange={(e) => setOption({...option, label: e.target.value})}
              required
            />

            <div className={styles.textareaField}>
              <label className={styles.fieldLabel}>Description</label>
              <textarea 
                className={styles.textarea}
                value={option.description || ''}
                onChange={(e) => setOption({...option, description: e.target.value})}
              />
            </div>

            <div className={styles.row}>
              <AdminInput 
                label="Category" 
                value={option.category || ''} 
                onChange={(e) => setOption({...option, category: e.target.value})}
                required
              />
              <div className={styles.checkboxField}>
                <label className={styles.fieldLabel}>Configurator</label>
                <div className={styles.checkboxRow}>
                  <input 
                    type="checkbox" 
                    id="visible"
                    checked={option.configuratorVisible || false}
                    onChange={(e) => setOption({...option, configuratorVisible: e.target.checked})}
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
                value={(option.priceCents || 0).toString()} 
                onChange={(e) => setOption({...option, priceCents: parseInt(e.target.value) || 0})}
              />
              <AdminSelect
                label="Currency"
                value={option.currency || 'EUR'}
                onChange={(val) => setOption({...option, currency: val})}
                options={[
                  {value: 'EUR', label: 'EUR (€)'}, 
                  {value: 'USD', label: 'USD ($)'}, 
                  {value: 'GBP', label: 'GBP (£)'}
                ]}
              />
            </div>
            <div className={styles.priceDisplay}>
              <span className={styles.priceLabel}>Formatted Display:</span>
              <span className={styles.priceValue}>
                {new Intl.NumberFormat('en-IE', { style: 'currency', currency: option.currency || 'EUR' }).format((option.priceCents || 0) / 100)}
              </span>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Dependencies</h3>
              <AdminButton size="sm" variant="secondary" onClick={() => setShowDepModal(true)}>+ Add Dependency</AdminButton>
            </div>
            
            {(!option.dependencies || option.dependencies.length === 0) ? (
              <p className={styles.empty}>No dependencies configured.</p>
            ) : (
              <div className={styles.dependencies}>
                {option.dependencies.map(depCode => (
                  <div key={depCode} className={styles.dependency}>
                    <span className={styles.depCode}>{depCode}</span>
                    <button 
                      onClick={() => setOption({...option, dependencies: (option.dependencies || []).filter(d => d !== depCode)})}
                      className={styles.removeDep}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.section}>
            <h3 className={styles.sidebarTitle}>Media</h3>
            <div className={styles.mediaPreview}>
              {option.mediaUrl ? (
                <img src={option.mediaUrl} alt="Preview" className={styles.mediaImage} />
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
                value={option.mediaUrl || ''} 
                onChange={(e) => setOption({...option, mediaUrl: e.target.value})}
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
              Save Changes
            </AdminButton>
            <AdminButton variant="danger" icon={Trash2} className={styles.actionButton} onClick={handleDelete}>
              Delete Option
            </AdminButton>
          </div>
        </div>
      </div>
      
      <AdminModal
        open={showDepModal}
        onClose={() => setShowDepModal(false)}
        title="Add Dependency"
        size="md"
      >
        <div className={styles.depModal}>
          <p className={styles.depModalText}>Select options that are required for this option.</p>
          {availableOptions.map(opt => (
            <div 
              key={opt.code} 
              className={styles.depOption}
              onClick={() => {
                if(!(option.dependencies || []).includes(opt.code)) {
                  setOption({...option, dependencies: [...(option.dependencies || []), opt.code]});
                }
                setShowDepModal(false);
              }}
            >
              <span className={styles.depOptionLabel}>{opt.label}</span>
              <span className={styles.depOptionCode}>{opt.code}</span>
            </div>
          ))}
        </div>
      </AdminModal>
      </div>
    </AdminLayout>
  );
}

