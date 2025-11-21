import React, { useState } from 'react';
import styles from './OptionImage.module.css';

/**
 * OptionImage Component
 * Square image preview for wheels/interior options
 */
export default function OptionImage({ src, alt }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={styles.container}>
      {isLoading && !hasError && (
        <div className={styles.skeleton} />
      )}
      {hasError && (
        <div className={styles.placeholder} />
      )}
      {src && (
        <img
          src={src}
          alt={alt}
          className={styles.image}
          style={{ opacity: isLoading ? 0 : 1 }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
}

