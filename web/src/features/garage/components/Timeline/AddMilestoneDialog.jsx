import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MILESTONE_TYPES, getValidMilestoneTypes } from '../../utils/milestoneTypes';
import styles from './AddMilestoneDialog.module.css';

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
 * Dialog for adding custom milestones
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the dialog
 * @param {Function} props.onConfirm - Callback when milestone is created
 * @param {Function} props.onCancel - Callback when dialog is cancelled
 * @param {boolean} props.loading - Loading state
 */
export default function AddMilestoneDialog({ show, onConfirm, onCancel, loading = false }) {
  const { t } = useTranslation('account');
  const [mounted, setMounted] = useState(false);
  const [milestoneType, setMilestoneType] = useState(MILESTONE_TYPES.CUSTOM);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  useEffect(() => {
    if (!show) {
      // Reset form when dialog closes
      setMilestoneType(MILESTONE_TYPES.CUSTOM);
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setNote('');
      setErrors({});
    }
  }, [show]);
  
  const validate = () => {
    const newErrors = {};
    
    if (!note.trim()) {
      newErrors.note = t('garage.timeline.addDialog.noteRequired', 'Note is required');
    }
    
    if (!date) {
      newErrors.date = t('garage.timeline.addDialog.dateRequired', 'Date is required');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    // Combine date and time into ISO string
    const dateTime = new Date(`${date}T${time}:00`).toISOString();
    
    const milestoneData = {
      milestone_type: milestoneType,
      note: note.trim(),
      occurred_at: dateTime,
      metadata: {
        source: 'manual',
        custom: true
      }
    };
    
    onConfirm(milestoneData);
  };
  
  if (!show || !mounted) {
    return null;
  }
  
  const validTypes = getValidMilestoneTypes();
  
  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-milestone-dialog-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onCancel();
            }
          }}
        >
          <motion.div
            className={styles.panel}
            variants={panelVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2 id="add-milestone-dialog-title" className={styles.title}>
                {t('garage.timeline.addDialog.title', 'Add Custom Milestone')}
              </h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={onCancel}
                aria-label={t('common.close', 'Close')}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="milestone-type" className={styles.label}>
                  {t('garage.timeline.addDialog.type', 'Type')}
                </label>
                <select
                  id="milestone-type"
                  value={milestoneType}
                  onChange={(e) => setMilestoneType(e.target.value)}
                  className={styles.select}
                  disabled={loading}
                >
                  {validTypes.map(type => (
                    <option key={type} value={type}>
                      {t(`garage.timeline.milestone.${type}`, type)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="milestone-date" className={styles.label}>
                    {t('garage.timeline.addDialog.date', 'Date')}
                  </label>
                  <input
                    id="milestone-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${styles.input} ${errors.date ? styles.inputError : ''}`}
                    disabled={loading}
                    required
                  />
                  {errors.date && (
                    <span className={styles.errorText}>{errors.date}</span>
                  )}
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="milestone-time" className={styles.label}>
                    {t('garage.timeline.addDialog.time', 'Time')}
                  </label>
                  <input
                    id="milestone-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={styles.input}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="milestone-note" className={styles.label}>
                  {t('garage.timeline.addDialog.note', 'Note')}
                </label>
                <textarea
                  id="milestone-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('garage.timeline.addDialog.notePlaceholder', 'Add a note about this milestone...')}
                  className={`${styles.textarea} ${errors.note ? styles.inputError : ''}`}
                  disabled={loading}
                  rows={4}
                  required
                />
                {errors.note && (
                  <span className={styles.errorText}>{errors.note}</span>
                )}
              </div>
              
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={onCancel}
                  disabled={loading}
                >
                  {t('garage.timeline.addDialog.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading
                    ? t('garage.timeline.addDialog.submitting', 'Adding...')
                    : t('garage.timeline.addDialog.submit', 'Add Milestone')
                  }
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

