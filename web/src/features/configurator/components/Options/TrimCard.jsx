import React from 'react';
import styles from './TrimCard.module.css';

/**
 * TrimCard Component
 * Larger card for trim selection
 */
export default function TrimCard({ option, isSelected, onSelect }) {
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
      <div className={styles.header}>
        <span className={styles.name}>{option.label}</span>
        <span className={styles.price}>
          ${((option.price_cents || 0) / 100).toLocaleString()}
        </span>
      </div>
      {option.description && (
        <p className={styles.description}>{option.description}</p>
      )}
    </div>
  );
}

