import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from '../styles/garage.module.css';

/**
 * Car card component for displaying garage items
 * @param {Object} props
 * @param {Object} props.item - Garage item data
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDelete - Delete handler
 */
export default function CarCard({ item, onEdit, onDelete }) {
  const { t } = useTranslation('account');
  const navigate = useNavigate();

  const formatPrice = (cents, currency = 'EUR') => {
    if (!cents) return null;
    const amount = (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${amount} ${currency}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleClick = () => {
    // Navigate to configurator with this item's config
    // For now, just log - will be implemented when configurator integration is ready
    console.log('Open configurator with item:', item.id);
    // navigate(`/configurator?garage=${item.id}`);
  };

  return (
    <div className={styles.carCard} onClick={handleClick} role="button" tabIndex={0}>
      <div className={styles.carCardThumbnail}>
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title} loading="lazy" />
        ) : (
          <div className={styles.carCardPlaceholder}>
            <span>{item.vehicle_model.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className={styles.carCardContent}>
        <h3 className={styles.carCardTitle}>{item.title}</h3>
        <p className={styles.carCardModel}>{item.vehicle_model}</p>
        {item.price_cents && (
          <p className={styles.carCardPrice}>{formatPrice(item.price_cents, item.currency)}</p>
        )}
        {item.updated_at && (
          <p className={styles.carCardDate}>{formatDate(item.updated_at)}</p>
        )}
      </div>
      <div className={styles.carCardActions}>
        {onEdit && (
          <button
            type="button"
            className={styles.carCardAction}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            aria-label={t('garage.actions.edit')}
          >
            {t('garage.actions.edit')}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className={styles.carCardAction}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            aria-label={t('garage.actions.delete')}
          >
            {t('garage.actions.delete')}
          </button>
        )}
      </div>
    </div>
  );
}

