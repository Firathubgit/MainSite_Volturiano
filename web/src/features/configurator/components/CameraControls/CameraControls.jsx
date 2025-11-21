import React from 'react';
import { useConfigStore } from '../../../../stores/configStore';
import styles from './CameraControls.module.css';

/**
 * CameraControls Component
 * Angle selector buttons for switching camera views
 */
export default function CameraControls({ availableAngles = [] }) {
  const currentAngle = useConfigStore((state) => state.currentAngle);
  const setAngle = useConfigStore((state) => state.setAngle);

  if (!availableAngles || availableAngles.length === 0) {
    return null;
  }

  const angleLabels = {
    'front-3q': 'Front',
    'side': 'Side',
    'rear-3q': 'Rear',
    'rim': 'Rim',
    'interior': 'Interior'
  };

  return (
    <div className={styles.container}>
      {availableAngles.map((angle) => (
        <button
          key={angle}
          type="button"
          className={`${styles.button} ${currentAngle === angle ? styles.active : ''}`}
          onClick={() => setAngle(angle)}
          aria-label={`View ${angleLabels[angle] || angle} angle`}
        >
          {angleLabels[angle] || angle}
        </button>
      ))}
    </div>
  );
}

