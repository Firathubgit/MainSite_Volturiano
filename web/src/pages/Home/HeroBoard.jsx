import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './HeroBoard.module.css';
import rect8 from '../../assets/H1/Rectangle 8.png';
import rect9 from '../../assets/H1/Rectangle 9.png';
import rect10 from '../../assets/H1/Rectangle 10.png';
import rect11 from '../../assets/H1/Rectangle 11.png';
import rect12 from '../../assets/H1/Rectangle 12.png';
import rect13 from '../../assets/H1/Rectangle 13.png';

const SOURCE_IMAGES = [rect8, rect9, rect10, rect11, rect12, rect13];
const LIFETIME_MS = 1000;
const SPAWN_THROTTLE_MS = 60;

export default function HeroBoard({ variant = 'panel', children }) {
  const { t } = useTranslation('home');
  const boardRef = useRef(null);
  const pointerActiveRef = useRef(false);
  const lastSpawnRef = useRef(0);
  const idRef = useRef(0);
  const timeoutsRef = useRef(new Map());
  const [sprites, setSprites] = useState([]);

  const getImage = useMemo(() => {
    let index = 0;
    return () => {
      const src = SOURCE_IMAGES[index % SOURCE_IMAGES.length];
      index += 1;
      return src;
    };
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, []);

  const scheduleRemoval = (id) => {
    const timeoutId = setTimeout(() => {
      setSprites((prev) => prev.filter((sprite) => sprite.id !== id));
      timeoutsRef.current.delete(id);
    }, LIFETIME_MS);
    timeoutsRef.current.set(id, timeoutId);
  };

  const spawnSprite = (event, force = false) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!force && now - lastSpawnRef.current < SPAWN_THROTTLE_MS) {
      return;
    }
    lastSpawnRef.current = now;

    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = idRef.current++;
    const baseSize = 140;
    const sizeJitter = Math.random() * 28 - 14; // +/- 14px variation
    const rotation = Math.random() * 16 - 8;
    const src = getImage();
    const sprite = {
      id,
      x,
      y,
      size: Math.max(90, baseSize + sizeJitter),
      rotate: rotation,
      src
    };
    setSprites((prev) => [...prev, sprite]);
    scheduleRemoval(id);
  };

  const setPointerActive = (active) => {
    pointerActiveRef.current = active;
  };

  const handlePointerEnter = (event) => {
    if (event.pointerType === 'mouse') {
      setPointerActive(true);
      spawnSprite(event, true);
    }
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    
    // On mobile/touch, do not capture pointer so scrolling works naturally.
    // We only capture if it's a mouse to ensure dragging works outside the element bounds if needed.
    if (event.pointerType === 'mouse' && boardRef.current?.setPointerCapture) {
      boardRef.current.setPointerCapture(event.pointerId);
    }

    setPointerActive(true);
    lastSpawnRef.current = 0;
    spawnSprite(event, true);
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === 'mouse' || pointerActiveRef.current) {
      spawnSprite(event);
    }
  };

  const releasePointer = (event) => {
    if (boardRef.current?.hasPointerCapture?.(event.pointerId)) {
      boardRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerUp = (event) => {
    setPointerActive(false);
    if (event.pointerType !== 'mouse') {
      releasePointer(event);
    }
  };

  const handlePointerLeave = () => {
    setPointerActive(false);
  };

  const rootClassName =
    variant === 'panel'
      ? `${styles.board} ${styles.boardPanel}`
      : `${styles.board} ${styles.boardFull}`;
  const overlayClassName =
    variant === 'panel'
      ? styles.gridOverlay
      : `${styles.gridOverlay} ${styles.gridOverlayFull}`;
  const showHint = variant === 'panel';
  const ariaLabel =
    variant === 'panel' ? t('aria.panel') : t('aria.full');

  return (
    <div
      ref={boardRef}
      className={rootClassName}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      aria-label={ariaLabel}
      role="presentation"
      data-variant={variant}
    >
      <div className={overlayClassName} />
      {sprites.map((sprite) => (
        <div
          key={sprite.id}
          className={styles.sprite}
          style={{
            left: sprite.x,
            top: sprite.y,
            width: sprite.size,
            height: sprite.size,
            backgroundImage: `url(${sprite.src})`,
            '--rotate': `${sprite.rotate}deg`
          }}
        />
      ))}
      {children && <div className={styles.content}>{children}</div>}
      {showHint && (
        <div className={styles.hint}>{t('hint')}</div>
      )}
    </div>
  );
}
