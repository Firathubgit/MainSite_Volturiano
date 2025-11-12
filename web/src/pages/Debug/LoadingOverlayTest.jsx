import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useUserStore } from '../../stores/userStore';
import styles from './LoadingOverlayTest.module.css';

const DEMO_DURATION = 2600;

export default function LoadingOverlayTest() {
  const setForceOverlay = useUiStore((state) => state.setForceOverlay);
  const forceOverlay = useUiStore((state) => state.forceOverlay);
  const simulateAuthCycle = useUserStore((state) => state.simulateAuthCycle);
  const status = useUserStore((state) => state.status);
  const session = useUserStore((state) => state.session);
  const [manualActive, setManualActive] = useState(false);
  const [authCycleActive, setAuthCycleActive] = useState(false);
  const manualTimerRef = useRef(null);
  const authTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (manualTimerRef.current) {
        clearTimeout(manualTimerRef.current);
      }
      if (authTimerRef.current) {
        clearTimeout(authTimerRef.current);
      }
      setForceOverlay(false);
    };
  }, [setForceOverlay]);

  const triggerManualOverlay = useCallback(() => {
    if (manualTimerRef.current) {
      clearTimeout(manualTimerRef.current);
    }
    setManualActive(true);
    setForceOverlay(true);
    manualTimerRef.current = setTimeout(() => {
      setForceOverlay(false);
      setManualActive(false);
      manualTimerRef.current = null;
    }, DEMO_DURATION);
  }, [setForceOverlay]);

  const triggerAuthCycle = useCallback(() => {
    if (authTimerRef.current) {
      clearTimeout(authTimerRef.current);
    }
    setAuthCycleActive(true);
    simulateAuthCycle(DEMO_DURATION);
    authTimerRef.current = setTimeout(() => {
      setAuthCycleActive(false);
      authTimerRef.current = null;
    }, DEMO_DURATION + 200);
  }, [simulateAuthCycle]);

  const overlayEngaged =
    forceOverlay || (!session && (status === 'loading' || status === 'idle'));

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Loading Overlay Stress Test</h1>
        <p className={styles.subtitle}>
          Use the tools below to validate how the global loading overlay behaves during real auth
          hydration cycles and forced display scenarios.
        </p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Manual overlay flicker check</h2>
          <p className={styles.sectionBody}>
            Triggers the overlay directly via the UI store. Use this to inspect animation, opacity,
            or ensure it dismisses after the timeout.
          </p>
          <button
            type="button"
            className={styles.button}
            onClick={triggerManualOverlay}
          >
            {manualActive ? 'Restart Manual Demo' : 'Show Overlay Manually'}
          </button>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Simulated auth refresh</h2>
          <p className={styles.sectionBody}>
            Temporarily clears the session from the user store and rehydrates it after a delay to
            mimic Supabase&apos;s auth listener catching up. Observe whether protected routes or the
            overlay behave as expected during the cycle.
          </p>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={triggerAuthCycle}
          >
            {authCycleActive ? 'Running simulated refresh…' : 'Trigger auth refresh cycle'}
          </button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Live overlay indicators</h3>
          <ul className={styles.metrics}>
            <li>
              <span>Status</span>
              <strong>{status}</strong>
            </li>
            <li>
              <span>Session present</span>
              <strong>{session ? 'yes' : 'no'}</strong>
            </li>
            <li>
              <span>Force overlay flag</span>
              <strong>{forceOverlay ? 'true' : 'false'}</strong>
            </li>
            <li>
              <span>Overlay condition met</span>
              <strong className={overlayEngaged ? styles.active : styles.idle}>
                {overlayEngaged ? 'rendering' : 'hidden'}
              </strong>
            </li>
          </ul>
        </div>

        <p className={styles.note}>
          Tips: Throttle your network in DevTools or navigate between protected routes while
          running the simulated refresh to replicate real-world loading pressure.
        </p>
      </div>
    </div>
  );
}


