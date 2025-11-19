import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import TagFilter from './TagFilter';
import FilterPresets from './FilterPresets';
import styles from '../styles/garage.module.css';

const TAG_FILTER_STORAGE_KEY = 'volturiano_garage_tag_filters';
const MODEL_FILTER_STORAGE_KEY = 'volturiano_garage_model_filter';
const SORT_PREFERENCE_STORAGE_KEY = 'volturiano_garage_sort_preference';

/**
 * Garage filters component
 */
export default function GarageFilters({ variant = 'inline' }) {
  const { t } = useTranslation('account');
  const { filters, setFilters, loadTagCounts, tagCounts, loadModelCounts, modelCounts, clearAllFilters } = useGarageStore();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [priceMinValue, setPriceMinValue] = useState(
    filters.priceMin ? (filters.priceMin / 100).toString() : ''
  );
  const [priceMaxValue, setPriceMaxValue] = useState(
    filters.priceMax ? (filters.priceMax / 100).toString() : ''
  );
  const [pendingFilters, setPendingFilters] = useState({});

  // Load tag counts on mount
  useEffect(() => {
    loadTagCounts();
  }, [loadTagCounts]);

  // Load model counts on mount
  useEffect(() => {
    loadModelCounts();
  }, [loadModelCounts]);

  // Sync local state with filters when filters change externally
  useEffect(() => {
    setSearchValue(filters.search || '');
    setPriceMinValue(filters.priceMin ? (filters.priceMin / 100).toString() : '');
    setPriceMaxValue(filters.priceMax ? (filters.priceMax / 100).toString() : '');
    setPendingFilters({});
  }, [filters.state, filters.model, filters.dateRange, filters.dateField, filters.sortBy, filters.sortOrder]);

  // Load filter preferences from localStorage
  useEffect(() => {
    try {
      // Load tag filter preferences
      const savedTags = localStorage.getItem(TAG_FILTER_STORAGE_KEY);
      if (savedTags) {
        const { tags, tagMode } = JSON.parse(savedTags);
        if (tags && Array.isArray(tags)) {
          setFilters({ tags, tagMode: tagMode || 'OR' });
        }
      }

      // Load model filter preference
      const savedModel = localStorage.getItem(MODEL_FILTER_STORAGE_KEY);
      if (savedModel) {
        const model = JSON.parse(savedModel);
        if (model) {
          setFilters({ model });
        }
      }

      // Load sort preference
      const savedSort = localStorage.getItem(SORT_PREFERENCE_STORAGE_KEY);
      if (savedSort) {
        const { sortBy, sortOrder } = JSON.parse(savedSort);
        if (sortBy && sortOrder) {
          setFilters({ sortBy, sortOrder });
        }
      }
    } catch (err) {
      console.warn('[GarageFilters] Failed to load filter preferences:', err);
    }
  }, [setFilters]);

  // Save filter preferences to localStorage
  useEffect(() => {
    try {
      // Save tag filter preferences
      localStorage.setItem(TAG_FILTER_STORAGE_KEY, JSON.stringify({
        tags: filters.tags || [],
        tagMode: filters.tagMode || 'OR'
      }));

      // Save model filter preference
      if (filters.model) {
        localStorage.setItem(MODEL_FILTER_STORAGE_KEY, JSON.stringify(filters.model));
      } else {
        localStorage.removeItem(MODEL_FILTER_STORAGE_KEY);
      }

      // Save sort preference
      localStorage.setItem(SORT_PREFERENCE_STORAGE_KEY, JSON.stringify({
        sortBy: filters.sortBy || 'created_at',
        sortOrder: filters.sortOrder || 'desc'
      }));
    } catch (err) {
      console.warn('[GarageFilters] Failed to save filter preferences:', err);
    }
  }, [filters.tags, filters.tagMode, filters.model, filters.sortBy, filters.sortOrder]);

  const handleStateChange = (e) => {
    const newState = e.target.value === 'all' ? null : e.target.value;
    console.log('[GarageFilters] handleStateChange:', { oldValue: filters.state, newValue: newState });
    setPendingFilters(prev => ({ ...prev, state: newState }));
    setFilters({ state: newState });
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value === 'all' ? null : e.target.value;
    console.log('[GarageFilters] handleModelChange:', { oldValue: filters.model, newValue: newModel });
    setPendingFilters(prev => ({ ...prev, model: newModel }));
    setFilters({ model: newModel });
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    // Parse sort option value (format: "sortBy:sortOrder")
    const [sortBy, sortOrder] = value.split(':');
    console.log('[GarageFilters] handleSortChange:', { value, sortBy, sortOrder, oldSortBy: filters.sortBy, oldSortOrder: filters.sortOrder });
    setPendingFilters(prev => ({ ...prev, sortBy, sortOrder }));
    setFilters({ sortBy, sortOrder });
  };

  const handleDateRangeChange = (e) => {
    const value = e.target.value === 'all' ? null : e.target.value;
    console.log('[GarageFilters] handleDateRangeChange:', { oldValue: filters.dateRange, newValue: value });
    setPendingFilters(prev => ({ ...prev, dateRange: value }));
    setFilters({ dateRange: value });
  };

  const handleDateFieldChange = (e) => {
    const value = e.target.value;
    console.log('[GarageFilters] handleDateFieldChange:', { oldValue: filters.dateField, newValue: value });
    setPendingFilters(prev => ({ ...prev, dateField: value }));
    setFilters({ dateField: value });
  };

  const handleApplyFilters = () => {
    // Force reload with current filters
    // This ensures filters are applied even if they were set but didn't trigger reload
    console.log('[GarageFilters] handleApplyFilters called');
    console.log('[GarageFilters] Current filters:', filters);
    console.log('[GarageFilters] Pending filters:', pendingFilters);
    const currentFilters = filters;
    setFilters({ ...currentFilters }); // Trigger reload by setting filters again
    setPendingFilters({});
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.state) count++;
    if (filters.model) count++;
    if (filters.search && filters.search.trim()) count++;
    if (filters.dateRange) count++;
    if (filters.priceMin !== null && filters.priceMin !== undefined) count++;
    if (filters.priceMax !== null && filters.priceMax !== undefined) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.sortBy !== 'created_at' || filters.sortOrder !== 'desc') count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    // Debounce search - update filters after user stops typing
    clearTimeout(window.garageSearchTimeout);
    window.garageSearchTimeout = setTimeout(() => {
      setFilters({ search: value });
    }, 300);
  };

  const handlePriceMinChange = (e) => {
    const value = e.target.value;
    setPriceMinValue(value); // Update input immediately for better UX
    
    // Debounce price filter - update filters after user stops typing
    clearTimeout(window.garagePriceMinTimeout);
    window.garagePriceMinTimeout = setTimeout(() => {
      if (value === '') {
        setFilters({ priceMin: null });
      } else {
        const cents = Math.round(parseFloat(value) * 100);
        if (!isNaN(cents) && cents >= 0) {
          setFilters({ priceMin: cents });
        }
      }
    }, 500);
  };

  const handlePriceMaxChange = (e) => {
    const value = e.target.value;
    setPriceMaxValue(value); // Update input immediately for better UX
    
    // Debounce price filter - update filters after user stops typing
    clearTimeout(window.garagePriceMaxTimeout);
    window.garagePriceMaxTimeout = setTimeout(() => {
      if (value === '') {
        setFilters({ priceMax: null });
      } else {
        const cents = Math.round(parseFloat(value) * 100);
        if (!isNaN(cents) && cents >= 0) {
          setFilters({ priceMax: cents });
        }
      }
    }, 500);
  };

  const handleClearFilters = () => {
    // Clear all filters
    clearAllFilters();
    // Reset local state
    setSearchValue('');
    setPriceMinValue('');
    setPriceMaxValue('');
    setPendingFilters({});
    // Clear localStorage preferences
    try {
      localStorage.removeItem(MODEL_FILTER_STORAGE_KEY);
      localStorage.removeItem(SORT_PREFERENCE_STORAGE_KEY);
    } catch (err) {
      console.warn('[GarageFilters] Failed to clear filter preferences:', err);
    }
  };

  return (
    <div
      className={`${styles.filters} ${
        variant === 'overlay' ? styles.filtersOverlay : ''
      }`}
    >
      <FilterPresets />

      <div className={styles.filterActions}>
        {hasActiveFilters && (
          <button
            type="button"
            className={styles.clearAllButton}
            onClick={handleClearFilters}
            aria-label={t('garage.filters.clearAll')}
          >
            {t('garage.filters.clearAll')}
            <span className={styles.activeFilterBadge}>
              {t('garage.filters.activeFilters', { count: activeFilterCount })}
            </span>
          </button>
        )}
        {(hasActiveFilters || Object.keys(pendingFilters).length > 0) && (
          <button
            type="button"
            className={styles.applyButton}
            onClick={handleApplyFilters}
            aria-label={t('garage.filters.applyFilters')}
          >
            {t('garage.filters.applyFilters')}
          </button>
        )}
      </div>
      <div className={styles.filterGroup}>
        <label htmlFor="garage-state-filter" className={styles.filterLabel}>
          {t('garage.filters.state')}
        </label>
        <select
          id="garage-state-filter"
          className={styles.filterSelect}
          value={filters.state || 'all'}
          onChange={handleStateChange}
        >
          <option value="all">{t('garage.filters.allStates')}</option>
          <option value="saved">{t('garage.lanes.savedBuilds')}</option>
          <option value="purchased">{t('garage.lanes.purchases')}</option>
          <option value="prototype">{t('garage.lanes.prototypes')}</option>
          <option value="wishlist">{t('garage.lanes.wishlist')}</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="garage-model-filter" className={styles.filterLabel}>
          {t('garage.filters.model')}
        </label>
        <select
          id="garage-model-filter"
          className={styles.filterSelect}
          value={filters.model || 'all'}
          onChange={handleModelChange}
        >
          <option value="all">{t('garage.filters.allModels')}</option>
          {Array.from(modelCounts.entries()).map(([model, count]) => (
            <option key={model} value={model}>
              {model} ({count})
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="garage-sort" className={styles.filterLabel}>
          {t('garage.filters.sort')}
        </label>
        <select
          id="garage-sort"
          className={styles.filterSelect}
          value={`${filters.sortBy || 'created_at'}:${filters.sortOrder || 'desc'}`}
          onChange={handleSortChange}
        >
          <option value="created_at:desc">{t('garage.filters.sortDateNewest')}</option>
          <option value="created_at:asc">{t('garage.filters.sortDateOldest')}</option>
          <option value="price_cents:desc">{t('garage.filters.sortPriceHigh')}</option>
          <option value="price_cents:asc">{t('garage.filters.sortPriceLow')}</option>
          <option value="title:asc">{t('garage.filters.sortNameAZ')}</option>
          <option value="title:desc">{t('garage.filters.sortNameZA')}</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="garage-date-field" className={styles.filterLabel}>
          {t('garage.filters.dateField')}
        </label>
        <select
          id="garage-date-field"
          className={styles.filterSelect}
          value={filters.dateField || 'created_at'}
          onChange={handleDateFieldChange}
        >
          <option value="created_at">{t('garage.filters.createdAt')}</option>
          <option value="updated_at">{t('garage.filters.updatedAt')}</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="garage-date-range" className={styles.filterLabel}>
          {t('garage.filters.dateRange')}
        </label>
        <select
          id="garage-date-range"
          className={styles.filterSelect}
          value={filters.dateRange || 'all'}
          onChange={handleDateRangeChange}
        >
          <option value="all">{t('garage.filters.allTime')}</option>
          <option value="7d">{t('garage.filters.last7Days')}</option>
          <option value="30d">{t('garage.filters.last30Days')}</option>
          <option value="90d">{t('garage.filters.last90Days')}</option>
          <option value="1y">{t('garage.filters.lastYear')}</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="garage-price-min" className={styles.filterLabel}>
          {t('garage.filters.priceMin')}
        </label>
        <input
          id="garage-price-min"
          type="number"
          className={styles.filterInput}
          placeholder={t('garage.filters.priceMinPlaceholder')}
          min="0"
          step="0.01"
          value={priceMinValue}
          onChange={handlePriceMinChange}
        />
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="garage-price-max" className={styles.filterLabel}>
          {t('garage.filters.priceMax')}
        </label>
        <input
          id="garage-price-max"
          type="number"
          className={styles.filterInput}
          placeholder={t('garage.filters.priceMaxPlaceholder')}
          min="0"
          step="0.01"
          value={priceMaxValue}
          onChange={handlePriceMaxChange}
        />
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="garage-search" className={styles.filterLabel}>
          {t('garage.filters.search')}
        </label>
        <input
          id="garage-search"
          type="text"
          className={styles.filterInput}
          placeholder={t('garage.filters.searchPlaceholder')}
          value={searchValue}
          onChange={handleSearchChange}
        />
      </div>

      <div className={styles.filterGroup}>
        <TagFilter
          selectedTags={filters.tags || []}
          tagCounts={tagCounts}
          onChange={(tags) => setFilters({ tags })}
          mode={filters.tagMode || 'OR'}
          onModeChange={(tagMode) => setFilters({ tagMode })}
        />
      </div>
    </div>
  );
}

