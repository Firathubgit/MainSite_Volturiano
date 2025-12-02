/**
 * Climate Control App Component
 * Interactive climate controls with visual feedback
 */
import React, { useState } from 'react';
import { Fan, RefreshCw, Power, Snowflake, Wind, Waves } from 'lucide-react';
import styles from './Climate.module.css';

function ToggleButton({ label, active, onClick, icon: Icon, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`${styles.toggleButton} ${
        active
          ? styles.toggleButtonActive
          : danger
            ? styles.toggleButtonDanger
            : styles.toggleButtonInactive
      }`}
    >
      <div className={styles.toggleButtonContent}>
        <Icon size={24} strokeWidth={1.5} />
        <span className={styles.toggleButtonLabel}>{label}</span>
      </div>
      {active && <div className={styles.toggleButtonIndicator} />}
    </button>
  );
}

export function Climate({ theme }) {
  const [activeVents, setActiveVents] = useState(['face']);
  const [fanSpeed, setFanSpeed] = useState(3);
  const [acOn, setAcOn] = useState(true);
  const [autoOn, setAutoOn] = useState(true);
  const [recircOn, setRecircOn] = useState(false);

  const toggleVent = (vent) => {
    setActiveVents((prev) =>
      prev.includes(vent) ? prev.filter((v) => v !== vent) : [...prev, vent]
    );
  };

  return (
    <div className={styles.container}>
      {/* COLUMN 1: MODES & TOGGLES */}
      <div className={styles.modesColumn}>
        <div className={styles.modesPanel}>
          <div>
            <h3 className={styles.panelTitle}>Climate Modes</h3>
            <div className={styles.toggleList}>
              <ToggleButton
                label="A/C"
                active={acOn}
                onClick={() => setAcOn(!acOn)}
                icon={Snowflake}
              />
              <ToggleButton
                label="AUTO"
                active={autoOn}
                onClick={() => setAutoOn(!autoOn)}
                icon={Wind}
              />
              <ToggleButton
                label="Recirc"
                active={recircOn}
                onClick={() => setRecircOn(!recircOn)}
                icon={RefreshCw}
              />
            </div>
          </div>
          <div>
            <ToggleButton
              label="SYSTEM OFF"
              active={false}
              onClick={() => {}}
              icon={Power}
              danger
            />
          </div>
        </div>
      </div>

      {/* COLUMN 2: VISUALIZATION */}
      <div className={styles.vizColumn}>
        <div className={styles.vizPanel}>
          <div className={styles.vizBackground} />
          <div className={styles.vizGlow} />

          <div className={styles.vizContent}>
            <h3 className={styles.vizTitle}>Air Distribution</h3>

            <div className={styles.vizCarContainer}>
              {/* Car Interior Outline */}
              <svg viewBox="0 0 200 400" className={styles.carOutline}>
                <path
                  d="M40,80 C40,40 60,20 100,20 C140,20 160,40 160,80 L160,320 C160,360 140,380 100,380 C60,380 40,360 40,320 Z"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="3"
                />
                {/* Dashboard Line */}
                <line
                  x1="45"
                  y1="120"
                  x2="155"
                  y2="120"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                />
                {/* Airflow Visuals */}
                <path
                  d="M70,100 L130,100"
                  stroke={activeVents.includes('windshield') ? theme.primary : 'transparent'}
                  strokeWidth="5"
                  strokeLinecap="round"
                  className={styles.airflowPath}
                />
                <path
                  d="M60,150 L90,150 M110,150 L140,150"
                  stroke={activeVents.includes('face') ? theme.primary : 'transparent'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={styles.airflowPath}
                />
                <path
                  d="M70,340 L90,340 M110,340 L130,340"
                  stroke={activeVents.includes('feet') ? theme.primary : 'transparent'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={styles.airflowPath}
                />
              </svg>

              {/* Interactive Zones */}
              <div className={styles.ventZones}>
                <button
                  onClick={() => toggleVent('windshield')}
                  className={`${styles.ventButton} ${activeVents.includes('windshield') ? styles.ventButtonActive : ''}`}
                >
                  <Waves size={28} />
                </button>
                <button
                  onClick={() => toggleVent('face')}
                  className={`${styles.ventButton} ${activeVents.includes('face') ? styles.ventButtonActive : ''}`}
                >
                  <Wind size={28} />
                </button>
                <button
                  onClick={() => toggleVent('feet')}
                  className={`${styles.ventButton} ${activeVents.includes('feet') ? styles.ventButtonActive : ''}`}
                >
                  <div className={styles.rotated}>
                    <Waves size={28} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 3: FAN SPEED SLIDER */}
      <div className={styles.fanColumn}>
        <div className={styles.fanPanel}>
          <h3 className={styles.panelTitle}>Intensity</h3>

          <div className={styles.sliderContainer}>
            <div className={styles.sliderTrack}>
              <div
                className={styles.sliderFill}
                style={{ height: `${(fanSpeed / 5) * 100}%` }}
              >
                <div className={styles.sliderGlow} />
              </div>
            </div>

            <div className={styles.sliderSteps}>
              {[5, 4, 3, 2, 1].map((level) => (
                <div
                  key={level}
                  onClick={() => setFanSpeed(level)}
                  className={styles.sliderStep}
                >
                  <div
                    className={`${styles.sliderStepLine} ${fanSpeed >= level ? styles.sliderStepLineActive : ''}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.fanDisplay}>
            <Fan
              size={24}
              className={`${styles.fanIcon} ${fanSpeed > 0 ? styles.fanIconActive : ''}`}
            />
            <span className={styles.fanValue}>{fanSpeed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Climate;
