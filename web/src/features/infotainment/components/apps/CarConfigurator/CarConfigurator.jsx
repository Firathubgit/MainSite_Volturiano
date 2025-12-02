/**
 * Car Configurator App Component
 * Displays instrument cluster, camera views, and car title
 */
import React from 'react';
import { Lightbulb, AlertTriangle, Lock, ZapOff } from 'lucide-react';
import { DRIVE_MODES, CAMERA_VIEWS } from '../../../constants/infotainmentConstants';
import styles from './CarConfigurator.module.css';

export function CarConfigurator({ mode, theme, view, setView }) {
  return (
    <>
      {/* TOP LEFT: INSTRUMENT CLUSTER */}
      <div className={styles.instrumentCluster}>
        <div className={styles.clusterContent}>
          {/* LEFT COL: Gears + Telltales */}
          <div className={styles.leftColumn}>
            {/* Gear Selector */}
            <div className={styles.gearSelector}>
              <div className={styles.gearInactive}>P</div>
              <div className={styles.gearInactive}>R</div>
              <div className={styles.gearInactive}>N</div>
              <div
                className={`${styles.gearActive} ${mode === DRIVE_MODES.SPORT ? styles.gearSport : ''}`}
              >
                D
              </div>
            </div>

            {/* Telltales */}
            <div className={styles.telltales}>
              <Lightbulb size={20} className={styles.telltaleGreen} />
              <AlertTriangle size={20} className={styles.telltaleAmber} />
              <Lock size={20} className={styles.telltaleRed} />
              <ZapOff size={20} className={styles.telltaleInactive} />
            </div>
          </div>

          {/* RIGHT COL: Speedometer */}
          <div className={styles.speedometer}>
            <div className={styles.speedValue}>0</div>
            <div className={styles.speedUnit}>MPH</div>
            <div className={styles.modeLabel}>{theme.label}</div>
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: VIEW ANGLES */}
      <div className={styles.cameraPanel}>
        <div className={styles.cameraPanelInner}>
          <h3 className={styles.cameraPanelTitle}>Cameras</h3>
          <div className={styles.cameraButtons}>
            {Object.values(CAMERA_VIEWS).map((cam) => (
              <button
                key={cam}
                onClick={() => setView(cam)}
                className={`${styles.cameraButton} ${view === cam ? styles.cameraButtonActive : ''}`}
              >
                <span>{cam}</span>
                {view === cam && <div className={styles.cameraIndicator} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER: Car Title */}
      <div className={styles.carTitle}>
        <div className={styles.carTitleInner}>
          <h2 className={styles.carTitleText}>Tornado GT</h2>
          <div className={styles.carTitleLine} />
        </div>
      </div>
    </>
  );
}

export default CarConfigurator;
