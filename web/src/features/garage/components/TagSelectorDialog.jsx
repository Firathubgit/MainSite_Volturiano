import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGarageStore } from '../../../stores/garageStore';
import TagSelector from './TagSelector';
import styles from './TagSelectorDialog.module.css';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
};

/**
 * TagSelectorDialog - Modal for editing tags on a garage item
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the dialog
 * @param {string} props.itemId - Garage item ID
 * @param {Function} props.onClose - Callback when dialog closes
 */
export default function TagSelectorDialog({ show, itemId, onClose }) {
  const { t } = useTranslation('account');
  const setItemTags = useGarageStore((state) => state.setItemTags);
  const items = useGarageStore((state) => state.items);
  
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Load current tags when dialog opens
  useEffect(() => {
    if (show && itemId) {
      const item = items.get(itemId);
      if (item) {
        setSelectedTags(item.tags || []);
      } else {
        setSelectedTags([]);
      }
      setError(null);
    }
  }, [show, itemId, items]);

  const handleSave = async () => {
    if (!itemId) return;

    setLoading(true);
    setError(null);

    try {
      const { error: saveError } = await setItemTags(itemId, selectedTags);

      if (saveError) {
        setError(saveError);
        setLoading(false);
        return;
      }

      // Close dialog on success
      onClose();
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!mounted || !show) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.overlay}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
        >
          <motion.div
            className={styles.dialog}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>{t('garage.tags.editTags')}</h2>
              <button
                type="button"
                className={styles.dialogClose}
                onClick={handleCancel}
                aria-label={t('garage.overlay.close')}
              >
                ×
              </button>
            </div>

            <div className={styles.dialogContent}>
              <TagSelector
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                disabled={loading}
              />
            </div>

            {error && (
              <div className={styles.errorMessage}>
                {error.message || t('garage.tags.errorUpdating')}
              </div>
            )}

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={loading}
              >
                {t('garage.restore.cancel')}
              </button>
              <button
                type="button"
                className={styles.saveButton}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? t('garage.save.saving') : t('garage.tags.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

