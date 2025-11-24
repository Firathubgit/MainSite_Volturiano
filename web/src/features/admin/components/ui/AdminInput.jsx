import React from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './AdminInput.module.css';

export default function AdminInput({
  label,
  error,
  helperText,
  required,
  id,
  icon: Icon,
  className = '',
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`${styles.inputWrapper} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.inputContainer}>
        {Icon && (
          <div className={styles.icon}>
            <Icon size={16} />
          </div>
        )}
        <input
          id={inputId}
          className={`${styles.input} ${error ? styles.error : ''} ${Icon ? styles.inputWithIcon : ''}`}
          {...props}
        />
      </div>
      {error && (
        <div className={styles.errorContainer}>
          <AlertCircle size={12} className={styles.errorIcon} />
          <p className={styles.errorText}>{error}</p>
        </div>
      )}
      {helperText && !error && <p className={styles.helperText}>{helperText}</p>}
    </div>
  );
}






