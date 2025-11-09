import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import s from './NavBar.module.css';
import { useTranslation } from 'react-i18next';
import tornadoLogo from '../../assets/Logo/TornadoLogo.png';

export function NavBar() {
  const { t } = useTranslation('nav');
  const location = useLocation();
  const [opacity, setOpacity] = useState(1);
  const isHome = location.pathname === '/';

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

  return (
    <header className={s.header} style={{ opacity }}>
      <div className={s.container}>
        <div className={s.left}>
          <Link to="/" className={s.brand}>VOLTURIANO</Link>
        </div>

        {/* Center logo: clickable unless on home */}
        <div className={s.center}>
          {isHome ? (
            <div className={s.logo} aria-label="Volturiano home">
              <img src={tornadoLogo} alt="Volturiano" className={s.logoImg} />
            </div>
          ) : (
            <Link to="/" className={s.logo} aria-label="Volturiano home">
              <img src={tornadoLogo} alt="Volturiano" className={s.logoImg} />
            </Link>
          )}
        </div>

        <div className={s.right}>
          <nav className={s.nav} aria-label="Primary">
            <NavLink to="/">{t('home')}</NavLink>
            <NavLink to="/models">{t('models')}</NavLink>
            <NavLink to="/configurator">{t('configurator')}</NavLink>
            {import.meta.env.VITE_ENABLE_WORLD === 'true' && (
              <NavLink to="/world">{t('world')}</NavLink>
            )}
            {import.meta.env.VITE_ENABLE_INVEST === 'true' && (
              <NavLink to="/investor">{t('investor')}</NavLink>
            )}
          </nav>
        </div>
      </div>

      <div className={s.modes} role="tablist" aria-label="Subbrands">
        <button role="tab" data-theme="base">{t('base')}</button>
        <span className={s.sep}>|</span>
        <button role="tab" data-theme="sport">{t('sport')}</button>
        <span className={s.sep}>|</span>
        <button role="tab" data-theme="luxury">{t('luxury')}</button>
      </div>
    </header>
  );
}

