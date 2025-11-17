import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../../stores/uiStore';
import { useUserStore } from '../../../stores/userStore';
import { useGarageStore } from '../../../stores/garageStore';
import { signOut } from '../api';
import styles from './AccountMenu.module.css';
import { useRenderLogger } from '../../../debug/useRenderLogger';

export default function AccountMenu({ anchorRef }) {
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const open = useUiStore((state) => state.accountMenuOpen);
  const closeMenu = useUiStore((state) => state.closeAccountMenu);
  const session = useUserStore((state) => state.session);
  const profile = useUserStore((state) => state.profile);
  const resetUserStore = useUserStore((state) => state.reset);
  const resetGarageStore = useGarageStore((state) => state.reset);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('account');
  
  useRenderLogger('AccountMenu', { open, hasSession: !!session, loading });

  useEffect(() => {
    if (!open) return undefined;
    function onClick(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        (!anchorRef?.current || !anchorRef.current.contains(event.target))
      ) {
        closeMenu();
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, closeMenu, anchorRef]);

  if (!open) {
    return null;
  }

  const displayName =
    profile?.display_name ||
    session?.user?.user_metadata?.full_name ||
    t('menu.enter');
  const email = session?.user?.email;

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    
    // Optimistic logout: clear stores and navigate immediately
    // This makes the UI feel instant even if Supabase is slow
    resetUserStore();
    resetGarageStore();
    closeMenu();
    navigate('/', { replace: true });
    
    // Handle actual signOut in background (don't block UI)
    try {
      const { error: signOutError } = await signOut();
      if (signOutError) {
        // Log error but don't show to user since we already logged out locally
        console.warn('Sign out error (non-blocking):', signOutError.message);
      }
    } catch (err) {
      console.warn('Sign out exception (non-blocking):', err);
    } finally {
      setLoading(false);
    }
  };

  const goToGarage = () => {
    closeMenu();
    navigate('/garage');
  };

  const goToVolturianoWorld = () => {
    closeMenu();
    navigate('/account/world');
  };

  const goToProfile = () => {
    closeMenu();
    navigate('/account/profile');
  };

  return (
    <div className={styles.menu} ref={menuRef} role="menu" aria-label={t('menu.ariaLabel')}>
      <div className={styles.header}>
        <span className={styles.name}>{displayName}</span>
        {email && <span className={styles.email}>{email}</span>}
        {!session && (
          <span className={styles.email}>{t('menu.guestSubtitle')}</span>
        )}
      </div>
      <div className={styles.body}>
        {session ? (
          <>
            <button type="button" onClick={goToGarage} className={styles.item}>
              {t('menu.garage')}
            </button>
            <button
              type="button"
              onClick={goToVolturianoWorld}
              className={styles.item}
            >
              {t('menu.volturianoWorld')}
            </button>
            <button type="button" onClick={goToProfile} className={styles.item}>
              {t('menu.settings')}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className={styles.item}
              disabled={loading}
            >
              {loading ? t('menu.signingOut') : t('menu.signOut')}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                navigate('/account/login');
              }}
              className={styles.item}
            >
              {t('menu.signIn')}
            </button>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                navigate('/account/signup');
              }}
              className={styles.item}
            >
              {t('menu.signUp')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

