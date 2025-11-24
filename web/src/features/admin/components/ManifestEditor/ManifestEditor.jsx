import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getManifestById as getManifestByIdService, updateManifest as updateManifestService, validateManifest as validateManifestService } from '../../api/adminService';
import LayerTree from './LayerTree';
import PropertiesPanel from './PropertiesPanel';
import VariantManager from './VariantManager';
import AdminButton from '../ui/AdminButton';
import AdminLoading from '../ui/AdminLoading';
import AdminLayout from '../AdminLayout/AdminLayout';
import { Save, Upload, Play, Download, CheckCircle, AlertOctagon, RotateCw, Monitor, X } from 'lucide-react';
import styles from './ManifestEditor.module.css';

export default function ManifestEditor({ manifestId: propManifestId, onClose }) {
  const { manifestId: routeManifestId } = useParams();
  const navigate = useNavigate();
  const manifestId = propManifestId || routeManifestId;
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  
  const [validationErrors, setValidationErrors] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [propsPanelWidth, setPropsPanelWidth] = useState(320);

  const pendingUpdates = useRef(null);
  const saveTimeout = useRef(null);

  useEffect(() => {
    setLoading(true);
    getManifestByIdService(manifestId).then(data => {
      // Transform database format to editor format
      const manifestData = data.data || data;
      setManifest({
        ...data,
        id: data.id,
        vehicleId: manifestData.vehicleId || manifestData.vehicleModel || data.slug,
        layers: manifestData.layers || [],
        variants: manifestData.variants || [],
        status: data.status || 'draft'
      });
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load manifest:', err);
      setLoading(false);
    });
  }, [manifestId]);

  useEffect(() => {
    if (manifest) {
      // Validate manifest - adapt to our validateManifest format
      validateManifestService(manifest).then(result => {
        setValidationErrors(result.errors || []);
      }).catch(() => {
        setValidationErrors([]);
      });
    }
  }, [manifest]);

  const handleSelectLayer = (id) => {
    if (id) setSelectedVariantId(null);
    setSelectedLayerId(id);
  };

  const handleSelectVariant = (id) => {
    if (id) setSelectedLayerId(null);
    setSelectedVariantId(id);
  };

  const updateLocalManifest = (updates) => {
    if (!manifest) return;
    const updatedManifest = { ...manifest, ...updates };
    setManifest(updatedManifest);
    
    pendingUpdates.current = { ...pendingUpdates.current, ...updates };
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    saveTimeout.current = setTimeout(() => {
      performSave();
    }, 2000); 
  };

  const performSave = async () => {
    if (!manifest || !pendingUpdates.current) return;
    
    setSaving(true);
    const updatesToSave = pendingUpdates.current;
    pendingUpdates.current = null;
    
    try {
      // Transform editor format back to database format
      const dbUpdates = {
        data: {
          ...manifest,
          vehicleId: manifest.vehicleId,
          layers: manifest.layers,
          variants: manifest.variants
        }
      };
      await updateManifestService(manifest.id, dbUpdates);
      
      const now = new Date();
      setLastSaved(now.toLocaleTimeString());
      setTimeout(() => setLastSaved(null), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    performSave();
  };

  const handleUpdateLayer = (layerId, updates) => {
    if (!manifest) return;
    const newLayers = manifest.layers.map(l => l.id === layerId ? { ...l, ...updates } : l);
    updateLocalManifest({ layers: newLayers });
  };

  const handleUpdateAllLayers = (newLayers) => {
    updateLocalManifest({ layers: newLayers });
  };

  const handleUpdateVariant = (variantId, updates) => {
    if (!manifest) return;
    const newVariants = manifest.variants.map(v => v.id === variantId ? { ...v, ...updates } : v);
    updateLocalManifest({ variants: newVariants });
  };

  const handleUpdateAllVariants = (newVariants) => {
    updateLocalManifest({ variants: newVariants });
  };

  const handleDeleteLayer = (id) => {
    if (!manifest) return;
    if(window.confirm('Delete this layer?')) {
      const newLayers = manifest.layers.filter(l => l.id !== id);
      updateLocalManifest({ layers: newLayers });
      setSelectedLayerId(null);
    }
  };

  const handleDeleteVariant = (id) => {
    if (!manifest) return;
    if(window.confirm('Delete this variant?')) {
      const newVariants = manifest.variants.filter(v => v.id !== id);
      updateLocalManifest({ variants: newVariants });
      setSelectedVariantId(null);
    }
  };

  const startResizing = useCallback((mouseDownEvent, panel) => {
    mouseDownEvent.preventDefault();
    const startX = mouseDownEvent.clientX;
    const startWidth = panel === 'left' ? sidebarWidth : propsPanelWidth;

    const doDrag = (dragEvent) => {
      if (panel === 'left') {
        setSidebarWidth(Math.max(200, Math.min(400, startWidth + (dragEvent.clientX - startX))));
      } else {
        setPropsPanelWidth(Math.max(300, Math.min(500, startWidth - (dragEvent.clientX - startX))));
      }
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth, propsPanelWidth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/admin/manifests');
    }
  };

  if (loading || !manifest) {
    return (
      <AdminLayout>
        <AdminLoading fullScreen text="Loading Manifest Editor..." />
      </AdminLayout>
    );
  }

  const selectedLayer = manifest.layers.find(l => l.id === selectedLayerId) || null;
  const selectedVariant = manifest.variants.find(v => v.id === selectedVariantId) || null;

  return (
    <AdminLayout>
      <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.titleRow}>
            <span className={styles.title}>Manifest Editor</span>
            <span className={styles.vehicleId}>{manifest.vehicleId}</span>
          </div>
          <div className={styles.statusBar}>
            {saving ? (
              <span className={styles.statusSaving}>
                <RotateCw size={12} className={styles.statusIcon} /> Saving...
              </span>
            ) : lastSaved ? (
              <span className={styles.statusSaved}>
                <CheckCircle size={12} className={styles.statusIcon} /> Saved
              </span>
            ) : validationErrors.length > 0 ? (
              <span className={styles.statusError}>
                <AlertOctagon size={12} className={styles.statusIcon} /> {validationErrors.length} Errors
              </span>
            ) : (
              <span className={styles.statusDraft}>Draft</span>
            )}
          </div>
        </div>
        
        <div className={styles.toolbarRight}>
          <AdminButton size="sm" variant="ghost" icon={Download}>Export JSON</AdminButton>
          <AdminButton size="sm" variant="secondary" icon={Play}>Preview</AdminButton>
          <AdminButton size="sm" variant="primary" icon={Save} onClick={handleManualSave} loading={saving}>Save</AdminButton>
          <AdminButton size="sm" variant="primary" icon={Upload} className={styles.publishButton}>Publish</AdminButton>
          <button onClick={handleClose} className={styles.closeButton}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className={styles.editor}>
        <div style={{ width: sidebarWidth }} className={styles.sidebar}>
          <LayerTree 
            layers={manifest.layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={handleSelectLayer}
            onReorderLayers={handleUpdateAllLayers}
            onToggleVisibility={(id) => {
              const l = manifest.layers.find(x => x.id === id);
              if(l) handleUpdateLayer(id, { visible: !l.visible });
            }}
          />
        </div>

        <div 
          className={styles.resizer}
          onMouseDown={(e) => startResizing(e, 'left')}
        />

        <div className={styles.main}>
          <div className={styles.preview}>
            <div className={styles.previewControls}>
              <div className={styles.angleSelector}>
                <button className={styles.angleButtonActive}>
                  <Monitor size={14} />
                </button>
                <button className={styles.angleButton}>Front</button>
                <button className={styles.angleButton}>Side</button>
              </div>
            </div>

            <div className={styles.previewCanvas}>
              <div className={styles.previewPlaceholder}>
                <p className={styles.previewText}>Composite Preview</p>
                {selectedVariant && Object.values(selectedVariant.assets || {})[0] && (
                  <img 
                    src={Object.values(selectedVariant.assets)[0]} 
                    className={styles.previewImage}
                    alt="Preview"
                  />
                )}
                <div className={styles.layerIndicators}>
                  {manifest.layers.filter(l => l.visible).map((l, i) => (
                    <div 
                      key={l.id} 
                      className={styles.layerIndicator}
                      style={{ transform: `translate(-50%, -50%) scale(${1 + i * 0.2})` }}
                    >
                      {l.id}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.variantSection}>
            <VariantManager 
              variants={manifest.variants}
              onUpdateVariants={handleUpdateAllVariants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={handleSelectVariant}
            />
          </div>
        </div>

        <div 
          className={styles.resizer}
          onMouseDown={(e) => startResizing(e, 'right')}
        />

        <div style={{ width: propsPanelWidth }} className={styles.propsPanel}>
          <PropertiesPanel 
            selectedLayer={selectedLayer}
            selectedVariant={selectedVariant}
            allLayers={manifest.layers}
            allVariants={manifest.variants}
            onUpdateLayer={handleUpdateLayer}
            onUpdateVariant={handleUpdateVariant}
            onDeleteLayer={handleDeleteLayer}
            onDeleteVariant={handleDeleteVariant}
            onUpdateAllLayers={handleUpdateAllLayers}
          />
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

