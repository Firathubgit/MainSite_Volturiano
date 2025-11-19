import React from 'react';
import { useTranslation } from 'react-i18next';
import { PREDEFINED_TAGS, TAG_LABELS } from '../utils/tagConstants';
import styles from './TagSelector.module.css';

/**
 * TagSelector component - chip-based multi-select interface for tags
 * @param {Object} props
 * @param {string[]} props.selectedTags - Array of currently selected tag strings
 * @param {Function} props.onChange - Callback when selection changes: (tags: string[]) => void
 * @param {boolean} props.disabled - Whether selector is disabled
 * @param {string} props.variant - Display variant: 'default' | 'compact'
 */
export default function TagSelector({ selectedTags = [], onChange, disabled = false, variant = 'default' }) {
  const { t } = useTranslation('account');

  const handleTagToggle = (tag) => {
    if (disabled) return;

    const isSelected = selectedTags.includes(tag);
    const newSelection = isSelected
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];

    if (onChange && typeof onChange === 'function') {
      onChange(newSelection);
    }
  };

  const handleKeyDown = (e, tag) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTagToggle(tag);
    }
  };

  return (
    <div className={`${styles.tagSelector} ${styles[variant]}`} role="group" aria-label="Tag selector">
      {PREDEFINED_TAGS.map((tag) => {
        const labelKey = TAG_LABELS[tag] || tag;
        const label = t(labelKey, { defaultValue: tag });
        const isSelected = selectedTags.includes(tag);

        return (
          <button
            key={tag}
            type="button"
            className={`${styles.tagChip} ${isSelected ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
            onClick={() => handleTagToggle(tag)}
            onKeyDown={(e) => handleKeyDown(e, tag)}
            disabled={disabled}
            aria-pressed={isSelected}
            data-tag={tag}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

