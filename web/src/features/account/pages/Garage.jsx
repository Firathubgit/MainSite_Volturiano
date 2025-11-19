import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
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

console.log('[Garage] ===== MODULE LOADED =====', new Date().toISOString());

export default function Garage() {
  console.log('[Garage] ===== COMPONENT RENDERED =====', new Date().toISOString());
  
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

  console.log('[Garage] Component rendered:', {
    hasSession: !!session,
    sessionUserId: session?.user?.id,
    hasProfile: !!profile,
    profileId: profile?.id,
    itemsCount: itemsMap.size,
    loading,
    error: error?.message,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('[Garage] useEffect triggered - loading garage...');
    console.log('[Garage] Session at load time:', {
      hasSession: !!session,
      sessionUserId: session?.user?.id
    });
    
    loadGarage(true).then(() => {
      console.log('[Garage] loadGarage completed successfully');
    }).catch((err) => {
      console.error('[Garage] Failed to load garage:', err);
      console.error('[Garage] Error details:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack
      });
    });

    console.log('[Garage] Subscribing to realtime...');
    subscribeRealtime();
    return () => {
      console.log('[Garage] Cleaning up - unsubscribing from realtime');
      unsubscribeRealtime();
    };
  }, [loadGarage, subscribeRealtime, unsubscribeRealtime, session]);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const sidebarItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  const tabVariants = {
    hidden: { opacity: 0, y: -5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  const cardGridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.2
      }
    }
  };

  const cardItemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  const filterOverlayVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1]
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.15,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  const filterPanelVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }
    },
    exit: {
      opacity: 0,
      y: 20,
      scale: 0.98,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  return (
    <motion.div
      className={styles.garagePage}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <aside className={styles.sidebar}>
        <motion.button
          type="button"
          className={styles.sidebarFilterButton}
          onClick={() => setIsFilterOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isFilterOpen}
          variants={sidebarItemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FilterIcon />
        </motion.button>
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
                <motion.div
                  key={link.key}
                  variants={sidebarItemVariants}
                  custom={index}
                >
                  <Link
                    to={link.to}
                    className={styles.sidebarLink}
                    aria-current={link.active ? 'page' : undefined}
                  >
                    {content}
                  </Link>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={link.key}
                className={styles.sidebarLink}
                data-disabled={link.disabled ? 'true' : undefined}
                aria-disabled={link.disabled ? 'true' : undefined}
                variants={sidebarItemVariants}
                custom={index}
              >
                {content}
              </motion.div>
            );
          })}
        </nav>
      </aside>

      <section className={styles.mainContent}>
        <motion.header
          className={styles.pageHeader}
          variants={headerVariants}
        >
          <div className={styles.headingGroup}>
            <motion.h1
              className={styles.greeting}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              Hej {displayName}
            </motion.h1>
            <motion.div
              className={styles.tabs}
              variants={tabVariants}
            >
              <motion.button
                type="button"
                className={styles.tabButton}
                data-active={activeTab === 'cars' ? 'true' : undefined}
                onClick={() => setActiveTab('cars')}
                whileHover={{ opacity: 0.8 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('garage.tabs.cars')}
                <span>({itemsCount.cars})</span>
              </motion.button>
              <motion.button
                type="button"
                className={styles.tabButton}
                data-active={activeTab === 'configurations' ? 'true' : undefined}
                onClick={() => setActiveTab('configurations')}
                whileHover={{ opacity: 0.8 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('garage.tabs.configurations')}
                <span>({itemsCount.configurations})</span>
              </motion.button>
            </motion.div>
          </div>
          <motion.button
            type="button"
            className={styles.addConfiguration}
            onClick={handleAddConfiguration}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className={styles.addConfigurationIcon}>+</span>
            {t('garage.actions.addConfiguration')}
          </motion.button>
        </motion.header>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              className={styles.debugPanel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {`${t('garage.error.loadFailed')}: ${error.message}`}
            </motion.div>
          )}

          {activeItems.length === 0 ? (
            <motion.div
              className={styles.emptyStateMessage}
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'cars'
                ? t('garage.empty.purchased')
                : t('garage.empty.saved')}
                Try reloading.
            </motion.div>
          ) : (
            <motion.div
              key="cards"
              className={styles.cardGrid}
              variants={cardGridVariants}
              initial="hidden"
              animate="visible"
            >
              {activeItems.map((item) => (
                <motion.div key={item.id} variants={cardItemVariants}>
                  <CarCard item={item} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            className={styles.filterOverlay}
            role="dialog"
            aria-modal="true"
            variants={filterOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsFilterOpen(false);
              }
            }}
          >
            <motion.div
              className={styles.filterPanel}
              variants={filterPanelVariants}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.filterPanelHeader}>
                <h2 className={styles.filterPanelTitle}>{t('garage.filterTrigger')}</h2>
                <motion.button
                  type="button"
                  className={styles.filterPanelClose}
                  onClick={() => setIsFilterOpen(false)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  {t('garage.overlay.close')}
                </motion.button>
              </div>
              <GarageFilters variant="overlay" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

