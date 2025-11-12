import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/garage.module.css';

/**
 * Empty state component for garage lanes
 * @param {Object} props
 * @param {string} props.state - Lane state (saved, purchased, prototype, wishlist)
 */
export default function GarageEmptyState({ state }) {
  const { t } = useTranslation('account');

  const messageKey = `garage.empty.${state}`;
  const defaultMessage = t('garage.empty.default');

  return (
    <div className={styles.emptyState} role="status">
      <p className={styles.emptyStateText}>
        {t(messageKey, { defaultValue: defaultMessage })}
      </p>
    </div>
  );
}

