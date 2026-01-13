import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../stores/uiStore';
import styles from './AgencyMenu.module.css';

const menuVariants = {
  initial: {
    y: '-100%',
  },
  animate: {
    y: '0%',
    transition: {
      duration: 0.5,
      ease: [0.76, 0, 0.24, 1],
    },
  },
  exit: {
    y: '-100%',
    transition: {
      duration: 0.5,
      ease: [0.76, 0, 0.24, 1],
    },
  },
};

const containerVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
  },
};

const itemVariants = {
  initial: {
    y: 50,
    opacity: 0,
    skewY: 5,
  },
  animate: {
    y: 0,
    opacity: 1,
    skewY: 0,
    transition: {
      duration: 0.5,
      ease: [0.19, 1, 0.22, 1],
    },
  },
  exit: {
    y: -30,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export default function AgencyMenu() {
  const open = useUiStore((state) => state.navMenuOpen);
  const closeMenu = useUiStore((state) => state.closeNavMenu);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('nav');

  const toggleLanguage = () => {
    const newLang = i18n.language === 'sv' ? 'en' : 'sv';
    i18n.changeLanguage(newLang);
  };

  const handleClose = () => {
    closeMenu();
  };

  const handleNavigate = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleClose();
  };

  const menuItems = [
    { id: 'home', label: t('agencyMenu.home'), path: '/agency' },
    { id: 'about', label: t('agencyMenu.about'), path: '/agency/about' },
    { id: 'references', label: t('agencyMenu.references'), path: '/agency/references' },
    { id: 'services', label: t('agencyMenu.services'), path: '/agency/services' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={menuVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={styles.menuOverlay}
        >
          {/* Decorative Background Elements */}
          <div className={styles.decorativeBackground}>
            <div className={styles.blurCircle1}></div>
            <div className={styles.blurCircle2}></div>
          </div>

          {/* Close Button - Moved to Top Left */}
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label={t('aria.closeNavigation')}
          >
            <span className={styles.closeIcon}>×</span>
            <span className={styles.closeText}>CLOSE</span>
          </button>

          {/* Language Button - Top Right */}
          <button
            className={styles.languageButton}
            onClick={toggleLanguage}
            aria-label={t('agencyMenu.changeLanguage', 'Change Language')}
          >
            <span className={styles.languageText}>{i18n.language === 'sv' ? 'EN' : 'SV'}</span>
          </button>

          {/* Menu Items */}
          <motion.div
            variants={containerVariants}
            className={styles.menuContainer}
          >
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <div key={item.id} className={styles.menuItemWrapper}>
                  <motion.button
                    variants={itemVariants}
                    onClick={() => handleNavigate(item.path)}
                    className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
                  >
                    <span className={styles.menuItemText}>{item.label}</span>
                    <span className={styles.menuItemUnderline}></span>
                  </motion.button>
                </div>
              );
            })}
          </motion.div>

          {/* Footer Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5, transition: { delay: 0.8 } }}
            className={styles.footerText}
          >
            {t('agencyMenu.basedIn')}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

