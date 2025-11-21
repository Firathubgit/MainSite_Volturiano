import React from 'react';
import { useConfigStore } from '../../../../stores/configStore';
import styles from './ViewModeToggle.module.css';

/**
 * ViewModeToggle Component
 * Floating pill toggle for 2D/3D switching
 */
export default function ViewModeToggle() {
  const viewMode = useConfigStore((state) => state.viewMode);
  const setViewMode = useConfigStore((state) => state.setViewMode);
  // Always enable 3D mode - Viewer3D component handles its own availability
  const enable3D = true;

  const handle2DClick = () => {
    console.log('[ViewModeToggle] Switching to 2D');
    setViewMode('2d');
  };

  const handle3DClick = () => {
    console.log('[ViewModeToggle] Switching to 3D');
    setViewMode('3d');
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.button} ${viewMode === '2d' ? styles.active : ''}`}
        onClick={handle2DClick}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 3v18" />
        </svg>
        <span>2D Visualizer</span>
      </button>
      
      <button
        type="button"
        className={`${styles.button} ${viewMode === '3d' ? styles.active : ''} ${!enable3D ? styles.disabled : ''}`}
        onClick={handle3DClick}
        disabled={!enable3D}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <span>3D Configurator</span>
      </button>
    </div>
  );
}

