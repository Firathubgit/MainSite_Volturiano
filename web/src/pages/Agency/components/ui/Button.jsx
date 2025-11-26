import React from 'react';
import styles from './Button.module.css';

export function Button({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) {
  const variantClass = styles[variant] || styles.primary;
  const fullWidthClass = fullWidth ? styles.fullWidth : '';
  
  return (
    <button 
      className={`${styles.base} ${variantClass} ${fullWidthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

