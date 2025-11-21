import React, { useState } from 'react';
import styles from './ConfiguratorLayout.module.css';

/**
 * ConfiguratorLayout Component
 * Full-screen layout with collapsible sidebar panel
 */
export default function ConfiguratorLayout({ 
  children, 
  panel, 
  header,
  onPanelToggle 
}) {
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const handlePanelToggle = () => {
    const newState = !isPanelOpen;
    setIsPanelOpen(newState);
    if (onPanelToggle) {
      onPanelToggle(newState);
    }
  };

  return (
    <div className={styles.layout}>
      {header && (
        <div className={styles.headerContainer}>
          {header}
        </div>
      )}
      
      <main 
        className={`${styles.mainContent} ${isPanelOpen ? styles.panelOpen : ''}`}
      >
        {children}
      </main>
      
      {panel && (
        <>
          <div 
            className={`${styles.panel} ${isPanelOpen ? styles.panelVisible : ''}`}
          >
            {panel}
          </div>
          
          {!isPanelOpen && (
            <button
              type="button"
              className={styles.panelToggleButton}
              onClick={handlePanelToggle}
              aria-label="Open configuration panel"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}

