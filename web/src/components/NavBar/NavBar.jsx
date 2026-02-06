import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import s from './NavBar.module.css';
import tornadoLogo from '../../assets/Logo/TornadoLogo.png';
import accountIcon from '../../assets/Logo/LoginAccountIcon.png';
import accountIconBlack from '../../assets/Logo/LoginAccountIconBlack.png';
import hamburgerIcon from '../../assets/Logo/HamburgerIcon.png';
import hamburgerIconBlack from '../../assets/Logo/HamburgerIconBlack.png';
import blackVolturianoLogo from '../../assets/Logo/BlackvolturianoLogo.png';
import { useUserStore } from '../../stores/userStore';
import { useUiStore } from '../../stores/uiStore';
import AccountMenu from '../../features/account/components/AccountMenu';
import { useRenderLogger } from '../../debug/useRenderLogger';

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['nav', 'common']);
  const [opacity, setOpacity] = useState(1);
  const [theme, setTheme] = useState('dark');
  const isHome = location.pathname === '/';
  const isAgency = location.pathname === '/agency';
  const session = useUserStore((state) => state.session);
  const toggleAccountMenu = useUiStore((state) => state.toggleAccountMenu);
  const closeAccountMenu = useUiStore((state) => state.closeAccountMenu);
  const toggleNavMenu = useUiStore((state) => state.toggleNavMenu);
  const accountMenuOpen = useUiStore((state) => state.accountMenuOpen);
  const platformMode = useUiStore((state) => state.platformMode);
  const accountButtonRef = useRef(null);
  
  useRenderLogger('NavBar', { pathname: location.pathname, isHome, hasSession: !!session, accountMenuOpen });

  // Check theme from body's data-theme attribute (set by Agency page)
  useEffect(() => {
    if (!isAgency) {
      setTheme('dark');
      return;
    }

    const checkTheme = () => {
      const bodyTheme = document.body.getAttribute('data-theme');
      if (bodyTheme) {
        setTheme(bodyTheme);
      } else {
        setTheme('dark');
      }
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, [isAgency]);

  // Determine which icons to use based on theme
  const currentLogo = isAgency && theme === 'light' ? blackVolturianoLogo : tornadoLogo;
  const currentAccountIcon = isAgency && theme === 'light' ? accountIconBlack : accountIcon;
  const currentHamburgerIcon = isAgency && theme === 'light' ? hamburgerIconBlack : hamburgerIcon;

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
            <img src={currentHamburgerIcon} alt="" className={s.menuIcon} />
          </button>
        </div>

        {/* Center logo: clickable unless on home. Route / handles context dynamically via platformMode */}
        <div className={s.center}>
          {isHome ? (
            <div className={s.logo} aria-label={t('nav:aria.home')}>
              <img src={currentLogo} alt={t('common:brand')} className={s.logoImg} />
            </div>
          ) : (
            <Link to="/" className={s.logo} aria-label={t('nav:aria.home')}>
              <img src={currentLogo} alt={t('common:brand')} className={s.logoImg} />
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
              <img src={currentAccountIcon} alt={t('common:account')} className={s.accountIcon} />
            </button>
            <AccountMenu anchorRef={accountButtonRef} />
          </div>
        </div>
      </div>

    </header>
  );
}

