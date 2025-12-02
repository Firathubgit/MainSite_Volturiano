/**
 * Main Infotainment App Component
 * Complete car OS interface with boot sequence, apps, and controls
 */
import React, { useEffect } from 'react';
import {
  Fan,
  Map as MapIcon,
  Music,
  Settings,
  Battery,
  Wifi,
  Bluetooth,
  RotateCw,
  Plus,
  Minus,
  LayoutGrid,
  Armchair,
  Phone,
  Palette,
  Disc,
  Info,
  Zap,
  Smartphone,
} from 'lucide-react';
import useInfotainmentStore from '../../stores/infotainmentStore';
import {
  DRIVE_MODES,
  APP_IDS,
  THEMES,
  CAR_PAINTS,
  RIM_COLORS,
} from '../../constants/infotainmentConstants';
import { Scene } from '../Scene/Scene';
import { CarConfigurator } from '../apps/CarConfigurator/CarConfigurator';
import { Navigation } from '../apps/Navigation/Navigation';
import { Media } from '../apps/Media/Media';
import { Climate } from '../apps/Climate/Climate';
import TornadoLogo from '../../../../assets/Logo/TornadoLogo.png';
import styles from './InfotainmentApp.module.css';

function DockIcon({ icon: Icon, id, activeApp, setActiveApp }) {
  const isActive = activeApp === id;
  return (
    <button onClick={() => setActiveApp(id)} className={styles.dockIcon}>
      <div className={`${styles.dockIconInner} ${isActive ? styles.dockIconActive : ''}`}>
        <Icon size={26} strokeWidth={1.5} />
      </div>
      <div className={`${styles.dockIndicator} ${isActive ? styles.dockIndicatorActive : ''}`} />
    </button>
  );
}

