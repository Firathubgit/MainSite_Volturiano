import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import LayeredViewer from '../Viewer/LayeredViewer';
import styles from './ConfiguratorCanvas.module.css';

/**
 * ConfiguratorCanvas Component
 * Main canvas area with spotlight effect, grid overlay, and controls
 */
export default function ConfiguratorCanvas({ 
  layers = [],
  isLoading = false,
  currentAngle = 'front-3q',
  showGrid = false,
  manifest = null,
  onLayerLoad,
  onLayerError
}) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={styles.canvas}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Grid Overlay */}
      {showGrid && (
        <motion.div 
          className={styles.grid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Spotlight Effect */}
      <motion.div
        className={styles.spotlight}
        animate={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 69, 32, 0.15), transparent 40%)`
        }}
        transition={{ opacity: { duration: 0.3 }, background: { duration: 0 } }}
      />

      {/* Main Viewer */}
      <motion.div 
        className={styles.viewerContainer}
        key={currentAngle}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.5, 
          ease: [0.25, 0.1, 0.25, 1]
        }}
      >
        <LayeredViewer
          layers={layers}
          isLoading={isLoading}
          currentAngle={currentAngle}
          manifest={manifest}
          onLayerLoad={onLayerLoad}
          onLayerError={onLayerError}
        />
      </motion.div>

      {/* Bottom Controls */}
      <motion.div 
        className={styles.controls}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.button
          type="button"
          className={styles.controlButton}
          onClick={handleFullscreen}
          aria-label="Toggle fullscreen"
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </motion.button>
        
        <motion.button 
          className={styles.controlButton}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          whileTap={{ scale: 0.95 }}
        >
          Exterior
        </motion.button>
        
        <motion.button 
          className={styles.controlButton}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          whileTap={{ scale: 0.95 }}
        >
          Interior
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

