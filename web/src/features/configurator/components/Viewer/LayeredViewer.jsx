import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { imageLoader } from '../../utils/imageLoader';
import LoadingOverlay from '../../../../components/LoadingOverlay/LoadingOverlay';
import styles from './LayeredViewer.module.css';

/**
 * LayeredViewer Component
 * Renders multiple image layers with z-index ordering, per-layer transitions, and parallax effects
 */
export default function LayeredViewer({ 
  layers = [], 
  isLoading = false,
  currentAngle = 'front-3q',
  manifest = null,
  onLayerLoad,
  onLayerError
}) {
  const containerRef = useRef(null);
  const [loadedLayers, setLoadedLayers] = useState(new Map());
  const [loadingLayers, setLoadingLayers] = useState(new Set());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Handle mouse movement for parallax
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });
  }, []);

  // Load layers when they change
  useEffect(() => {
    if (!layers || layers.length === 0) {
      setLoadingLayers(new Set());
      return;
    }

    const newLoadingLayers = new Set();
    const layerPromises = [];

    layers.forEach(layer => {
      const layerKey = `${layer.id}-${currentAngle}-${layer.url}`;
      
      // Check if already loaded
      if (loadedLayers.has(layerKey)) {
        return; // Already loaded
      }

      // Mark as loading
      newLoadingLayers.add(layerKey);

      // Preload image
      const promise = imageLoader.preloadImage(layer.url)
        .then(() => {
          setLoadedLayers(prev => new Map(prev).set(layerKey, layer.url));
          setLoadingLayers(prev => {
            const next = new Set(prev);
            next.delete(layerKey);
            return next;
          });
          
          if (onLayerLoad) {
            onLayerLoad(layer.id, layer.url);
          }
        })
        .catch((error) => {
          console.error(`[LayeredViewer] Failed to load layer ${layer.id}:`, error);
          setLoadingLayers(prev => {
            const next = new Set(prev);
            next.delete(layerKey);
            return next;
          });
          
          if (onLayerError) {
            onLayerError(layer.id, layer.url, error);
          }
        });
      
      layerPromises.push(promise);
    });

    setLoadingLayers(newLoadingLayers);
  }, [layers, currentAngle, onLayerLoad, onLayerError]);

  // Calculate parallax offset for a layer
  const getParallaxOffset = useCallback((layer) => {
    if (!isHovering || !layer.parallaxDepth) return { x: 0, y: 0 };
    
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const deltaX = (mousePos.x - centerX) / centerX;
    const deltaY = (mousePos.y - centerY) / centerY;
    
    const maxOffset = 20 * layer.parallaxDepth;
    
    return {
      x: deltaX * maxOffset,
      y: deltaY * maxOffset
    };
  }, [mousePos, isHovering]);

  // Check if any layers are loading
  const hasLoadingLayers = loadingLayers.size > 0 || isLoading;

  // Show loading overlay after delay
  const [showOverlay, setShowOverlay] = useState(false);
  useEffect(() => {
    if (!hasLoadingLayers) {
      setShowOverlay(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (hasLoadingLayers) {
        setShowOverlay(true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [hasLoadingLayers]);

  // Sort layers by z-index
  const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  return (
    <div 
      ref={containerRef}
      className={styles.layeredViewer}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <LoadingOverlay show={showOverlay} />
      
      {sortedLayers.length > 0 ? (
        <AnimatePresence mode="wait">
          {sortedLayers.map((layer) => {
            const layerKey = `${layer.id}-${currentAngle}-${layer.url}`;
            const imageUrl = loadedLayers.get(layerKey) || layer.url;
            const isLayerLoading = loadingLayers.has(layerKey);
            const parallaxOffset = getParallaxOffset(layer);
            
            // Always render layer container, even if loading
            return (
              <motion.div
                key={layerKey}
                className={styles.layer}
                style={{
                  zIndex: layer.zIndex || 0,
                  mixBlendMode: layer.blendMode || 'normal'
                }}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ 
                  opacity: imageUrl && !isLayerLoading ? 1 : 0,
                  scale: 1,
                  x: parallaxOffset.x,
                  y: parallaxOffset.y
                }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{
                  opacity: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                  scale: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
                  x: { duration: 0.1, ease: 'easeOut' },
                  y: { duration: 0.1, ease: 'easeOut' }
                }}
              >
                {layer.url && (
                  <motion.img
                    src={layer.url}
                    alt={`Layer ${layer.id}`}
                    className={styles.layerImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isLayerLoading ? 0 : 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    onLoad={() => {
                      if (onLayerLoad) {
                        onLayerLoad(layer.id, layer.url);
                      }
                    }}
                    onError={(e) => {
                      if (onLayerError) {
                        onLayerError(layer.id, layer.url, new Error('Image load failed'));
                      }
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      ) : (
        <motion.div 
          className={styles.empty}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p>No layers to display</p>
          {manifest && (
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
              Manifest: {manifest.vehicleModel || 'unknown'}, Layers: {manifest.layers?.length || 0}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

