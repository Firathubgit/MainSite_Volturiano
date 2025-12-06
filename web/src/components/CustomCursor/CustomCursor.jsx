import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './CustomCursor.module.css';

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const updatePosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('a') || 
        target.closest('button') ||
        target.classList.contains('cursor-pointer') ||
        target.getAttribute('role') === 'button'
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className={styles.cursorContainer}>
      {/* Main Dot */}
      <motion.div
        className={styles.mainDot}
        animate={{
          x: position.x - 4,
          y: position.y - 4,
          scale: isClicking ? 0.5 : 1,
        }}
        transition={{ duration: 0 }}
      />
      
      {/* Reticle */}
      <motion.div 
        className={styles.reticle}
        animate={{
          x: position.x - 24,
          y: position.y - 24,
          scale: isHovering ? 1.5 : 1,
          rotate: isHovering ? 45 : 0,
          borderColor: isHovering ? '#FF3B14' : '#FFFFFF',
        }}
        transition={{
          type: "tween",
          ease: "circOut",
          duration: 0.2
        }}
      >
        <div className={styles.reticleLineVertical}></div>
        <div className={styles.reticleLineHorizontal}></div>
      </motion.div>

      {/* Trailing Tag */}
      <motion.div
        className={styles.trailingTag}
        animate={{
          x: position.x,
          y: position.y,
          opacity: isHovering ? 1 : 0
        }}
        transition={{ duration: 0.1 }}
      >
        <div className={styles.tagContent}>
          Access
        </div>
      </motion.div>
    </div>
  );
};

export default CustomCursor;

