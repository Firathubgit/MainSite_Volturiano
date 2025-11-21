import React from 'react';
import styles from './ColorSwatch.module.css';

/**
 * ColorSwatch Component
 * Circular color preview for paint options
 */
export default function ColorSwatch({ color }) {
  return (
    <div 
      className={styles.swatch}
      style={{ backgroundColor: color || '#000000' }}
    />
  );
}

