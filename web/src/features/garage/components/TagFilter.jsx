import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PREDEFINED_TAGS, TAG_LABELS } from '../utils/tagConstants';
import styles from './TagFilter.module.css';

/**
 * TagFilter component - multi-select tag filter with counts and AND/OR mode
 * @param {Object} props
 * @param {string[]} props.selectedTags - Currently selected tags
 * @param {Map<string, number>|Object} props.tagCounts - Map or object of tag -> count
 * @param {Function} props.onChange - Callback when selection changes: (tags: string[]) => void
 * @param {string} props.mode - Current filter mode: 'AND' | 'OR'
 * @param {Function} props.onModeChange - Callback when mode changes: (mode: 'AND' | 'OR') => void
 */
export default function TagFilter({ selectedTags = [], tagCounts = new Map(), onChange, mode = 'OR', onModeChange }) {
  const { t } = useTranslation('account');
  const [localTagCounts, setLocalTagCounts] = useState(new Map());

  // Convert tagCounts to Map if it's an object
  useEffect(() => {
    if (tagCounts instanceof Map) {
      setLocalTagCounts(tagCounts);
    } else if (typeof tagCounts === 'object' && tagCounts !== null) {
      setLocalTagCounts(new Map(Object.entries(tagCounts)));
    }
  }, [tagCounts]);

  const handleTagToggle = (tag) => {
    const isSelected = selectedTags.includes(tag);
    const newSelection = isSelected
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];

    if (onChange && typeof onChange === 'function') {
      onChange(newSelection);
    }
  };

  const handleClear = () => {
    if (onChange && typeof onChange === 'function') {
      onChange([]);
    }
  };

  const handleModeToggle = () => {
    const newMode = mode === 'AND' ? 'OR' : 'AND';
    if (onModeChange && typeof onModeChange === 'function') {
      onModeChange(newMode);
    }
  };

  const handleKeyDown = (e, tag) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTagToggle(tag);
    }
  };

  return (
    <div className={styles.tagFilter}>
      <div className={styles.tagFilterHeader}>
        <label className={styles.tagFilterLabel}>
          {t('garage.tags.filterByTags')}
        </label>
        {selectedTags.length > 0 && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label={t('garage.tags.clearTags')}
          >
            {t('garage.tags.clearTags')}
          </button>
        )}
      </div>

      <div className={styles.tagFilterTags}>
        {PREDEFINED_TAGS.map((tag) => {
          const labelKey = TAG_LABELS[tag] || tag;
          const label = t(labelKey, { defaultValue: tag });
          const isSelected = selectedTags.includes(tag);
          const count = localTagCounts.get(tag) || 0;

          return (
            <button
              key={tag}
              type="button"
              className={`${styles.tagFilterChip} ${isSelected ? styles.selected : ''}`}
              onClick={() => handleTagToggle(tag)}
              onKeyDown={(e) => handleKeyDown(e, tag)}
              aria-pressed={isSelected}
              data-tag={tag}
            >
              <span className={styles.tagLabel}>{label}</span>
              {count > 0 && (
                <span className={styles.tagCount} aria-label={`${count} items`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedTags.length > 1 && (
        <div className={styles.tagFilterMode}>
          <span className={styles.modeLabel}>{t('garage.tags.tagMode')}:</span>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'AND' ? styles.active : ''}`}
            onClick={handleModeToggle}
            aria-pressed={mode === 'AND'}
          >
            {t('garage.tags.and')}
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'OR' ? styles.active : ''}`}
            onClick={handleModeToggle}
            aria-pressed={mode === 'OR'}
          >
            {t('garage.tags.or')}
          </button>
        </div>
      )}
    </div>
  );
}

