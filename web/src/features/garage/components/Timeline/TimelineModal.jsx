import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGarageStore } from '../../../../stores/garageStore';
import Timeline from './Timeline';
import AddMilestoneDialog from './AddMilestoneDialog';
import styles from './TimelineModal.module.css';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

/**
 * Timeline modal component
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the modal
 * @param {string} props.itemId - Garage item ID
 * @param {Function} props.onClose - Callback when modal closes
 */
export default function TimelineModal({ show, itemId, onClose }) {
  const { t } = useTranslation('account');
  const loadMilestones = useGarageStore((state) => state.loadMilestones);
  const createMilestone = useGarageStore((state) => state.createMilestone);
  const milestones = useGarageStore((state) => {
    if (!state.milestones || !itemId) return [];
    return state.milestones.get(itemId) || [];
  });
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  useEffect(() => {
    if (show && itemId) {
      loadMilestonesData();
    } else {
      setError(null);
    }
  }, [show, itemId]);
  
  const loadMilestonesData = async (forceRefresh = false) => {
    if (!itemId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: loadError } = await loadMilestones(itemId, {
        order: 'asc', // Timeline shows oldest first
        forceRefresh
      });
      
      if (loadError) {
        setError(loadError);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddMilestone = async (milestoneData) => {
    if (!itemId) return;
    
    setCreating(true);
    try {
      const { error: createError } = await createMilestone(itemId, milestoneData);
      
      if (createError) {
        console.error('[TimelineModal] Error creating milestone:', createError);
        alert(t('garage.timeline.addDialog.error', 'Failed to add milestone'));
      } else {
        setShowAddDialog(false);
        // Reload milestones to show the new one
        await loadMilestonesData(true);
      }
    } catch (err) {
      console.error('[TimelineModal] Exception creating milestone:', err);
      alert(t('garage.timeline.addDialog.error', 'Failed to add milestone'));
    } finally {
      setCreating(false);
    }
  };
  
  if (!show || !mounted) {
    return null;
  }
  
  const modalContent = (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeline-modal-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            className={styles.panel}
            variants={panelVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2 id="timeline-modal-title" className={styles.title}>
                {t('garage.timeline.title', 'Timeline')}
              </h2>
              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => setShowAddDialog(true)}
                >
                  {t('garage.timeline.addCustom', 'Add Custom Milestone')}
                </button>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={onClose}
                  aria-label={t('common.close', 'Close')}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className={styles.content}>
              <Timeline
                milestones={milestones}
                loading={loading}
                error={error}
                onRetry={() => loadMilestonesData(true)}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(
    <>
      {modalContent}
      <AddMilestoneDialog
        show={showAddDialog}
        onConfirm={handleAddMilestone}
        onCancel={() => setShowAddDialog(false)}
        loading={creating}
      />
    </>,
    document.body
  );
}

