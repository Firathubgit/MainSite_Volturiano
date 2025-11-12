import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Showroom.module.css';
import { useShowroomData } from './useShowroomData';
import LeftArrow from '../../assets/showroom/LeftArrowShowroomWhite.png';
import RightArrow from '../../assets/showroom/RightArrowShowroomWhite.png';

const SHIFT = 640;

const slideVariants = {
  enter: (direction) => ({
    x: direction === 1 ? SHIFT : direction === -1 ? -SHIFT : 0,
    opacity: 0,
    scale: 0.94
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction) => ({
    x: direction === 1 ? -SHIFT : direction === -1 ? SHIFT : 0,
    opacity: 0,
    scale: 0.94
  })
};

function getStatusLabel(status, t) {
  const normalized = (status ?? '').toString().toLowerCase().replace(/[\s_]+/g, '-');
  if (normalized.includes('available')) {
    return t('showroom:status.availableNow');
  }
  if (normalized.includes('soon')) {
    return t('showroom:status.comingSoon');
  }
  return status;
}

function resolveCtaLabel(labelKey, label, t) {
  if (labelKey) {
    return t(labelKey, { defaultValue: label ?? labelKey });
  }
  if (label) {
    return label;
  }
  return '';
}

export default function Showroom({ initialIndex = 0 }) {
  const { items, loading } = useShowroomData();
  const { t } = useTranslation(['showroom', 'common']);
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0); // -1 left, +1 right
  const [lastSwitchAt, setLastSwitchAt] = useState(0);

  const count = items.length;

  const canSwitch = useCallback(() => {
    const now = Date.now();
    if (now - lastSwitchAt < 900) return false;
    return true;
  }, [lastSwitchAt]);

  const prev = useCallback(() => {
    if (!canSwitch()) return;
    setDirection(-1);
    setIndex(i => (i - 1 + count) % count);
    setLastSwitchAt(Date.now());
  }, [canSwitch, count]);
  const next = useCallback(() => {
    if (!canSwitch()) return;
    setDirection(1);
    setIndex(i => (i + 1) % count);
    setLastSwitchAt(Date.now());
  }, [canSwitch, count]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  const active = items[index] ?? null;
  const prevItem = items[(index - 1 + count) % count] ?? null;
  const nextItem = items[(index + 1) % count] ?? null;

  // Don't render if no items at all (not even local fallback)
  if (count === 0) return null;
  
  // Show loading state but still render with local data
  // This ensures the component appears immediately
  if (!active) return null;

  return (
    <section className={styles.container} aria-label={t('showroom:aria.section')}>
      <div className={styles.stage}>
        <header className={styles.header}>
          <h2 className={styles.title}>{active.name}</h2>
          <div className={styles.subtitle}>
            {getStatusLabel(active.status, t)}
          </div>
        </header>

        <div className={styles.track} role="region" aria-live="polite">
          <AnimatePresence initial={false} custom={direction}>
            {prevItem && (
              <motion.img
                key={`peek-left-${prevItem.id}`}
                src={prevItem.image}
                alt=""
                className={`${styles.peek} ${styles.peekLeft}`}
                initial={{ opacity: 0, x: -80 }}
                animate={{ opacity: 0.35, x: 0 }}
                exit={{ opacity: 0, x: -80 }}
                transition={{ duration: 0.4 }}
              />
            )}
            {nextItem && (
              <motion.img
                key={`peek-right-${nextItem.id}`}
                src={nextItem.image}
                alt=""
                className={`${styles.peek} ${styles.peekRight}`}
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 0.35, x: 0 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ duration: 0.4 }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence initial={false} custom={direction}>
              <motion.div
              key={active.id}
                className={styles.slide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 210, damping: 26 }}
            >
              <img src={active.image} alt={active.name} className={styles.image} />
              </motion.div>
          </AnimatePresence>

          <div className={styles.nav} aria-hidden="false">
            <button className={styles.btn} onClick={prev} aria-label={t('showroom:aria.previous')} type="button">
              <img src={LeftArrow} alt="" className={styles.btnIcon} />
            </button>
            <button className={styles.btn} onClick={next} aria-label={t('showroom:aria.next')} type="button">
              <img src={RightArrow} alt="" className={styles.btnIcon} />
            </button>
          </div>
        </div>

        <div className={styles.cta}>
          {active.cta?.primaryTo && (
            <Link to={active.cta.primaryTo} className={styles.primary}>
              {resolveCtaLabel(active.cta.primaryLabelKey, active.cta.primaryLabel, t)}
            </Link>
          )}
          {active.cta?.secondaryTo && active.status === 'available' && (
            <Link to={active.cta.secondaryTo} className={styles.secondary}>
              {resolveCtaLabel(active.cta.secondaryLabelKey, active.cta.secondaryLabel, t)}
            </Link>
          )}
        </div>

        <span className={styles.visuallyHidden}>{t('showroom:aria.hint')}</span>
      </div>
    </section>
  );
}


