import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ConfiguratorTypeBadge.module.css';

/**
 * Badge component displaying configurator type (2D/3D/Hybrid)
 * @param {Object} props
 * @param {string} props.type - Configurator type ("2d" | "3d" | "hybrid")
 * @param {string} props.size - Badge size ("small" | "medium" | "large")
 * @param {string} props.className - Additional CSS classes
 */
export default function ConfiguratorTypeBadge({ 
  type, 
  size = 'medium',
  className = '' 
}) {
  const { t } = useTranslation('account');

  if (!type || !['2d', '3d', 'hybrid'].includes(type)) {
    return null;
  }

  const displayText = type.toUpperCase();
  const typeClass = styles[type] || styles.unknown;
  const sizeClass = styles[size] || styles.medium;

  return (
    <span 
      className={`${styles.badge} ${typeClass} ${sizeClass} ${className}`}
      title={t(`garage.configurator.type.${type}`, displayText)}
      aria-label={t(`garage.configurator.type.${type}`, displayText)}
    >
      {displayText}
    </span>
  );
}

