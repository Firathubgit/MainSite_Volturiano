import React from 'react';
import styles from './ConfiguratorLayout.module.css';

/**
 * ConfiguratorLayout Component
 * Full-screen layout with overlay panels (Fiverr style)
 */
export default function ConfiguratorLayout({ 
  children, 
  panel, 
  header
}) {
  return (
    <div className={styles.layout}>
      {header && (
        <div className={styles.headerContainer}>
          {header}
        </div>
      )}
      
      <main className={styles.mainContent}>
        {children}
      </main>
      
      {/* Overlay Panel (ConfigurationPanel renders as overlay) */}
      {panel && (
        <div className={styles.overlayContainer}>
          {panel}
        </div>
      )}
    </div>
  );
}

