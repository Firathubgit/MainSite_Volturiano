import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../stores/uiStore';
import i18n from '../../providers/i18n';
import styles from './LanguageMenu.module.css';

const LANGUAGE_CODES = ['en', 'sv'];

export default function LanguageMenu({ anchorRef }) {
  const menuRef = useRef(null);
  const open = useUiStore((state) => state.languageMenuOpen);
  const closeMenu = useUiStore((state) => state.closeLanguageMenu);
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const { t } = useTranslation(['nav', 'common']);

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
    function onKey(event) {
      if (event.key === 'Escape') closeMenu();
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeMenu, anchorRef]);

  const handleChange = (code) => {
    i18n.changeLanguage(code);
    closeMenu();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.menu}
          ref={menuRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          role="menu"
        aria-label={t('common:selectLanguage')}
        >
        {LANGUAGE_CODES.map((code) => {
          const active = currentLanguage === code;
            return (
              <button
              key={code}
                type="button"
                className={`${styles.item} ${active ? styles.active : ''}`}
              onClick={() => handleChange(code)}
              >
              <span>{t(`nav:languageNames.${code}`)}</span>
                {active && <span className={styles.activeDot} />}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

