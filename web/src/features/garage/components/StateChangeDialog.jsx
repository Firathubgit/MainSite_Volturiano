import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styles from './StateChangeDialog.module.css';

/**
 * StateChangeDialog - Confirmation modal for state changes
 * @param {Object} props
 * @param {boolean} props.show - Whether dialog is visible
 * @param {string} props.fromState - Current state
 * @param {string} props.toState - Target state
 * @param {Function} props.onConfirm - Callback when confirmed
 * @param {Function} props.onCancel - Callback when cancelled
 */
export default function StateChangeDialog({
  show,
  fromState,
  toState,
  onConfirm,
  onCancel
}) {
  const { t } = useTranslation('account');

  if (!show) return null;

  const isTerminal = toState === 'archived';
  const isPurchased = toState === 'purchased';
  const needsWarning = isTerminal || isPurchased;

  const getWarningMessage = () => {
    if (isTerminal) {
      return t('garage.stateChange.confirmArchived', 'Archiving this item is permanent. You cannot undo this action.');
    }
    if (isPurchased) {
      return t('garage.stateChange.confirmPurchased', 'Marking this item as purchased cannot be easily undone.');
    }
    return null;
  };

  const getStateLabel = (state) => {
    return t(`garage.stateChange.states.${state}`, state);
  };

  return createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {t('garage.stateChange.title', 'Change State')}
          </h2>
        </div>
        <div className={styles.content}>
          <p className={styles.message}>
            {t('garage.stateChange.message', 'Move from {{fromState}} to {{toState}}?', {
              fromState: getStateLabel(fromState),
              toState: getStateLabel(toState)
            })}
          </p>
          {needsWarning && (
            <div className={styles.warning}>
              <span className={styles.warningIcon}>⚠️</span>
              <p className={styles.warningText}>{getWarningMessage()}</p>
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            {t('garage.stateChange.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className={`${styles.confirmButton} ${needsWarning ? styles.warningButton : ''}`}
            onClick={onConfirm}
          >
            {t('garage.stateChange.confirm', 'Confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

