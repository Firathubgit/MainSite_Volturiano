import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import GarageLane from './GarageLane';
import GarageFilters from './GarageFilters';
import CarCard from './CarCard';
import GarageEmptyState from './GarageEmptyState';
import styles from '../styles/garage.module.css';

/**
 * Main garage layout component
 * Shows filtered items directly when filters are active, otherwise shows lanes
 */
export default function GarageLayout() {
  const { t } = useTranslation('account');
  const { items, loading, initialLoadComplete, getFilteredItems, getItemsByState, updateItemState, deleteItem, filters } = useGarageStore();

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

  // Check if any filters are active (except default sort)
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.state ||
      filters.model ||
      filters.search ||
      filters.dateRange ||
      filters.priceMin !== null ||
      filters.priceMax !== null ||
      (filters.tags && filters.tags.length > 0) ||
      filters.sortBy !== 'created_at' ||
      filters.sortOrder !== 'desc'
    );
  }, [filters]);

  // Get filtered items when filters are active
  const filteredItems = useMemo(() => {
    if (hasActiveFilters) {
      console.log('[GarageLayout] Filters active, getting filtered items');
      const items = getFilteredItems();
      console.log('[GarageLayout] Filtered items count:', items.length);
      return items;
    }
    return [];
  }, [hasActiveFilters, filters, items, getFilteredItems]);

  // Get lanes when no filters are active
  const lanes = useMemo(() => {
    if (hasActiveFilters) {
      return [];
    }
    
    console.log('[GarageLayout] No filters active, computing lanes');
    return [
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
  }, [hasActiveFilters, filters, items, getItemsByState, t]);

  return (
    <div className={styles.garageLayout}>
      <GarageFilters />
      
      {hasActiveFilters ? (
        // Show filtered items directly in a grid
        <div className={styles.filteredItemsGrid}>
          {loading && !initialLoadComplete && filteredItems.length === 0 ? (
            <div className={styles.loadingSkeleton}>Loading...</div>
          ) : filteredItems.length === 0 ? (
            <GarageEmptyState />
          ) : (
            <div className={styles.itemsGrid}>
              {filteredItems.map((item) => (
                <CarCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Show lanes when no filters are active
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
      )}
    </div>
  );
}

