import React, { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageTransition from '../../components/PageTransition/PageTransition';
import { Viewer2D } from '../../viewers/two-d/Viewer2D';
import { Viewer3D } from '../../viewers/three-d/Viewer3D';
import styles from './Configurator.module.css';

export default function Configurator() {
  const enable3D = import.meta.env.VITE_ENABLE_R3F_MODE === 'true';
  const { t } = useTranslation('configurator');
  const [mode, setMode] = useState('2d');
  const [debugForce3D, setDebugForce3D] = useState(false);
  const [bodyColor, setBodyColor] = useState('#FF4520');
  const [rimColor, setRimColor] = useState('#111111');

  // Debug logging
  useEffect(() => {
    console.log('[Configurator] Mode:', mode);
    console.log('[Configurator] enable3D:', enable3D);
    console.log('[Configurator] debugForce3D:', debugForce3D);
    console.log('[Configurator] VITE_ENABLE_R3F_MODE:', import.meta.env.VITE_ENABLE_R3F_MODE);
  }, [mode, enable3D, debugForce3D]);

  // Force 3D if debug mode is enabled (bypasses all env flags)
  const effective3DEnabled = enable3D || debugForce3D;
  const show3D = debugForce3D ? true : (mode === '3d' && effective3DEnabled);

  return (
    <PageTransition>
      <section className={styles.container}>
        <header className={styles.header}>
          <h2>{t('title')}</h2>
        </header>
        <div className={styles.viewerShell}>
          <div className={styles.viewerToggle} aria-label="Viewer mode">
            <button
              type="button"
              className={`${styles.toggleButton} ${mode === '2d' ? styles.active : ''}`}
              onClick={() => {
                console.log('[Configurator] Switching to 2D');
                setMode('2d');
                setDebugForce3D(false);
              }}
            >
              2D
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${mode === '3d' ? styles.active : ''}`}
              onClick={() => {
                console.log('[Configurator] Switching to 3D');
                setMode('3d');
                setDebugForce3D(false); // Turn off debug when manually switching
              }}
              disabled={!effective3DEnabled}
              style={{ opacity: effective3DEnabled ? 1 : 0.5, cursor: effective3DEnabled ? 'pointer' : 'not-allowed' }}
            >
              3D
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${styles.debugButton} ${debugForce3D ? styles.active : ''}`}
              onClick={() => {
                const newDebugState = !debugForce3D;
                console.log('[Configurator] Debug Force 3D:', newDebugState);
                setDebugForce3D(newDebugState);
                if (newDebugState) {
                  setMode('3d');
                }
              }}
              title="Debug: Force enable 3D mode (bypasses env flags)"
            >
              DEBUG
            </button>
          </div>
          {show3D && (
            <div className={styles.colorOverlay}>
              <div className={styles.colorPanel}>
                <div className={styles.colorLabel}>DEV MODE</div>
                <div className={styles.colorControl}>
                  <label>Body Paint:</label>
                  <input
                    type="color"
                    value={bodyColor}
                    onChange={(e) => {
                      console.log('[Configurator] Body color changed:', e.target.value);
                      setBodyColor(e.target.value);
                    }}
                  />
                  <input
                    type="text"
                    value={bodyColor}
                    onChange={(e) => setBodyColor(e.target.value)}
                    className={styles.colorInput}
                  />
                </div>
                <div className={styles.colorControl}>
                  <label>Rim Paint:</label>
                  <input
                    type="color"
                    value={rimColor}
                    onChange={(e) => {
                      console.log('[Configurator] Rim color changed:', e.target.value);
                      setRimColor(e.target.value);
                    }}
                  />
                  <input
                    type="text"
                    value={rimColor}
                    onChange={(e) => setRimColor(e.target.value)}
                    className={styles.colorInput}
                  />
                </div>
              </div>
            </div>
          )}
          <Suspense fallback={<div className="center">{t('loading')}</div>}>
            {show3D ? <Viewer3D bodyColor={bodyColor} rimColor={rimColor} /> : <Viewer2D />}
          </Suspense>
        </div>
      </section>
    </PageTransition>
  );
}

