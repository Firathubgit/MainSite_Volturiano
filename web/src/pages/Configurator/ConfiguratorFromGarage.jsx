import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../stores/garageStore';
import { fetchGarageItemById } from '../../features/account/api';
import { extractGarageConfigForConfigurator } from '../../features/garage/utils/extractGarageConfigForConfigurator';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import { Navigate } from 'react-router-dom';
import styles from './ConfiguratorFromGarage.module.css';

/**
 * ConfiguratorFromGarage - Route handler for /configurator/:garageItemId
 * 
 * Loads a garage item, extracts its configuration, and redirects to the configurator
 * with the extracted config as initial state.
 */
export default function ConfiguratorFromGarage() {
  const { garageItemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('account');
  
  const items = useGarageStore((state) => state.items);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [garageConfig, setGarageConfig] = useState(null);

  useEffect(() => {
    const loadGarageItem = async () => {
      // Get itemId from URL param or location state
      const itemId = garageItemId || location.state?.garageItemId;
      
      if (!itemId) {
        setError({
          type: 'MISSING_ID',
          message: t('garage.configurator.error.missingItem', 'Garage item ID is missing')
        });
        setLoading(false);
        return;
      }

      try {
        // Check store first (optimistic)
        let garageItem = items.get(itemId);
        
        // If not in store, fetch from API
        if (!garageItem) {
          const { data, error: fetchError } = await fetchGarageItemById(itemId);
          
          if (fetchError) {
            setError({
              type: 'FETCH_ERROR',
              message: fetchError.message || t('garage.configurator.error.missingItem', 'Garage item not found')
            });
            setLoading(false);
            return;
          }
          
          if (!data) {
            setError({
              type: 'NOT_FOUND',
              message: t('garage.configurator.error.missingItem', 'Garage item not found')
            });
            setLoading(false);
            return;
          }
          
          garageItem = data;
        }

        // Extract configuration
        const extractionResult = extractGarageConfigForConfigurator(garageItem);
        
        if (!extractionResult.success) {
          setError({
            type: extractionResult.error,
            message: extractionResult.reason || t('garage.configurator.error.invalidConfig', 'Configuration data is invalid')
          });
          setLoading(false);
          return;
        }

        // Success - attach garage item metadata and set state
        const normalizedConfig = {
          ...extractionResult.data,
          garageItemId: itemId
        };
        
        console.log('[ConfiguratorFromGarage] ===== GARAGE ITEM LOADED =====');
        console.log('[ConfiguratorFromGarage] itemId:', itemId);
        console.log('[ConfiguratorFromGarage] garageItem.id:', garageItem.id);
        console.log('[ConfiguratorFromGarage] normalizedConfig.garageItemId:', normalizedConfig.garageItemId);
        console.log('[ConfiguratorFromGarage] Will pass to configurator for UPDATE');
        
        setGarageConfig(normalizedConfig);
        setLoading(false);
      } catch (err) {
        console.error('[ConfiguratorFromGarage] Error loading garage item:', err);
        setError({
          type: 'GENERIC_ERROR',
          message: err.message || t('garage.configurator.error.generic', 'Failed to load configuration')
        });
        setLoading(false);
      }
    };

    loadGarageItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garageItemId]); // Only depend on garageItemId - items Map reference changes shouldn't trigger reload

  // Show loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingOverlay show={true} />
        <div className={styles.loadingMessage}>
          <span>{t('garage.configurator.loading', 'Loading configuration...')}</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h1 className={styles.errorTitle}>{t('garage.configurator.error.title', 'Configuration Error')}</h1>
          <p className={styles.errorMessage}>{error.message}</p>
          <div className={styles.errorActions}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate('/garage')}
            >
              {t('garage.configurator.backToGarage', 'Back to Garage')}
            </button>
            {(error.type === 'FETCH_ERROR' || error.type === 'GENERIC_ERROR') && (
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // Reload by re-triggering effect
                  window.location.reload();
                }}
              >
                {t('garage.configurator.retry', 'Retry')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Redirect to configurator with extracted config
  if (garageConfig) {
    console.log('[ConfiguratorFromGarage] ===== REDIRECTING TO CONFIGURATOR =====');
    console.log('[ConfiguratorFromGarage] Passing state.garageItemId:', garageConfig.garageItemId);
    console.log('[ConfiguratorFromGarage] Passing state.garageConfig:', garageConfig);
    
    return (
      <Navigate
        to="/configurator"
        state={{ 
          garageConfig,
          garageItemId: garageConfig.garageItemId
        }}
        replace
      />
    );
  }

  // Fallback (shouldn't reach here)
  return (
    <Navigate
      to="/garage"
      replace
    />
  );
}

