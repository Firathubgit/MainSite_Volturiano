import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConfigStore } from '../../../stores/configStore';

/**
 * useConfigSync Hook
 * Syncs configurator state with URL parameters for deep linking
 */
export function useConfigSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOptions = useConfigStore((state) => state.selectedOptions);
  const vehicleId = useConfigStore((state) => state.vehicleId);
  const garageItemId = useConfigStore((state) => state.garageItemId);
  const setSelectedOptions = useConfigStore((state) => state.selectOption);
  const setVehicle = useConfigStore((state) => state.setVehicle);

  // Load configuration from URL on mount
  useEffect(() => {
    const codeParam = searchParams.get('code');
    const saveParam = searchParams.get('save');
    const vehicleParam = searchParams.get('vehicle');

    if (codeParam) {
      try {
        // Decode base64 config
        const decoded = atob(codeParam);
        const config = JSON.parse(decoded);
        
        // Apply configuration
        if (config.vehicleId) {
          setVehicle(config.vehicleId, config.basePrice || 0);
        }
        
        if (config.selectedOptions) {
          Object.entries(config.selectedOptions).forEach(([optionId, valueId]) => {
            setSelectedOptions(optionId, valueId, 0);
          });
        }
      } catch (error) {
        console.error('[useConfigSync] Failed to decode config from URL:', error);
      }
    }

    if (saveParam) {
      // TODO: Load from saved configuration ID
      console.log('[useConfigSync] Load from save ID:', saveParam);
    }

    if (vehicleParam) {
      setVehicle(vehicleParam, 0);
    }
  }, []); // Only run on mount

  // Update URL when configuration changes (debounced)
  // Skip URL updates if editing an existing garage item (to preserve location.state)
  useEffect(() => {
    // Don't update URL if we're editing an existing garage item
    if (garageItemId) {
      console.log('[useConfigSync] Skipping URL update - editing garage item:', garageItemId);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      if (vehicleId && Object.keys(selectedOptions).length > 0) {
        const config = {
          vehicleId,
          selectedOptions
        };
        
        const encoded = btoa(JSON.stringify(config));
        setSearchParams({ code: encoded }, { replace: true });
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [selectedOptions, vehicleId, garageItemId, setSearchParams]);

  // Generate shareable URL
  const getShareableUrl = useCallback(() => {
    if (!vehicleId || Object.keys(selectedOptions).length === 0) {
      return null;
    }

    const config = {
      vehicleId,
      selectedOptions
    };
    
    const encoded = btoa(JSON.stringify(config));
    return `${window.location.origin}${window.location.pathname}?code=${encoded}`;
  }, [vehicleId, selectedOptions]);

  return {
    getShareableUrl
  };
}

