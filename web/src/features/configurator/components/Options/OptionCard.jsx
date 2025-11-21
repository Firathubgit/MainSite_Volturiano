import React from 'react';
import ColorSwatch from './ColorSwatch';
import OptionImage from './OptionImage';
import styles from './OptionCard.module.css';

/**
 * OptionCard Component
 * Card for selecting an option (paint, wheels, interior)
 */
export default function OptionCard({ option, isSelected, onSelect }) {
  const hasColor = option.configurator_metadata?.previewColor || option.configurator_image_url;
  const hasImage = option.configurator_image_url && !hasColor;

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className={styles.preview}>
        {hasColor ? (
          <ColorSwatch color={option.configurator_metadata?.previewColor} />
        ) : hasImage ? (
          <OptionImage src={option.configurator_image_url} alt={option.label} />
        ) : (
          <div className={styles.placeholder} />
        )}
        {isSelected && (
          <div className={styles.checkmark}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        )}
      </div>
      
      <div className={styles.info}>
        <p className={styles.name}>{option.label}</p>
        <p className={styles.price}>
          {option.price_cents === 0 
            ? 'Included' 
            : `+ $${(option.price_cents / 100).toLocaleString()}`}
        </p>
      </div>
    </div>
  );
}

