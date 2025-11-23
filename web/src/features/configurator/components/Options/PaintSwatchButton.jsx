import React from 'react';
import { useTranslation } from 'react-i18next';
import MaterialSwatch from './MaterialSwatch';
import styles from './PaintSwatchButton.module.css';

/**
 * PaintSwatchButton Component
 * Fisker-style: The SVG material swatch IS the button
 * No card wrapper, just the swatch as a clickable button
 */
export default function PaintSwatchButton({ 
  option, 
  isSelected, 
  onSelect 
}) {
  const { t } = useTranslation('configurator');
  const paintColor = option.configurator_metadata?.previewColor || option.configurator_metadata?.color || '#1e2430';
  const paintColor2 = option.configurator_metadata?.previewColor2 || paintColor;

  return (
    <button
      type="button"
      className={`${styles.swatchButton} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
      aria-label={t('paint.selectColor', { color: option.label, defaultValue: `Select ${option.label} paint color` })}
      aria-pressed={isSelected}
    >
      <MaterialSwatch 
        color={paintColor} 
        color2={paintColor2}
        isSelected={isSelected}
        ringColor="#ff4520"
        id={option.id}
      />
    </button>
  );
}

