import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './StartAnim.module.css';

// Load any images placed in src/assets/start using Vite's glob import
const localModules = import.meta.glob('../../assets/start/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  as: 'url'
});
const LOCAL_ASSETS = Object.entries(localModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);
// Fallback placeholders if folder is empty
const PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1549921296-3b4a4f5bd7f7?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop'
];
const IMAGE_URLS = (LOCAL_ASSETS.length ? LOCAL_ASSETS : PLACEHOLDERS).slice(0, 6);

const SHUFFLE_MS = 200; // 5 images per second
const MOVE_DURATION = 0.5; // seconds
const SHUFFLE_TOTAL_MS = 3000; // 3 seconds
const MAX_SCALES = [1, 0.85, 0.7, 0.55, 0.4, 0.25]; // per-depth cap scales (top -> bottom)
const SPREAD_OFFSET = 30; // push the whole spread slightly downward to center better
const FADE_ITEM_DELAY = 0.05; // seconds per item cascade (faster)
const FADE_ITEM_DURATION = 0.15; // seconds per item fade (faster)
const ENLARGE_MS = 450; // time to \"pop\" the hero before stacking
const TOP_STACK_SCALE = 1.35; // keep enlarged scale for the top card in stack/spread
const ENLARGE_Y = -6; // keep Y consistent across phases to avoid a visible tick

