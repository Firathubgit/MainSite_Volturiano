import React from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '../../../../stores/configStore';
import styles from './CameraControls.module.css';

/**
 * CameraControls Component
 * Angle selector buttons for switching camera views
 */
export default function CameraControls({ availableAngles = [] }) {
  const { t } = useTranslation('configurator');
  const currentAngle = useConfigStore((state) => state.currentAngle);
  const setAngle = useConfigStore((state) => state.setAngle);

  if (!availableAngles || availableAngles.length === 0) {
    return null;
  }

  const angleLabels = {
    'front-3q': t('camera.front', 'Front'),
    'side': t('camera.side', 'Side'),
    'rear-3q': t('camera.rear', 'Rear'),
    'rim': t('camera.rim', 'Rim'),
    'interior': t('camera.interior', 'Interior')
  };

  return (
    <div className={styles.container}>
      {availableAngles.map((angle) => (
        <button
          key={angle}
          type="button"
          className={`${styles.button} ${currentAngle === angle ? styles.active : ''}`}
          onClick={() => setAngle(angle)}
          aria-label={t('camera.viewAngle', { angle: angleLabels[angle] || angle, defaultValue: `View ${angleLabels[angle] || angle} angle` })}
        >
          {angleLabels[angle] || angle}
        </button>
      ))}
    </div>
  );
}

