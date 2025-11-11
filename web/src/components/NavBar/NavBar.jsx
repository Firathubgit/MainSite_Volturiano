import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import s from './NavBar.module.css';
import tornadoLogo from '../../assets/Logo/TornadoLogo.png';
import accountIcon from '../../assets/Logo/LoginAccountIcon.png';
import hamburgerIcon from '../../assets/Logo/HamburgerIcon.png';
import { useUserStore } from '../../stores/userStore';
import { useUiStore } from '../../stores/uiStore';
import AccountMenu from '../../features/account/components/AccountMenu';

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['nav', 'common']);
  const [opacity, setOpacity] = useState(1);
  const isHome = location.pathname === '/';
  const session = useUserStore((state) => state.session);
  const toggleAccountMenu = useUiStore((state) => state.toggleAccountMenu);
  const closeAccountMenu = useUiStore((state) => state.closeAccountMenu);
  const toggleNavMenu = useUiStore((state) => state.toggleNavMenu);
  const accountMenuOpen = useUiStore((state) => state.accountMenuOpen);
  const accountButtonRef = useRef(null);

  useEffect(() => {
    function onScroll() {
      const max = 220; // px to fully fade
      const y = window.scrollY || 0;
      const o = Math.max(0, 1 - y / max);
      setOpacity(o);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    closeAccountMenu();
  }, [location.pathname, closeAccountMenu]);

  const handleAccountClick = () => {
    toggleAccountMenu();
  };

  return (
    <header className={s.header} style={{ opacity }}>
      <div className={s.container}>
        <div className={s.left}>
          <button
            type="button"
            className={s.menuButton}
            aria-label={t('nav:aria.openNavigation')}
            onClick={toggleNavMenu}
          >
            <img src={hamburgerIcon} alt="" className={s.menuIcon} />
          </button>
        </div>

        {/* Center logo: clickable unless on home */}
        <div className={s.center}>
          {isHome ? (
            <div className={s.logo} aria-label={t('nav:aria.home')}>
              <img src={tornadoLogo} alt={t('common:brand')} className={s.logoImg} />
            </div>
          ) : (
            <Link to="/" className={s.logo} aria-label={t('nav:aria.home')}>
              <img src={tornadoLogo} alt={t('common:brand')} className={s.logoImg} />
            </Link>
          )}
        </div>

        <div className={s.right}>
          <div className={s.account}>
            <button
              ref={accountButtonRef}
              type="button"
              className={s.accountButton}
              onClick={handleAccountClick}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              <img src={accountIcon} alt={t('common:account')} className={s.accountIcon} />
            </button>
            <AccountMenu anchorRef={accountButtonRef} />
          </div>
        </div>
      </div>

    </header>
  );
}