export default function StartAnim() {
  const navigate = useNavigate();
  const { t: tStart } = useTranslation('start');
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('move'); // move -> shuffle -> stack -> spread -> fade
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const intervalRef = useRef(null);
  const startRef = useRef(Date.now());
  const DEBUG = true;
  const t = () => (((Date.now() - startRef.current) / 1000).toFixed(3) + 's');
  const log = (...args) => {
    if (DEBUG) console.log('[StartAnim', t() + ']', ...args);
  };

  const currentImage = useMemo(() => IMAGE_URLS[index % IMAGE_URLS.length], [index]);

  useEffect(() => {
    log('mount, images', IMAGE_URLS.length);
    // Start shuffling immediately
    intervalRef.current = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % IMAGE_URLS.length;
        log('shuffle tick ->', next, IMAGE_URLS[next]);
        return next;
      });
    }, SHUFFLE_MS);

    // Timeline
    const toShuffle = setTimeout(() => {
      log('timer: toShuffle');
      setPhase('shuffle');
    }, MOVE_DURATION * 1000);
    const toEnlarge = setTimeout(() => {
      log('timer: toEnlarge');
      setPhase('enlarge');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        log('stopped shuffle interval');
      }
    }, SHUFFLE_TOTAL_MS);
    const toStack = setTimeout(() => {
      log('timer: toStack');
      setPhase('stack');
    }, SHUFFLE_TOTAL_MS + ENLARGE_MS);
    const toSpread = setTimeout(() => {
      log('timer: toSpread');
      setPhase('spread');
    }, SHUFFLE_TOTAL_MS + ENLARGE_MS + 500);
    // Hold 1s AFTER the 0.5s spread completes before fading
    const toFade = setTimeout(() => {
      log('timer: toFade');
      setPhase('fade');
    }, SHUFFLE_TOTAL_MS + ENLARGE_MS + 1500);
    // Start overlay fade after individual cards have faded out
    const cascadeMs = ((Math.min(IMAGE_URLS.length, 6) - 1) * FADE_ITEM_DELAY + FADE_ITEM_DURATION) * 1000 + 100;
    const toOpacity = setTimeout(() => {
      log('timer: toOpacity (overlay fade start)');
      setOverlayOpacity(0);
    }, SHUFFLE_TOTAL_MS + ENLARGE_MS + 1500 + cascadeMs);
    const toHome = setTimeout(() => {
      sessionStorage.setItem('startPlayed', '1');
      log('timer: toHome navigate /');
      navigate('/', { replace: true });
    }, SHUFFLE_TOTAL_MS + ENLARGE_MS + 1500 + cascadeMs + 600);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(toShuffle);
      clearTimeout(toStack);
      clearTimeout(toSpread);
      clearTimeout(toFade);
      clearTimeout(toOpacity);
      clearTimeout(toHome);
    };
  }, [navigate]);

  const stackImages = useMemo(() => {
    const first = currentImage;
    const rest = IMAGE_URLS.filter((u) => u !== first);
    return [first, ...rest].slice(0, 6);
  }, [currentImage]);
  const stackYOffsets = useMemo(() => {
    const count = 6;
    const baseGap = 18; // tighter px before scaling
    const arr = new Array(count).fill(0);
    for (let i = 1; i < count; i++) {
      // accumulate gaps scaled by size of the previous card so spacing correlates with size
      const prevScale = MAX_SCALES[i - 1] ?? MAX_SCALES[MAX_SCALES.length - 1];
      arr[i] = arr[i - 1] + Math.round(baseGap * prevScale);
    }
    return arr;
  }, []);

  useEffect(() => {
    log('phase ->', phase);
  }, [phase]);

  useEffect(() => {
    log('overlayOpacity ->', overlayOpacity);
  }, [overlayOpacity]);

  useEffect(() => {
    log('stack images top ->', stackImages[0]);
  }, [stackImages]);

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 1 }}
        animate={{ opacity: overlayOpacity }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className={styles.stage}>
          {/* Minimal side texts for atmosphere (no gradients) */}
          <motion.div
            className={`${styles.sideText} ${styles.leftText}`}
            initial={{ opacity: 0, x: -8 }}
            animate={
              phase === 'fade'
                ? { opacity: 0, x: -10 }
                : (phase === 'move' || phase === 'shuffle')
                ? { opacity: 0.18, x: -4 }
                : { opacity: 0.3, x: 0 }
            }
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {tStart('leftTag')}
          </motion.div>
          <motion.div
            className={`${styles.sideText} ${styles.rightText}`}
            initial={{ opacity: 0, x: 8 }}
            animate={
              phase === 'fade'
                ? { opacity: 0, x: 10 }
                : (phase === 'move' || phase === 'shuffle')
                ? { opacity: 0.18, x: 4 }
                : { opacity: 0.3, x: 0 }
            }
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {tStart('rightTag')}
          </motion.div>
          
          {/* Single shuffling card that moves from bottom-center to center */}
          {(phase === 'move' || phase === 'shuffle') && (
            <div className={styles.cardWrap}>
              <motion.div
                key="card"
                className={styles.card}
                style={{ backgroundImage: `url(${currentImage})`, position: 'relative', zIndex: 1 }}
                layoutId="hero-card"
                initial={{ y: 180, scale: 0.9 }}
                animate={{ y: 0, scale: 1 }}
                transition={{ duration: MOVE_DURATION, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
          )}
          {/* Enlarge pop before stacking */}
          {phase === 'enlarge' && (
            <div className={styles.cardWrap}>
              <motion.div
                key="card-pop"
                className={styles.card}
                style={{ backgroundImage: `url(${currentImage})`, position: 'relative', zIndex: 1 }}
                layoutId="hero-card"
                initial={{ y: 0, scale: 1 }}
                animate={{ y: ENLARGE_Y, scale: TOP_STACK_SCALE }}
                transition={{ duration: ENLARGE_MS / 1000, ease: [0.2, 0.9, 0.2, 1] }}
              />
            </div>
          )}

          {/* Stacked cards */}
          {(phase === 'stack' || phase === 'spread' || phase === 'fade') && (
            <div className={styles.stack}>
              {stackImages.map((src, i) => {
                const order = i; // 0 is top
                const maxScale = order === 0
                  ? TOP_STACK_SCALE
                  : (MAX_SCALES[order] ?? MAX_SCALES[MAX_SCALES.length - 1]);
                const isTop = order === 0;
                const stacked = {
                  y: (phase === 'stack' && isTop) ? ENLARGE_Y : (stackYOffsets[order] ?? order * 24),
                  scale: maxScale,
                  opacity: 1
                };
                const count = stackImages.length;
                const mid = (count - 1) / 2;
                const spreadGap = (36 * maxScale) + 8; // tighter base spacing to keep group compact
                // Larger (top) cards: much less spacing; smaller (bottom): a bit more
                const depthRatio = order / (count - 1); // 0 -> top, 1 -> bottom
                const spacingFactor = 0.75 + (0.25 * depthRatio); // top ~0.75, bottom ~1.0
                const spread = {
                  y: (order - mid) * (spreadGap * spacingFactor) + SPREAD_OFFSET,
                  scale: maxScale,
                  opacity: 1 // ensure no fade during spread phase
                };
                const fade = { ...spread, opacity: 0 };
                const target = phase === 'fade' ? fade : (phase === 'spread' ? spread : stacked);
                const transition = phase === 'fade'
                  ? { duration: FADE_ITEM_DURATION, ease: 'easeOut', delay: order * FADE_ITEM_DELAY }
                  : (phase === 'stack' && isTop
                      ? { duration: 0 } // keep enlarged size instantly on entering stack
                      : { duration: 0.5, ease: 'easeInOut', delay: order === 0 ? 0 : order * 0.06 });
                return (
                  <motion.div
                    key={src}
                    className={styles.stackItem}
                    style={{ zIndex: 10 - order, overflow: 'hidden' }}
                    layoutId={order === 0 ? 'hero-card' : undefined}
                    initial={order === 0 ? { y: 0, scale: TOP_STACK_SCALE } : { y: -10, scale: 0.5, opacity: 0 }}
                    animate={target}
                    transition={transition}
                  >
                    <img src={src} alt="intro" className={styles.img} />
                  </motion.div>
                );
              })}
            </div>
          )}
          {/* brand watermark removed per design */}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


