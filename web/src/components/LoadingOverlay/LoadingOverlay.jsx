import React from 'react';
import tornadoLogo from '../../assets/Logo/TornadoLogo.png';
import styles from './LoadingOverlay.module.css';

export default function LoadingOverlay({ show = true }) {
  if (!show) {
    return null;
  }

  return (
    <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.logoWrapper}>
        <div className={styles.logo} style={{ '--logo-url': `url(${tornadoLogo})` }} />
        <span className={styles.srOnly}>Loading</span>
      </div>
    </div>
  );
}


