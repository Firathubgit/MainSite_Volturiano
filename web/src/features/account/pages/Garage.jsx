import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import { useUserStore } from '../../../stores/userStore';
import GarageFilters from '../../garage/components/GarageFilters';
import CarCard from '../../garage/components/CarCard';
import styles from '../../garage/styles/garage.module.css';

const CONFIGURATION_STATES = ['saved', 'prototype', 'wishlist'];

function FilterIcon(props) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <line x1="6" y1="8" x2="24" y2="8" stroke="#fefefe" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="8" r="3" fill="#0d0d0d" stroke="#fefefe" strokeWidth="2" />
      <line x1="6" y1="15" x2="24" y2="15" stroke="#fefefe" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="15" r="3" fill="#0d0d0d" stroke="#fefefe" strokeWidth="2" />
      <line x1="6" y1="22" x2="24" y2="22" stroke="#fefefe" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="22" r="3" fill="#0d0d0d" stroke="#fefefe" strokeWidth="2" />
    </svg>
  );
}

export default function Garage() {
  const { t } = useTranslation('account');
  const navigate = useNavigate();

  const loadGarage = useGarageStore((state) => state.loadGarage);
  const subscribeRealtime = useGarageStore((state) => state.subscribeRealtime);
  const unsubscribeRealtime = useGarageStore((state) => state.unsubscribeRealtime);
  const error = useGarageStore((state) => state.error);
  const loading = useGarageStore((state) => state.loading);
  const getItemsByState = useGarageStore((state) => state.getItemsByState);
  const itemsMap = useGarageStore((state) => state.items);
  const { session, profile } = useUserStore();

  const [activeTab, setActiveTab] = useState('configurations');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const worldEnabled = import.meta.env.VITE_ENABLE_WORLD === 'true';

  const displayName =
    profile?.first_name ||
    profile?.full_name ||
    profile?.display_name ||
    session?.user?.email?.split('@')[0] ||
    'Firat';

  useEffect(() => {
    loadGarage(true).catch((err) => {
      console.error('[Garage] Failed to load garage:', err);
    });

    subscribeRealtime();
    return () => {
      unsubscribeRealtime();
    };
  }, [loadGarage, subscribeRealtime, unsubscribeRealtime]);

  useEffect(() => {
    if (error) {
      console.error('[Garage] Error loading garage:', error);
    }
  }, [error]);

  useEffect(() => {
    if (!isFilterOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterOpen]);

  const purchasedItems = getItemsByState('purchased');
  const configurationItems = CONFIGURATION_STATES.flatMap((state) => {
    const list = getItemsByState(state);
    return Array.isArray(list) ? list : [];
  });

  const sideLinks = useMemo(
    () => [
      { key: 'overview', label: 'Översikt' },
      { key: 'zibbi', label: 'Zibbi page' },
      { key: 'configure', label: 'Konfigurera nytt', to: '/configurator' },
      { key: 'garage', label: 'Garage', to: '/garage', active: true },
      { key: 'showroom', label: 'Showroom', to: '/#showroom' },
      {
        key: 'world',
        label: 'Volturiano world',
        to: worldEnabled ? '/world' : null,
        disabled: !worldEnabled
      },
      { key: 'vet', label: 'Vet inte ens vad jao' },
      { key: 'free', label: 'Free mehrab' }
    ],
    [worldEnabled]
  );

  const activeItems = activeTab === 'cars' ? purchasedItems : configurationItems;
  const itemsCount = {
    cars: purchasedItems.length,
    configurations: configurationItems.length
  };

  const handleAddConfiguration = () => {
    navigate('/configurator');
  };

  return (
    <div className={styles.garagePage}>
      <aside className={styles.sidebar}>
        <button
          type="button"
          className={styles.sidebarFilterButton}
          onClick={() => setIsFilterOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isFilterOpen}
        >
          <FilterIcon />
        </button>
        <nav className={styles.sidebarNav} aria-label="Garage navigation">
          {sideLinks.map((link, index) => {
            const content = (
              <span
                className={styles.sidebarButton}
                data-active={link.active ? 'true' : undefined}
                data-disabled={link.disabled ? 'true' : undefined}
              >
                {link.label}
              </span>
            );

            if (link.to && !link.disabled) {
              return (
                <Link
                  key={link.key}
                  to={link.to}
                  className={styles.sidebarLink}
                  aria-current={link.active ? 'page' : undefined}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={link.key}
                className={styles.sidebarLink}
                data-disabled={link.disabled ? 'true' : undefined}
                aria-disabled={link.disabled ? 'true' : undefined}
              >
                {content}
              </div>
            );
          })}
        </nav>
      </aside>

      <section className={styles.mainContent}>
        <header className={styles.pageHeader}>
          <div className={styles.headingGroup}>
            <h1 className={styles.greeting}>Hej {displayName}</h1>
            <div className={styles.tabs}>
              <button
                type="button"
                className={styles.tabButton}
                data-active={activeTab === 'cars' ? 'true' : undefined}
                onClick={() => setActiveTab('cars')}
              >
                {t('garage.tabs.cars')}
                <span>({itemsCount.cars})</span>
              </button>
              <button
                type="button"
                className={styles.tabButton}
                data-active={activeTab === 'configurations' ? 'true' : undefined}
                onClick={() => setActiveTab('configurations')}
              >
                {t('garage.tabs.configurations')}
                <span>({itemsCount.configurations})</span>
              </button>
            </div>
          </div>
          <button type="button" className={styles.addConfiguration} onClick={handleAddConfiguration}>
            <span className={styles.addConfigurationIcon}>+</span>
            {t('garage.actions.addConfiguration')}
          </button>
        </header>

        {(error || (!loading && itemsMap.size === 0)) && (
          <div className={styles.debugPanel}>
            {error
              ? `${t('garage.error.loadFailed')}: ${error.message}`
              : t('garage.empty.default')}
          </div>
        )}

        {activeItems.length === 0 ? (
          <div className={styles.emptyStateMessage}>
            {activeTab === 'cars'
              ? t('garage.empty.purchased')
              : t('garage.empty.saved')}
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {activeItems.map((item) => (
              <CarCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {isFilterOpen && (
        <div className={styles.filterOverlay} role="dialog" aria-modal="true">
          <div className={styles.filterPanel}>
            <div className={styles.filterPanelHeader}>
              <h2 className={styles.filterPanelTitle}>{t('garage.filterTrigger')}</h2>
              <button
                type="button"
                className={styles.filterPanelClose}
                onClick={() => setIsFilterOpen(false)}
              >
                {t('garage.overlay.close')}
              </button>
            </div>
            <GarageFilters variant="overlay" />
          </div>
        </div>
      )}
    </div>
  );
}

