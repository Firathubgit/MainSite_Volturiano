import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import GarageLane from './GarageLane';
import GarageFilters from './GarageFilters';
import styles from '../styles/garage.module.css';

/**
 * Main garage layout component with four lanes
 */
export default function GarageLayout() {
  const { t } = useTranslation('account');
  const { items, loading, initialLoadComplete, getItemsByState, updateItemState, deleteItem, filters } = useGarageStore();

  const handleEdit = (item) => {
    // TODO: Open edit modal or navigate to edit page
    console.log('Edit item:', item.id);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm(t('garage.confirmDelete'))) {
      console.log('[GarageLayout] Deleting item:', itemId);
      try {
        const result = await deleteItem(itemId);
        if (result?.error) {
          console.error('[GarageLayout] Delete failed:', result.error);
          alert(`Failed to delete item: ${result.error.message || 'Unknown error'}`);
        } else {
          console.log('[GarageLayout] Delete successful');
        }
      } catch (err) {
        console.error('[GarageLayout] Delete exception:', err);
        alert(`Failed to delete item: ${err.message || 'Unknown error'}`);
      }
    }
  };

  // If a state filter is active, only show that lane
  // Otherwise, show all lanes
  const lanes = filters.state
    ? [
        {
          key: filters.state,
          title: t(`garage.lanes.${filters.state === 'saved' ? 'savedBuilds' : filters.state === 'purchased' ? 'purchases' : filters.state === 'prototype' ? 'prototypes' : 'wishlist'}`),
          state: filters.state,
          items: getItemsByState(filters.state)
        }
      ]
    : [
        {
          key: 'saved',
          title: t('garage.lanes.savedBuilds'),
          state: 'saved',
          items: getItemsByState('saved')
        },
        {
          key: 'purchased',
          title: t('garage.lanes.purchases'),
          state: 'purchased',
          items: getItemsByState('purchased')
        },
        {
          key: 'prototype',
          title: t('garage.lanes.prototypes'),
          state: 'prototype',
          items: getItemsByState('prototype')
        },
        {
          key: 'wishlist',
          title: t('garage.lanes.wishlist'),
          state: 'wishlist',
          items: getItemsByState('wishlist')
        }
      ];

  return (
    <div className={styles.garageLayout}>
      <GarageFilters />
      <div className={styles.lanes}>
        {lanes.map((lane) => (
          <GarageLane
            key={lane.key}
            title={lane.title}
            state={lane.state}
            items={lane.items}
            loading={loading}
            initialLoadComplete={initialLoadComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

