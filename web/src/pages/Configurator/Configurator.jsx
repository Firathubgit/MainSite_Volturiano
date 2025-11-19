import React, { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import PageTransition from '../../components/PageTransition/PageTransition';
import { Viewer2D, BODY_COLORS, RIM_COLORS, ANGLES } from '../../viewers/two-d/Viewer2D';
import { Viewer3D } from '../../viewers/three-d/Viewer3D';
import { 
  findPaintColorFromOptions, 
  findRimColorFromOptions 
} from '../../features/garage/utils/extractGarageConfigForConfigurator';
import styles from './Configurator.module.css';

export default function Configurator() {
  const enable3D = import.meta.env.VITE_ENABLE_R3F_MODE === 'true';
  const { t: tConfigurator } = useTranslation('configurator');
  const { t } = useTranslation('account');
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get garage config from location state
  const garageConfig = location.state?.garageConfig;
  
  // Determine initial mode based on garage config or default
  const getInitialMode = () => {
    if (!garageConfig) return '2d';
    const type = garageConfig.configuratorType;
    if (type === '3d') return '3d';
    if (type === 'hybrid') return '2d'; // Default hybrid to 2D
    return '2d';
  };
  
  const [mode, setMode] = useState(getInitialMode());
  const [debugForce3D, setDebugForce3D] = useState(false);
  
  // Color key to hex mapping for 3D viewer
  const BODY_COLOR_HEX = {
    'blu-blue': '#060FE7',
    'nero-black': '#111111',
    'bianco-white': '#FFFFFF',
    'rosso-red': '#E10600',
    'orange-fury': '#FF4520',
  };

  const RIM_COLOR_HEX = {
    'black': '#111111',
    'silver': '#F7FAFF',
    'bronze': '#900678',
  };

  // Extract initial values from garage config
  const getInitialBodyColor = () => {
    if (!garageConfig) return 'blu-blue';
    const paintColor = findPaintColorFromOptions([
      ...(garageConfig.options?.exterior || []),
      ...(garageConfig.options?.interior || []),
      ...(garageConfig.options?.performance || [])
    ]);
    return paintColor || 'blu-blue';
  };

  const getInitialRimColor = () => {
    if (!garageConfig) return 'black';
    const rimColor = findRimColorFromOptions([
      ...(garageConfig.options?.exterior || []),
      ...(garageConfig.options?.performance || [])
    ]);
    return rimColor || 'black';
  };

  const getInitialAngle = () => {
    if (!garageConfig) return 'front-3q';
    return garageConfig.cameraAngle || 'front-3q';
  };

  // 3D mode selections (option keys, same as 2D)
  const [bodyColor3D, setBodyColor3D] = useState(getInitialBodyColor());
  const [rimColor3D, setRimColor3D] = useState(getInitialRimColor());
  
  // 2D mode selections (option keys)
  const [bodyColor2D, setBodyColor2D] = useState(getInitialBodyColor());
  const [rimColor2D, setRimColor2D] = useState(getInitialRimColor());
  const [angle2D, setAngle2D] = useState(getInitialAngle());

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

  // Initialize from garage config on mount
  useEffect(() => {
    if (garageConfig) {
      const paintColor = getInitialBodyColor();
      const rimColor = getInitialRimColor();
      const angle = getInitialAngle();
      
      setBodyColor2D(paintColor);
      setRimColor2D(rimColor);
      setAngle2D(angle);
      setBodyColor3D(paintColor);
      setRimColor3D(rimColor);
      
      // Set mode based on configurator type
      const initialMode = getInitialMode();
      setMode(initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - garageConfig comes from location.state which doesn't change

  return (
    <PageTransition>
      <section className={styles.container}>
        <header className={styles.header}>
          <h2>{tConfigurator('title')}</h2>
          {garageConfig && (
            <div className={styles.garageBanner}>
              <span className={styles.garageBannerText}>
                {t('garage.configurator.editing', { model: garageConfig.vehicle?.model || 'Configuration' })}
              </span>
              <button
                type="button"
                className={styles.garageBannerButton}
                onClick={() => navigate('/garage')}
              >
                {t('garage.configurator.backToGarage', 'Back to Garage')}
              </button>
            </div>
          )}
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
                
                {/* Body Color Selection */}
                <div className={styles.colorControl}>
                  <label>Body:</label>
                  <select
                    value={bodyColor3D}
                    onChange={(e) => {
                      console.log('[Configurator] Body color changed:', e.target.value);
                      setBodyColor3D(e.target.value);
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
                    value={rimColor3D}
                    onChange={(e) => {
                      console.log('[Configurator] Rim color changed:', e.target.value);
                      setRimColor3D(e.target.value);
                    }}
                    className={styles.selectInput}
                  >
                    {Object.entries(RIM_COLORS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
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
          <Suspense fallback={<div className="center">{tConfigurator('loading')}</div>}>
            {show3D ? (
              <Viewer3D 
                bodyColor={BODY_COLOR_HEX[bodyColor3D]} 
                rimColor={RIM_COLOR_HEX[rimColor3D]} 
              />
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

