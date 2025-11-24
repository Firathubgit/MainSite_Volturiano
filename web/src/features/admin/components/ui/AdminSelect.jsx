import React from 'react';
import styles from './AdminSelect.module.css';

export default function AdminSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required,
  id,
  className = '',
  ...props
}) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`${styles.selectWrapper} ${className}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`${styles.select} ${error ? styles.error : ''}`}
        value={value}
        onChange={onChange}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className={styles.errorText}>{error}</p>}
      {helperText && !error && <p className={styles.helperText}>{helperText}</p>}
    </div>
  );
}



