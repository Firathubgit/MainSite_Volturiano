import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../stores/uiStore';
import useNavModels from './useNavModels';
import styles from './NavDrawer.module.css';
import accountIcon from '../../assets/Logo/LoginAccountIcon.png';
import languageIcon from '../../assets/Logo/ChangeLanguageicon.png';
import LanguageMenu from './LanguageMenu';

function mapModelStatus(status, t) {
  const normalized = (status ?? '').toString().toLowerCase().replace(/[\s_]+/g, '-');
  if (normalized.includes('available')) {
    return t('showroom:status.availableNow');
  }
  if (normalized.includes('soon')) {
    return t('showroom:status.comingSoon');
  }
  return status;
}

export default function NavDrawer() {
  const open = useUiStore((state) => state.navMenuOpen);
  const closeMenu = useUiStore((state) => state.closeNavMenu);
  const closeLanguageMenu = useUiStore((state) => state.closeLanguageMenu);
  const toggleLanguageMenu = useUiStore((state) => state.toggleLanguageMenu);
  const { items } = useNavModels();
  const navigate = useNavigate();
  const location = useLocation();
  const worldEnabled = import.meta.env.VITE_ENABLE_WORLD === 'true';
  const languageButtonRef = useRef(null);
  const { t } = useTranslation(['nav', 'common', 'showroom']);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        closeLanguageMenu();
        closeMenu();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeMenu, closeLanguageMenu]);

  useEffect(() => {
    if (!open) {
      closeLanguageMenu();
    }
  }, [open, closeLanguageMenu]);

  useEffect(() => {
    closeMenu();
    closeLanguageMenu();
  }, [location.pathname, closeMenu, closeLanguageMenu]);

  const handleClose = () => {
    closeLanguageMenu();
    closeMenu();
  };

  const goTo = (path) => {
    navigate(path);
    handleClose();
  };

  const goToModel = (slug) => {
    navigate(`/models?model=${slug}`);
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={styles.scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />
          <motion.aside
            className={styles.drawer}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className={styles.layout}>
              <div className={styles.leftPane}>
                <div className={styles.leftHeader}>
                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={handleClose}
                    aria-label={t('nav:aria.closeNavigation')}
                  >
                    ×
                  </button>
                </div>
                <nav className={styles.primaryNav}>
                  <button
                    type="button"
                    onClick={() => goTo('/models')}
                    className={styles.navItem}
                  >
                    <span>{t('nav:drawer.models')}</span>
                    <span className={styles.arrow}>›</span>
                  </button>
                  {worldEnabled && (
                    <button
                      type="button"
                      onClick={() => goTo('/world')}
                      className={styles.navItem}
                    >
                      <span>{t('nav:drawer.world')}</span>
                      <span className={styles.arrow}>›</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => goTo('/configurator')}
                    className={styles.navItem}
                  >
                    <span>{t('nav:drawer.configurator')}</span>
                    <span className={styles.arrow}>›</span>
                  </button>
                </nav>
                <div className={styles.leftFooter}>
                  <button
                    type="button"
                    className={styles.footerAction}
                    onClick={() => goTo('/account/login')}
                  >
                    <img src={accountIcon} alt="" className={styles.footerIcon} />
                    {t('nav:drawer.account')}
                  </button>
                  <div className={styles.languageWrapper}>
                    <button
                      ref={languageButtonRef}
                      type="button"
                      className={styles.footerAction}
                      onClick={toggleLanguageMenu}
                      aria-haspopup="menu"
                      aria-label={t('common:selectLanguage')}
                    >
                      <img src={languageIcon} alt="" className={styles.footerIcon} />
                      {t('nav:drawer.language')}
                    </button>
                    <LanguageMenu anchorRef={languageButtonRef} />
                  </div>
                </div>
              </div>
              <div className={styles.rightPane}>
                <h3 className={styles.sectionTitle}>{t('nav:drawer.models')}</h3>
                <ul className={styles.modelList}>
                  {items.map((model) => (
                    <li key={model.id}>
                      <button
                        type="button"
                        onClick={() => goToModel(model.slug)}
                        className={styles.modelRow}
                      >
                        <div className={styles.modelCopy}>
                          <span className={styles.modelName}>{model.name}</span>
                          {model.status && (
                            <span className={styles.modelBadge}>
                              {mapModelStatus(model.status, t)}
                            </span>
                          )}
                        </div>
                        {model.image && (
                          <img src={model.image} alt={model.name} className={styles.modelImage} />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

