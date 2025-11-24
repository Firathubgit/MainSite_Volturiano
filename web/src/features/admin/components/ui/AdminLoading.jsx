import React from 'react';
import styles from './AdminLoading.module.css';

export default function AdminLoading({ size = 'medium', fullScreen = false }) {
  const sizeClass = styles[size];
  
  if (fullScreen) {
    return (
      <div className={styles.fullScreen}>
        <div className={`${styles.spinner} ${sizeClass}`}>⏳</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.spinner} ${sizeClass}`}>⏳</div>
    </div>
  );
}



