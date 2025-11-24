import React from 'react';
import styles from './AdminBadge.module.css';

export default function AdminBadge({ 
  variant = 'default', 
  size = 'md', 
  children, 
  className = '' 
}) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]} ${className}`}>
      {children}
    </span>
  );
}






