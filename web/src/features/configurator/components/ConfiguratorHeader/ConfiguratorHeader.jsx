import React from 'react';
import { Link } from 'react-router-dom';
import { useUiStore } from '../../../../stores/uiStore';
import tornadoLogo from '../../../../assets/Logo/TornadoLogo.png';
import accountIcon from '../../../../assets/Logo/LoginAccountIcon.png';
import hamburgerIcon from '../../../../assets/Logo/HamburgerIcon.png';
import styles from './ConfiguratorHeader.module.css';

/**
 * ConfiguratorHeader Component
 * Dedicated header for configurator page matching Fiverr design
 */
export default function ConfiguratorHeader({ 
  onViewSpecs,
  showGrid,
  onToggleGrid 
}) {
  const toggleNavMenu = useUiStore((state) => state.toggleNavMenu);
  const toggleAccountMenu = useUiStore((state) => state.toggleAccountMenu);

  return (
    <header className={styles.header}>
      {/* Left: Menu Trigger */}
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={toggleNavMenu}
          aria-label="Open navigation menu"
        >
          <img src={hamburgerIcon} alt="Menu" width="28" height="28" />
        </button>
      </div>

      {/* Center: Logo */}
      <div className={styles.center}>
        <Link to="/" className={styles.logoLink}>
          <img 
            src={tornadoLogo} 
            alt="Volturiano" 
            className={styles.logo}
          />
        </Link>
      </div>

      {/* Right: Actions */}
      <div className={styles.right}>
        {/* Dev Grid Toggle */}
        <button
          type="button"
          className={`${styles.devGridButton} ${showGrid ? styles.active : ''}`}
          onClick={onToggleGrid}
          aria-label="Toggle dev grid"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <span>DEV_GRID</span>
        </button>

        {/* View Specs Button */}
        <button
          type="button"
          className={styles.viewSpecsButton}
          onClick={onViewSpecs}
        >
          View Specs
        </button>

        {/* User Icon */}
        <button
          type="button"
          className={styles.userButton}
          onClick={toggleAccountMenu}
          aria-label="Account menu"
        >
          <img src={accountIcon} alt="Account" width="24" height="24" />
        </button>
      </div>
    </header>
  );
}

