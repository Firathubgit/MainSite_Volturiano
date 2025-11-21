import React from 'react';
import styles from './CompatibilityAlert.module.css';

/**
 * CompatibilityAlert Component
 * Displays compatibility violation messages and suggests resolutions
 */
export default function CompatibilityAlert({ violations, onAutoResolve, onDismiss }) {
  if (!violations || violations.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {violations.map((violation, index) => (
        <div key={violation.ruleId || index} className={styles.alert}>
          <div className={styles.content}>
            <div className={styles.icon}>⚠️</div>
            <div className={styles.message}>
              <p className={styles.title}>{violation.message}</p>
              {violation.type === 'requires_missing' && violation.autoResolve && (
                <p className={styles.hint}>We can add the required option automatically.</p>
              )}
            </div>
          </div>
          
          <div className={styles.actions}>
            {violation.autoResolve && (
              <button
                type="button"
                className={styles.autoResolveButton}
                onClick={() => onAutoResolve && onAutoResolve(violation)}
              >
                Auto-Resolve
              </button>
            )}
            <button
              type="button"
              className={styles.dismissButton}
              onClick={() => onDismiss && onDismiss(violation)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

