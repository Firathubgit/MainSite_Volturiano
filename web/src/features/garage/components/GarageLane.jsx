import React from 'react';
import { useTranslation } from 'react-i18next';
import CarCard from './CarCard';
import GarageEmptyState from './GarageEmptyState';
import styles from '../styles/garage.module.css';

/**
 * Garage lane component for displaying items in a specific state
 * @param {Object} props
 * @param {string} props.title - Lane title
 * @param {string} props.state - State filter (saved, purchased, prototype, wishlist)
 * @param {Array} props.items - Items to display
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDelete - Delete handler
 * @param {boolean} props.loading - Loading state
 */
export default function GarageLane({ title, state, items = [], onEdit, onDelete, loading, initialLoadComplete }) {
  const { t } = useTranslation('account');

  // Items are already filtered by getItemsByState, no need to filter again
  const filteredItems = items;

  // Only show loading skeleton if we haven't loaded data yet (initial load)
  // Don't show loading if we've loaded data but filters removed all items
  if (loading && !initialLoadComplete && filteredItems.length === 0) {
    return (
      <div className={styles.lane}>
        <h2 className={styles.laneTitle}>{title}</h2>
        <div className={styles.laneContent}>
          <div className={styles.loadingSkeleton}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.lane}>
      <h2 className={styles.laneTitle}>{title}</h2>
      <div className={styles.laneContent}>
        {filteredItems.length === 0 ? (
          <GarageEmptyState state={state} />
        ) : (
          <div className={styles.laneItems}>
            {filteredItems.map((item) => (
              <CarCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

