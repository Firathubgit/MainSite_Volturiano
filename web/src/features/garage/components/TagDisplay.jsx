import React from 'react';
import { useTranslation } from 'react-i18next';
import { TAG_LABELS } from '../utils/tagConstants';
import styles from './TagDisplay.module.css';

/**
 * TagDisplay component - displays tags as chips/badges
 * @param {Object} props
 * @param {string[]} props.tags - Array of tag strings
 * @param {Function} props.onTagClick - Optional callback when tag is clicked
 * @param {number} props.maxVisible - Maximum number of tags to show (default: all)
 * @param {string} props.variant - Display variant: 'default' | 'compact'
 */
export default function TagDisplay({ tags = [], onTagClick, maxVisible, variant = 'default' }) {
  const { t } = useTranslation('account');

  if (!tags || tags.length === 0) {
    return null;
  }

  const displayTags = maxVisible ? tags.slice(0, maxVisible) : tags;
  const remainingCount = maxVisible && tags.length > maxVisible ? tags.length - maxVisible : 0;

  const handleTagClick = (tag) => {
    if (onTagClick && typeof onTagClick === 'function') {
      onTagClick(tag);
    }
  };

  return (
    <div className={`${styles.tagContainer} ${styles[variant]}`}>
      {displayTags.map((tag) => {
        const labelKey = TAG_LABELS[tag] || tag;
        const label = t(labelKey, { defaultValue: tag });
        const isClickable = !!onTagClick;

        return (
          <span
            key={tag}
            className={`${styles.tag} ${isClickable ? styles.clickable : ''}`}
            onClick={() => handleTagClick(tag)}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleTagClick(tag);
              }
            }}
            data-tag={tag}
          >
            {label}
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span className={styles.tagMore} title={`${remainingCount} more tags`}>
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

