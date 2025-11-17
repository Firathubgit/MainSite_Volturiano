import React, { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageTransition from '../../components/PageTransition/PageTransition';
import { Viewer2D, BODY_COLORS, RIM_COLORS, ANGLES } from '../../viewers/two-d/Viewer2D';
import { Viewer3D } from '../../viewers/three-d/Viewer3D';
import styles from './Configurator.module.css';

export default function Configurator() {
  const enable3D = import.meta.env.VITE_ENABLE_R3F_MODE === 'true';
  const { t } = useTranslation('configurator');
  const [mode, setMode] = useState('2d');
  const [debugForce3D, setDebugForce3D] = useState(false);
  
  // 3D mode colors (hex values)
  const [bodyColor3D, setBodyColor3D] = useState('#FF4520');
  const [rimColor3D, setRimColor3D] = useState('#111111');
  
  // 2D mode selections (option keys)
  const [bodyColor2D, setBodyColor2D] = useState('orange-fury');
  const [rimColor2D, setRimColor2D] = useState('black');
  const [angle2D, setAngle2D] = useState('front-3q');

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
          {/* 3D Dev Controls */}
          {show3D && (
            <div className={styles.colorOverlay}>
              <div className={styles.colorPanel}>
                <div className={styles.colorLabel}>DEV MODE - 3D</div>
                <div className={styles.colorControl}>
                  <label>Body Paint:</label>
                  <input
                    type="color"
                    value={bodyColor3D}
                    onChange={(e) => {
                      console.log('[Configurator] Body color changed:', e.target.value);
                      setBodyColor3D(e.target.value);
                    }}
                  />
                  <input
                    type="text"
                    value={bodyColor3D}
                    onChange={(e) => setBodyColor3D(e.target.value)}
                    className={styles.colorInput}
                  />
                </div>
                <div className={styles.colorControl}>
                  <label>Rim Paint:</label>
                  <input
                    type="color"
                    value={rimColor3D}
                    onChange={(e) => {
                      console.log('[Configurator] Rim color changed:', e.target.value);
                      setRimColor3D(e.target.value);
                    }}
                  />
                  <input
                    type="text"
                    value={rimColor3D}
                    onChange={(e) => setRimColor3D(e.target.value)}
                    className={styles.colorInput}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* 2D Dev Controls */}
          {!show3D && (
            <div className={styles.colorOverlay}>
              <div className={styles.colorPanel}>
                <div className={styles.colorLabel}>DEV MODE - 2D</div>
                
                {/* Body Color Selection */}
                <div className={styles.colorControl}>
                  <label>Body:</label>
                  <select
                    value={bodyColor2D}
                    onChange={(e) => {
                      console.log('[Configurator] Body color changed:', e.target.value);
                      setBodyColor2D(e.target.value);
                    }}
                    className={styles.selectInput}
                  >
                    {Object.entries(BODY_COLORS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Rim Color Selection */}
                <div className={styles.colorControl}>
                  <label>Rim:</label>
                  <select
                    value={rimColor2D}
                    onChange={(e) => {
                      console.log('[Configurator] Rim color changed:', e.target.value);
                      setRimColor2D(e.target.value);
                    }}
                    className={styles.selectInput}
                  >
                    {Object.entries(RIM_COLORS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Angle Selection */}
                <div className={styles.colorControl}>
                  <label>Angle:</label>
                  <div className={styles.angleButtons}>
                    {Object.entries(ANGLES).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`${styles.angleButton} ${angle2D === key ? styles.angleButtonActive : ''}`}
                        onClick={() => {
                          console.log('[Configurator] Angle changed:', key);
                          setAngle2D(key);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <Suspense fallback={<div className="center">{t('loading')}</div>}>
            {show3D ? (
              <Viewer3D bodyColor={bodyColor3D} rimColor={rimColor3D} />
            ) : (
              <Viewer2D 
                bodyColor={bodyColor2D} 
                rimColor={rimColor2D} 
                angle={angle2D}
              />
            )}
          </Suspense>
        </div>
      </section>
    </PageTransition>
  );
}

