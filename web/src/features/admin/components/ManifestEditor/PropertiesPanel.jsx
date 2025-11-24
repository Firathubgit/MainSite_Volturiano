import React, { useState } from 'react';
import { Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';
import AdminInput from '../ui/AdminInput';
import AdminSelect from '../ui/AdminSelect';
import AdminButton from '../ui/AdminButton';
import AdminModal from '../ui/AdminModal';
import DependencyMatrix from './DependencyMatrix';
import styles from './PropertiesPanel.module.css';

export default function PropertiesPanel({
  selectedLayer,
  selectedVariant,
  allLayers,
  allVariants,
  onUpdateLayer,
  onUpdateVariant,
  onDeleteLayer,
  onDeleteVariant,
  onUpdateAllLayers
}) {
  const [showDepMatrix, setShowDepMatrix] = useState(false);
  const [uploadingAngle, setUploadingAngle] = useState(null);

  const layerTypes = [
    { value: 'base', label: 'Base Mesh' },
    { value: 'paint', label: 'Paint' },
    { value: 'wheels', label: 'Wheels' },
    { value: 'decals', label: 'Decals' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'interior', label: 'Interior' },
  ];

  const categoryOptions = Array.from(new Set(allVariants.map(v => v.category))).map(c => ({ value: c, label: c }));
  ['paint', 'wheels', 'interior', 'trim'].forEach(c => {
    if (!categoryOptions.find(o => o.value === c)) categoryOptions.push({ value: c, label: c });
  });

  const handleAssetUpload = async (file, angle) => {
    if (!selectedVariant) return;
    setUploadingAngle(angle);
    try {
      // TODO: Implement uploadAsset in adminService
      // const url = await uploadAsset(file);
      // For now, create a local URL
      const url = URL.createObjectURL(file);
      const newAssets = { ...selectedVariant.assets, [angle]: url };
      onUpdateVariant(selectedVariant.id, { assets: newAssets });
    } catch (e) {
      console.error("Upload failed", e);
      alert("Upload failed");
    } finally {
      setUploadingAngle(null);
    }
  };

  const removeAsset = (angle) => {
    if (!selectedVariant) return;
    const newAssets = { ...selectedVariant.assets };
    delete newAssets[angle];
    onUpdateVariant(selectedVariant.id, { assets: newAssets });
  };

  if (selectedLayer) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Layer Properties</h3>
          <p className={styles.id}>{selectedLayer.id}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Identity</h4>
            <AdminInput
              label="Layer Label"
              value={selectedLayer.label || ''}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { label: e.target.value })}
            />
            <AdminSelect
              label="Type"
              value={selectedLayer.type}
              onChange={(val) => onUpdateLayer(selectedLayer.id, { type: val })}
              options={layerTypes}
            />
            <AdminInput
              label="Z-Index"
              type="number"
              value={selectedLayer.zIndex.toString()}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { zIndex: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>Dependencies</h4>
              <button onClick={() => setShowDepMatrix(true)} className={styles.manageButton}>
                Manage Matrix
              </button>
            </div>
            <div className={styles.dependencies}>
              {(!selectedLayer.dependencies || selectedLayer.dependencies.length === 0) && (
                <span className={styles.none}>None</span>
              )}
              {(selectedLayer.dependencies || []).map(depId => (
                <span key={depId} className={styles.dependencyTag}>
                  {depId}
                  <button 
                    onClick={() => {
                      const newDeps = (selectedLayer.dependencies || []).filter(d => d !== depId);
                      onUpdateLayer(selectedLayer.id, { dependencies: newDeps });
                    }}
                    className={styles.removeButton}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <AdminButton variant="danger" size="sm" icon={Trash2} onClick={() => onDeleteLayer(selectedLayer.id)} className={styles.deleteButton}>
            Delete Layer
          </AdminButton>
        </div>

        <AdminModal
          open={showDepMatrix}
          onClose={() => setShowDepMatrix(false)}
          title="Layer Dependency Matrix"
          size="xl"
          closeOnOverlayClick={false}
        >
          <DependencyMatrix 
            layers={allLayers} 
            onUpdateLayers={(updatedLayers) => {
              if (onUpdateAllLayers) onUpdateAllLayers(updatedLayers);
            }} 
            onClose={() => setShowDepMatrix(false)} 
          />
        </AdminModal>
      </div>
    );
  }

  if (selectedVariant) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Variant Properties</h3>
          <p className={styles.id}>{selectedVariant.id}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <AdminInput
              label="Label"
              value={selectedVariant.label}
              onChange={(e) => onUpdateVariant(selectedVariant.id, { label: e.target.value })}
            />
            <AdminSelect
              label="Category"
              value={selectedVariant.category}
              onChange={(val) => onUpdateVariant(selectedVariant.id, { category: val })}
              options={categoryOptions}
            />
            <div className={styles.checkboxRow}>
              <input 
                type="checkbox" 
                id="isDefault" 
                checked={selectedVariant.isDefault || false} 
                onChange={(e) => onUpdateVariant(selectedVariant.id, { isDefault: e.target.checked })}
                className={styles.checkbox}
              />
              <label htmlFor="isDefault" className={styles.checkboxLabel}>Set as Category Default</label>
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Rules</h4>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Dependencies</label>
              <AdminSelect
                value={selectedVariant.dependencies || []}
                onChange={(val) => onUpdateVariant(selectedVariant.id, { dependencies: val })}
                options={allVariants.filter(v => v.id !== selectedVariant.id).map(v => ({ value: v.id, label: v.id }))}
                multiple
                searchable
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Incompatibilities</label>
              <AdminSelect
                value={selectedVariant.incompatibilities || []}
                onChange={(val) => onUpdateVariant(selectedVariant.id, { incompatibilities: val })}
                options={allVariants.filter(v => v.id !== selectedVariant.id).map(v => ({ value: v.id, label: v.id }))}
                multiple
                searchable
              />
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Assets</h4>
            {['front', 'side', 'back', 'top'].map(angle => (
              <div key={angle} className={styles.assetRow}>
                <div className={styles.assetHeader}>
                  <span className={styles.angleLabel}>{angle}</span>
                  {uploadingAngle === angle && <span className={styles.uploading}>Uploading...</span>}
                </div>
                <div className={styles.assetContent}>
                  {selectedVariant.assets && selectedVariant.assets[angle] ? (
                    <div className={styles.assetPreview}>
                      <img src={selectedVariant.assets[angle]} className={styles.assetImage} alt={angle} />
                      <button onClick={() => removeAsset(angle)} className={styles.removeAssetButton}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className={styles.assetPlaceholder}>
                      <ImageIcon size={16} />
                    </div>
                  )}
                  <div className={styles.assetInput}>
                    <AdminInput 
                      value={selectedVariant.assets && selectedVariant.assets[angle] ? selectedVariant.assets[angle] : ''} 
                      onChange={(e) => {
                        const newAssets = { ...(selectedVariant.assets || {}), [angle]: e.target.value };
                        onUpdateVariant(selectedVariant.id, { assets: newAssets });
                      }}
                      className={styles.urlInput}
                      placeholder="URL..."
                    />
                    <div className={styles.uploadButton}>
                      <input 
                        type="file" 
                        id={`file-${angle}`} 
                        className={styles.fileInput} 
                        accept="image/*" 
                        onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], angle)} 
                      />
                      <label htmlFor={`file-${angle}`} className={styles.uploadLabel}>
                        <Upload size={10} /> Upload
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <AdminButton variant="danger" size="sm" icon={Trash2} onClick={() => onDeleteVariant(selectedVariant.id)} className={styles.deleteButton}>
            Delete Variant
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <div className={styles.emptyDot}></div>
        <div className={styles.emptyDot}></div>
      </div>
      <p className={styles.emptyTitle}>No Selection</p>
      <p className={styles.emptyText}>Select a Layer from the tree or a Variant from the manager to edit properties.</p>
    </div>
  );
}

