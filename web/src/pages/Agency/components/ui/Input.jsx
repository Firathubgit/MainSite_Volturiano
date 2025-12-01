import React from 'react';
import styles from './Input.module.css';

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      <input
        className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

export function Select({ label, options, error, placeholder, className = '', ...props }) {
  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      <div className={styles.selectWrapper}>
        <select
          className={`${styles.select} ${error ? styles.inputError : ''} ${className}`}
          {...props}
        >
          <option value="" disabled>{placeholder || "Select option"}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className={styles.selectArrow}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

export function TextArea({ label, error, className = '', ...props }) {
  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      <textarea
        className={`${styles.textarea} ${error ? styles.inputError : ''} ${className}`}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}










