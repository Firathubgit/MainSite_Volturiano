import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import styles from './Showroom.module.css';
import { useShowroomData } from './useShowroomData';
import LeftArrow from '../../assets/showroom/LeftArrowShowroomWhite.png';
import RightArrow from '../../assets/showroom/RightArrowShowroomWhite.png';

export default function Showroom({ initialIndex = 0 }) {
  const { items, loading } = useShowroomData();
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0); // -1 left, +1 right

  const count = items.length;
  const prev = useCallback(() => {
    setDirection(-1);
    setIndex(i => (i - 1 + count) % count);
  }, [count]);
  const next = useCallback(() => {
    setDirection(1);
    setIndex(i => (i + 1) % count);
  }, [count]);

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
  const left = items[(index - 1 + count) % count] ?? null;
  const right = items[(index + 1) % count] ?? null;
  const slides = useMemo(() => [
    { key: left?.id ?? 'left', item: left, pos: -1 },
    { key: active?.id ?? 'active', item: active, pos: 0 },
    { key: right?.id ?? 'right', item: right, pos: 1 }
  ], [left, active, right]);

  if (loading) return null;
  if (!active) return null;

  return (
    <section className={styles.container} aria-label="Model showroom">
      <div className={styles.stage}>
        <header className={styles.header}>
          <h2 className={styles.title}>{active.name}</h2>
          <div className={styles.subtitle}>
            {active.status === 'available' ? 'Available now' : 'Coming soon'}
          </div>
        </header>

        <div className={styles.track} role="region" aria-live="polite">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            {slides.map(({ key, item, pos }) => (
              <motion.div
                key={key}
                className={styles.slide}
                initial={{ opacity: 0, x: (pos - direction) * 420, scale: pos === 0 ? 0.85 : 0.55 }}
                animate={{ opacity: pos === 0 ? 1 : 0.6, x: pos * 420, scale: pos === 0 ? 0.85 : 0.55 }}
                exit={{ opacity: 0, x: (pos + direction) * -420 }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                style={{
                  pointerEvents: pos === 0 ? 'auto' : 'none',
                  zIndex: pos === 0 ? 3 : (pos === -1 ? 2 : 1) // center always on top
                }}
              >
                {item && (
                  <>
                    <img src={item.image} alt={item.name} className={styles.image} />
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <div className={styles.nav} aria-hidden="false">
            <button className={styles.btn} onClick={prev} aria-label="Previous model" type="button">
              <img src={LeftArrow} alt="" className={styles.btnIcon} />
            </button>
            <button className={styles.btn} onClick={next} aria-label="Next model" type="button">
              <img src={RightArrow} alt="" className={styles.btnIcon} />
            </button>
          </div>
        </div>

        <div className={styles.cta}>
          {active.cta?.primaryTo && <Link to={active.cta.primaryTo} className={styles.primary}>{active.cta.primaryLabel}</Link>}
          {active.cta?.secondaryTo && active.status === 'available' && <Link to={active.cta.secondaryTo} className={styles.secondary}>{active.cta.secondaryLabel}</Link>}
        </div>

        <span className={styles.visuallyHidden}>Use arrows to browse available and upcoming models.</span>
      </div>
    </section>
  );
}


