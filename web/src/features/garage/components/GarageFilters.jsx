import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import styles from '../styles/garage.module.css';

/**
 * Garage filters component
 */
export default function GarageFilters() {
  const { t } = useTranslation('account');
  const { filters, setFilters } = useGarageStore();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [priceMinValue, setPriceMinValue] = useState(
    filters.priceMin ? (filters.priceMin / 100).toString() : ''
  );
  const [priceMaxValue, setPriceMaxValue] = useState(
    filters.priceMax ? (filters.priceMax / 100).toString() : ''
  );

  const handleStateChange = (e) => {
    const newState = e.target.value === 'all' ? null : e.target.value;
    setFilters({ state: newState });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    // Debounce search - update filters after user stops typing
    clearTimeout(window.garageSearchTimeout);
    window.garageSearchTimeout = setTimeout(() => {
      setFilters({ search: value });
    }, 300);
  };

  const handleDateRangeChange = (e) => {
    const value = e.target.value === 'all' ? null : e.target.value;
    setFilters({ dateRange: value });
  };

  const handleDateFieldChange = (e) => {
    setFilters({ dateField: e.target.value });
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

  return (
    <div className={styles.filters}>
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
    </div>
  );
}

