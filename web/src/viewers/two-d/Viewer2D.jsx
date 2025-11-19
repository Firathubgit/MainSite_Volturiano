import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './Viewer2D.module.css';

// Available options - exported for use in parent components
// Order: Blu Blue (default), Nero Black, Bianco White, Rosso Red, Orange Fury
export const BODY_COLORS = {
  'blu-blue': 'Blu Blue',
  'nero-black': 'Nero Black',
  'bianco-white': 'Bianco White',
  'rosso-red': 'Rosso Red',
  'orange-fury': 'Orange Fury',
};

export const RIM_COLORS = {
  'black': 'Black',
  'silver': 'Silver',
  'bronze': 'Bronze',
};

export const ANGLES = {
  'front-3q': 'Front 3/4',
  'side': 'Side',
  'rear-3q': 'Rear 3/4',
  'rim': 'Rim',
};

/**
 * Get image URL for a given combination
 */
function getImageUrl(bodyColor, rimColor, angle) {
  const filename = `${bodyColor}_${rimColor}_${angle}.webp`;
  return new URL(
    `../../assets/Configurator/volturiano/${filename}`,
    import.meta.url
  ).href;
}

export function Viewer2D({ 
  bodyColor = 'blu-blue', 
  rimColor = 'black', 
  angle = 'front-3q',
  onImageLoad,
  onImageError 
}) {
  const { t } = useTranslation('configurator');
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Generate image URL
  const imageUrl = useMemo(() => {
    return getImageUrl(bodyColor, rimColor, angle);
  }, [bodyColor, rimColor, angle]);

  // Show overlay only after 0.5 seconds of loading
  useEffect(() => {
    if (!isLoading) {
      // Immediately hide overlay if loading stops
      setShowOverlay(false);
      return;
    }

    // Wait 0.5 seconds before showing overlay
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setShowOverlay(true);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isLoading]);

  // Load image
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setShowOverlay(false); // Reset overlay state when starting new load

    const img = new Image();
    
    img.onload = () => {
      setIsLoading(false);
      setHasError(false);
      setImageSrc(imageUrl);
      if (onImageLoad) onImageLoad(imageUrl);
    };

    img.onerror = () => {
      setIsLoading(false);
      setHasError(true);
      setImageSrc(null);
      console.error('[Viewer2D] Failed to load image:', imageUrl);
      if (onImageError) onImageError(imageUrl);
    };

    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, onImageLoad, onImageError]);

  return (
    <div className={styles.viewer2d}>
      <LoadingOverlay show={showOverlay} />
      
      {hasError && (
        <div className={styles.error}>
          <span>⚠️ Failed to load image</span>
          <code className={styles.errorCode}>{imageUrl.split('/').pop()}</code>
        </div>
      )}

      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={`Volturiano ${BODY_COLORS[bodyColor]} with ${RIM_COLORS[rimColor]} rims - ${ANGLES[angle]} view`}
          className={styles.carImage}
          style={{ opacity: isLoading ? 0 : 1 }}
        />
      )}
    </div>
  );
}
