import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './AdminLoading.module.css';

export default function AdminLoading({ 
  size = 'md', 
  fullScreen = false,
  text
}) {
  const sizeClass = styles[size];
  
  const content = (
    <div className={styles.content}>
      <Loader2 className={`${styles.spinner} ${sizeClass}`} />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
  
  if (fullScreen) {
    return (
      <div className={styles.fullScreen}>
        {content}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {content}
    </div>
  );
}