export function InfotainmentApp() {
  const {
    booting,
    bootProgress,
    setBooting,
    setBootProgress,
    driveMode,
    setDriveMode,
    cameraView,
    setCameraView,
    activeApp,
    setActiveApp,
    carConfig,
    setCarColor,
    setRimColor,
    driverTemp,
    passTemp,
    setDriverTemp,
    setPassTemp,
    isMobile,
    setIsMobile,
  } = useInfotainmentStore();

  const theme = THEMES[driveMode];

  // Mobile Check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || window.innerHeight > window.innerWidth);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // Boot Sequence
  useEffect(() => {
    if (booting) {
      const interval = setInterval(() => {
        setBootProgress(bootProgress + 2);
        if (bootProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => setBooting(false), 800);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [booting, bootProgress, setBootProgress, setBooting]);

  return (
    <>
      {/* BOOT SCREEN */}
      {booting && (
        <div className={styles.bootScreen}>
          <div className={styles.bootLogo}>
            <img src={TornadoLogo} alt="Volturiano Logo" className={styles.bootIcon} />
            <div className={styles.bootGlow} />
          </div>
          <h1 className={styles.bootTitle}>
            VOLTURIANO <span className={styles.bootAccent}>OS</span>
          </h1>
          <div className={styles.bootProgressTrack}>
            <div className={styles.bootProgressFill} style={{ width: `${bootProgress}%` }} />
          </div>
          <p className={styles.bootText}>INITIALIZING SYSTEMS...</p>
        </div>
      )}

      {/* MOBILE OVERLAY */}
      {isMobile && (
        <div className={styles.mobileOverlay}>
          <RotateCw size={48} className={styles.mobileIcon} />
          <h1 className={styles.mobileTitle}>DESKTOP CLASS UI</h1>
          <p className={styles.mobileText}>
            The Volturiano OS Experience is designed for horizontal widescreen displays.
            Please rotate your device or switch to a desktop browser.
          </p>
          <div className={styles.mobileBadge}>
            <Smartphone size={16} />
            <span>Rotate to Landscape</span>
          </div>
        </div>
      )}

      {/* DEVELOPMENT OVERLAY */}
      <div className={styles.devOverlay}>UNDER DEVELOPMENT</div>

      <div className={styles.container}>
        {/* OS CONTAINER */}
        <div
          className={styles.osContainer}
          style={{
            background:
              activeApp === APP_IDS.CAR
                ? `radial-gradient(circle at 50% 60%, ${theme.auraColor} 0%, #111111 70%)`
                : '#111111',
          }}
        >
          {/* 3D LAYER */}
          <div
            className={`${styles.sceneLayer} ${
              activeApp === APP_IDS.NAV
                ? styles.sceneHidden
                : activeApp !== APP_IDS.CAR
                  ? styles.sceneBlurred
                  : ''
            }`}
          >
            <Scene mode={driveMode} carConfig={carConfig} cameraView={cameraView} />
          </div>

          {/* Grid Texture */}
          {activeApp !== APP_IDS.NAV && <div className={styles.gridTexture} />}

          {/* UI LAYER */}
          <div className={styles.uiLayer}>
            {/* TOP BAR */}
            <header className={styles.topBar}>
              <div className={styles.driveModes}>
                {Object.values(DRIVE_MODES).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDriveMode(m)}
                    className={`${styles.driveModeBtn} ${driveMode === m ? styles.driveModeBtnActive : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className={styles.statusIcons}>
                <span className={styles.clock}>12:45</span>
                <div className={styles.statusIconGroup}>
                  <Wifi size={16} />
                  <Bluetooth size={16} />
                  <Battery size={16} className={styles.batteryIcon} />
                </div>
              </div>
            </header>

            {/* MAIN CONTENT */}
            <main className={styles.mainContent}>
              {activeApp === APP_IDS.CAR && (
                <div className={styles.appWrapper}>
                  <CarConfigurator
                    mode={driveMode}
                    theme={theme}
                    view={cameraView}
                    setView={setCameraView}
                  />
                </div>
              )}

              {activeApp === APP_IDS.NAV && <Navigation theme={theme} />}

              {activeApp === APP_IDS.MEDIA && (
                <div className={styles.appWrapperPanel}>
                  <div className={styles.panelStyle}>
                    <Media theme={theme} />
                  </div>
                </div>
              )}

              {activeApp === APP_IDS.CLIMATE && (
                <div className={styles.appWrapperPanel}>
                  <div className={styles.panelStyle}>
                    <div className={styles.panelPadding}>
                      <Climate theme={theme} />
                    </div>
                  </div>
                </div>
              )}

              {activeApp === APP_IDS.SETTINGS && (
                <div className={styles.appWrapperPanel}>
                  <div className={`${styles.panelStyle} ${styles.settingsPanel}`}>
                    <div className={styles.settingsLeft}>
                      <h2 className={styles.settingsTitle}>GARAGE SETTINGS</h2>
                      <p className={styles.settingsDesc}>
                        Customize vehicle configuration and preferences.
                      </p>

                      {/* Paint Selector */}
                      <div className={styles.optionSection}>
                        <div className={styles.optionHeader}>
                          <Palette size={16} />
                          <h3 className={styles.optionTitle}>Exterior Paint</h3>
                        </div>
                        <div className={styles.paintGrid}>
                          {CAR_PAINTS.map((paint) => (
                            <button
                              key={paint.name}
                              onClick={() => setCarColor(paint.value)}
                              className={`${styles.paintSwatch} ${carConfig.color === paint.value ? styles.paintSwatchActive : ''}`}
                              style={{ backgroundColor: paint.value }}
                              title={paint.name}
                            >
                              {carConfig.color === paint.value && (
                                <div className={styles.paintIndicator} />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Rim Selector */}
                      <div className={styles.optionSection}>
                        <div className={styles.optionHeader}>
                          <Disc size={16} />
                          <h3 className={styles.optionTitle}>Wheel Alloys</h3>
                        </div>
                        <div className={styles.rimButtons}>
                          {RIM_COLORS.map((rim) => (
                            <button
                              key={rim.name}
                              onClick={() => setRimColor(rim.value)}
                              className={`${styles.rimButton} ${carConfig.rimColor === rim.value ? styles.rimButtonActive : ''}`}
                            >
                              {rim.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={styles.settingsRight}>
                      <div className={styles.sysInfoHeader}>
                        <Info size={20} />
                        <h3 className={styles.sysInfoTitle}>System Information</h3>
                      </div>
                      <div className={styles.sysInfoList}>
                        <div className={styles.sysInfoRow}>
                          <span className={styles.sysInfoLabel}>Vehicle ID</span>
                          <span className={styles.sysInfoValue}>VOLT-GT-X-2025</span>
                        </div>
                        <div className={styles.sysInfoRow}>
                          <span className={styles.sysInfoLabel}>Software Version</span>
                          <span className={styles.sysInfoValue}>v3.0.1 (Stable)</span>
                        </div>
                        <div className={`${styles.sysInfoRow} ${styles.sysInfoRowLast}`}>
                          <span className={styles.sysInfoLabel}>Odometer</span>
                          <span className={styles.sysInfoValue}>1,240 mi</span>
                        </div>
                      </div>
                      <div className={styles.updateSection}>
                        <button className={styles.updateButton}>Check for Updates</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeApp === APP_IDS.ENERGY && (
                <div className={styles.placeholderWrapper}>
                  <div className={styles.placeholder}>
                    <Settings size={48} className={styles.placeholderIcon} />
                    <h2 className={styles.placeholderTitle}>SYSTEM MODULE</h2>
                    <p className={styles.placeholderText}>Diagnostic Mode Active</p>
                  </div>
                </div>
              )}
            </main>

            {/* FOOTER / COMMAND BAR */}
            <footer className={styles.footer}>
              {/* LEFT: DRIVER CONTROL */}
              <div className={styles.footerLeft}>
                <button className={styles.seatButton}>
                  <Armchair size={22} strokeWidth={1.5} />
                  <span className={styles.seatLabel}>Auto</span>
                </button>
                <div className={styles.footerDivider} />
                <div className={styles.tempControl}>
                  <button
                    onClick={() => setDriverTemp(driverTemp - 0.5)}
                    className={styles.tempButton}
                  >
                    <Minus size={18} />
                  </button>
                  <div className={styles.tempDisplay}>
                    <span className={styles.tempValue}>{driverTemp.toFixed(1)}</span>
                  </div>
                  <button
                    onClick={() => setDriverTemp(driverTemp + 0.5)}
                    className={styles.tempButton}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* CENTER: DOCK */}
              <div className={styles.dock}>
                <div className={styles.dockIcons}>
                  <DockIcon
                    icon={LayoutGrid}
                    id={APP_IDS.CAR}
                    activeApp={activeApp}
                    setActiveApp={setActiveApp}
                  />
                  <div className={styles.dockDivider} />
                  <DockIcon
                    icon={MapIcon}
                    id={APP_IDS.NAV}
                    activeApp={activeApp}
                    setActiveApp={setActiveApp}
                  />
                  <DockIcon
                    icon={Music}
                    id={APP_IDS.MEDIA}
                    activeApp={activeApp}
                    setActiveApp={setActiveApp}
                  />
                  <DockIcon
                    icon={Phone}
                    id={APP_IDS.ENERGY}
                    activeApp={activeApp}
                    setActiveApp={setActiveApp}
                  />
                  <DockIcon
                    icon={Fan}
                    id={APP_IDS.CLIMATE}
                    activeApp={activeApp}
                    setActiveApp={setActiveApp}
                  />
                  <DockIcon
                    icon={Settings}
                    id={APP_IDS.SETTINGS}
                    activeApp={activeApp}
                    setActiveApp={setActiveApp}
                  />
                </div>
              </div>

              {/* RIGHT: PASSENGER CONTROL */}
              <div className={styles.footerRight}>
                <div className={styles.tempControl}>
                  <button
                    onClick={() => setPassTemp(passTemp - 0.5)}
                    className={styles.tempButton}
                  >
                    <Minus size={18} />
                  </button>
                  <div className={styles.tempDisplay}>
                    <span className={styles.tempValue}>{passTemp.toFixed(1)}</span>
                  </div>
                  <button
                    onClick={() => setPassTemp(passTemp + 0.5)}
                    className={styles.tempButton}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className={styles.footerDivider} />
                <button className={styles.seatButton}>
                  <Armchair size={22} strokeWidth={1.5} />
                  <span className={styles.seatLabel}>Off</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}

export default InfotainmentApp;

