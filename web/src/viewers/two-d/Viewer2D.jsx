import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Viewer2D.module.css';

// Available options - exported for use in parent components
export const BODY_COLORS = {
  'orange-fury': 'Orange Fury',
  'nero-black': 'Nero Black',
  'bianco-white': 'Bianco White',
  'rosso-red': 'Rosso Red',
  'blu-blue': 'Blu Blue',
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
  bodyColor = 'orange-fury', 
  rimColor = 'black', 
  angle = 'front-3q',
  onImageLoad,
  onImageError 
}) {
  const { t } = useTranslation('configurator');
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate image URL
  const imageUrl = useMemo(() => {
    return getImageUrl(bodyColor, rimColor, angle);
  }, [bodyColor, rimColor, angle]);

  // Load image
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

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
      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>{t('loading') || 'Loading...'}</span>
        </div>
      )}
      
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
