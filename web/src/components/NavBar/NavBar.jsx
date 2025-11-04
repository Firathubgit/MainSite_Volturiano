import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import s from './NavBar.module.css';
import { useTranslation } from 'react-i18next';

export function NavBar() {
  const { t } = useTranslation('nav');
  return (
    <header className={s.header}>
      <div className="space-between">
        <Link to="/" className={s.brand}>VOLTURIANO</Link>
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

