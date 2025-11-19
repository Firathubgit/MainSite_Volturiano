import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ConfigDiff from './ConfigDiff';
import ConfiguratorTypeBadge from './ConfiguratorTypeBadge';
import { detectConfiguratorType } from '../utils/configuratorType';
import styles from './RestoreVersionDialog.module.css';

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
 * Confirmation dialog for restoring a garage item to a specific version
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the dialog
 * @param {Object} props.version - Version object to restore
 * @param {Object} props.currentConfig - Current configuration payload
 * @param {Function} props.onConfirm - Callback when user confirms restore
 * @param {Function} props.onCancel - Callback when user cancels
 * @param {boolean} props.loading - Loading state during restore
 */
export default function RestoreVersionDialog({
  show,
  version,
  currentConfig,
  onConfirm,
  onCancel,
  loading = false
}) {
  const { t } = useTranslation('account');
  const [expanded, setExpanded] = useState(false);

  const versionType = useMemo(() => {
    return version?.snapshot ? detectConfiguratorType(version.snapshot) : null;
  }, [version]);

  const currentType = useMemo(() => {
    return currentConfig ? detectConfiguratorType(currentConfig) : null;
  }, [currentConfig]);

  // Use portal to render outside DOM hierarchy
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!show || !version || !mounted) {
    return null;
  }

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onCancel();
    }
  };

  const dialogContent = (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-dialog-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) {
              handleCancel();
            }
          }}
        >
          <motion.div
            className={styles.panel}
            variants={panelVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2 id="restore-dialog-title" className={styles.title}>
                {t('garage.restore.title')}
              </h2>
              <motion.button
                type="button"
                className={styles.closeButton}
                onClick={handleCancel}
                disabled={loading}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                aria-label={t('garage.overlay.close')}
              >
                ×
              </motion.button>
            </div>

            <div className={styles.content}>
            <div className={styles.versionInfo}>
              <div className={styles.versionNumberRow}>
                <div className={styles.versionNumber}>
                  {t('garage.versionHistory.version')} {version.version_number}
                </div>
                {versionType && (
                  <ConfiguratorTypeBadge type={versionType} size="small" />
                )}
                {currentType && versionType && currentType !== versionType && (
                  <span className={styles.typeChangeIndicator}>
                    → {currentType.toUpperCase()}
                  </span>
                )}
              </div>
              <div className={styles.versionDate}>
                {formatDate(version.created_at)}
              </div>
            </div>

              {version.diff_summary && version.diff_summary.length > 0 && (
                <div className={styles.diffPreview}>
                  <button
                    type="button"
                    className={styles.expandButton}
                    onClick={() => setExpanded(!expanded)}
                    disabled={loading}
                  >
                    {expanded ? t('garage.diff.hide') : t('garage.diff.show')}
                  </button>
                  {expanded && (
                    <ConfigDiff
                      oldConfig={currentConfig}
                      newConfig={version.snapshot}
                      diffSummary={version.diff_summary}
                    />
                  )}
                </div>
              )}

              <div className={styles.warning}>
                <span className={styles.warningIcon}>⚠️</span>
                <span>{t('garage.restore.warning')}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <motion.button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={loading}
                whileHover={{ opacity: 0.8 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('garage.restore.cancel')}
              </motion.button>
              <motion.button
                type="button"
                className={styles.confirmButton}
                onClick={handleConfirm}
                disabled={loading}
                whileHover={{ opacity: 0.9 }}
                whileTap={{ scale: 0.95 }}
              >
                {loading ? t('garage.restore.restoring') : t('garage.restore.confirm')}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render dialog content in portal to document.body (outside any card/container)
  return createPortal(dialogContent, document.body);
}


