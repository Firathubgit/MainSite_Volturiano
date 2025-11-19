import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import styles from './FilterPresets.module.css';

/**
 * FilterPresets component - displays saved filter presets and allows saving/loading/deleting
 */
export default function FilterPresets() {
  const { t } = useTranslation('account');
  const { 
    filters, 
    loadFilterPresets, 
    saveFilterPreset, 
    applyFilterPreset, 
    deleteFilterPreset,
    getDefaultPresets 
  } = useGarageStore();
  
  const [presets, setPresets] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Load presets on mount
  useEffect(() => {
    const savedPresets = loadFilterPresets();
    const defaultPresets = getDefaultPresets();
    setPresets([...defaultPresets, ...savedPresets]);
  }, [loadFilterPresets, getDefaultPresets]);

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      return;
    }
    
    saveFilterPreset(presetName.trim());
    const savedPresets = loadFilterPresets();
    const defaultPresets = getDefaultPresets();
    setPresets([...defaultPresets, ...savedPresets]);
    
    setPresetName('');
    setShowSaveModal(false);
  };

  const handleApplyPreset = (presetId) => {
    applyFilterPreset(presetId);
  };

  const handleDeletePreset = (presetId, e) => {
    e.stopPropagation();
    if (window.confirm(t('garage.filters.deletePreset') + '?')) {
      deleteFilterPreset(presetId);
      const savedPresets = loadFilterPresets();
      const defaultPresets = getDefaultPresets();
      setPresets([...defaultPresets, ...savedPresets]);
    }
  };

  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (action === 'save') {
        handleSavePreset();
      } else if (action === 'cancel') {
        setShowSaveModal(false);
        setPresetName('');
      }
    }
  };

  // Check if current filters match any preset
  const hasActiveFilters = 
    filters.state || 
    filters.model || 
    filters.search || 
    filters.dateRange || 
    filters.priceMin || 
    filters.priceMax || 
    (filters.tags && filters.tags.length > 0) ||
    filters.sortBy !== 'created_at' ||
    filters.sortOrder !== 'desc';

  return (
    <div className={styles.filterPresets}>
      <div className={styles.presetsHeader}>
        <label className={styles.presetsLabel}>
          {t('garage.filters.presets')}
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            className={styles.saveButton}
            onClick={() => setShowSaveModal(true)}
            aria-label={t('garage.filters.savePreset')}
          >
            {t('garage.filters.savePreset')}
          </button>
        )}
      </div>

      <div className={styles.presetsList}>
        {presets.map((preset) => {
          const isDefault = preset.isDefault;
          return (
            <button
              key={preset.id}
              type="button"
              className={styles.presetButton}
              onClick={() => handleApplyPreset(preset.id)}
              aria-label={`${t('garage.filters.applyPreset')}: ${preset.name}`}
            >
              <span className={styles.presetName}>{preset.name}</span>
              {!isDefault && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  aria-label={t('garage.filters.deletePreset')}
                  title={t('garage.filters.deletePreset')}
                >
                  ×
                </button>
              )}
            </button>
          );
        })}
      </div>

      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t('garage.filters.savePreset')}</h3>
            <input
              type="text"
              className={styles.modalInput}
              placeholder={t('garage.filters.presetName')}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePreset();
                } else if (e.key === 'Escape') {
                  setShowSaveModal(false);
                  setPresetName('');
                }
              }}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalButton}
                onClick={() => {
                  setShowSaveModal(false);
                  setPresetName('');
                }}
                onKeyDown={(e) => handleKeyDown(e, 'cancel')}
              >
                {t('garage.overlay.close')}
              </button>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                onClick={handleSavePreset}
                onKeyDown={(e) => handleKeyDown(e, 'save')}
                disabled={!presetName.trim()}
              >
                {t('garage.filters.savePreset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

