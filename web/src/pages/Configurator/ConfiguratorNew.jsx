import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConfigStore } from '../../stores/configStore';
import { supabase } from '../../lib/supabaseClient';
import { 
  fetchPublishedManifestByVehicle,
  fetchVehicleOptions,
  checkCompatibility,
  calculateConfigurationTotals
} from '../../features/configurator/api';
import { parseManifest, cacheManifest } from '../../features/configurator/utils/manifestLoader';
import { resolveAssets } from '../../features/configurator/utils/assetResolver';
import { evaluateRules } from '../../features/configurator/logic/compatibility';
import ConfiguratorLayout from '../../features/configurator/components/ConfiguratorLayout/ConfiguratorLayout';
import ConfiguratorHeader from '../../features/configurator/components/ConfiguratorHeader/ConfiguratorHeader';
import ViewModeToggle from '../../features/configurator/components/ViewModeToggle/ViewModeToggle';
import ConfiguratorCanvas from '../../features/configurator/components/ConfiguratorCanvas/ConfiguratorCanvas';
import ConfigurationPanel from '../../features/configurator/components/ConfigurationPanel/ConfigurationPanel';
import CompatibilityAlert from '../../features/configurator/components/CompatibilityAlert/CompatibilityAlert';
import CameraControls from '../../features/configurator/components/CameraControls/CameraControls';
import PricingFooter from '../../features/configurator/components/PricingFooter/PricingFooter';
import { useConfigSync } from '../../features/configurator/hooks/useConfigSync';
import { 
  findPaintColorFromOptions, 
  findRimColorFromOptions 
} from '../../features/garage/utils/extractGarageConfigForConfigurator';
import { Viewer3D } from '../../viewers/three-d/Viewer3D';
import '../../features/configurator/styles/configurator.css';

export default function ConfiguratorNew() {
  const { t } = useTranslation('configurator');
  const location = useLocation();
  const navigate = useNavigate();
  const garageConfig = location.state?.garageConfig;
  const garageItemId = location.state?.garageItemId || garageConfig?.garageItemId || garageConfig?.id || null; // Get garage item ID for updates
  
  // Debug logging
  console.log('[ConfiguratorNew] ===== COMPONENT MOUNTED =====');
  console.log('[ConfiguratorNew] location.state:', location.state);
  console.log('[ConfiguratorNew] garageConfig:', garageConfig);
  console.log('[ConfiguratorNew] garageItemId:', garageItemId);
  console.log('[ConfiguratorNew] Will UPDATE existing item:', !!garageItemId);
  
  // Config store state
  const vehicleId = useConfigStore((state) => state.vehicleId);
  const manifest = useConfigStore((state) => state.manifest);
  const selectedOptions = useConfigStore((state) => state.selectedOptions);
  const currentAngle = useConfigStore((state) => state.currentAngle);
  const viewMode = useConfigStore((state) => state.viewMode);
  const compatibilityViolations = useConfigStore((state) => state.compatibilityViolations);
  const loading = useConfigStore((state) => state.loading);
  const vehicleOptions = useConfigStore((state) => state.vehicleOptions);
  const storedGarageItemId = useConfigStore((state) => state.garageItemId);
  
  // Actions
  const setVehicle = useConfigStore((state) => state.setVehicle);
  const loadManifest = useConfigStore((state) => state.loadManifest);
  const loadVehicleOptions = useConfigStore((state) => state.loadVehicleOptions);
  const setAngle = useConfigStore((state) => state.setAngle);
  const setCompatibilityViolations = useConfigStore((state) => state.setCompatibilityViolations);
  const setManifestLoading = useConfigStore((state) => state.setManifestLoading);
  const setOptionsLoading = useConfigStore((state) => state.setOptionsLoading);
  const updatePricing = useConfigStore((state) => state.updatePricing);
  const setPricingLoading = useConfigStore((state) => state.setPricingLoading);
  const selectOption = useConfigStore((state) => state.selectOption);
  const clearSelections = useConfigStore((state) => state.clearSelections);
  const setGarageItemId = useConfigStore((state) => state.setGarageItemId);
  
  // Use stored garageItemId if location.state is lost
  const effectiveGarageItemId = garageItemId || storedGarageItemId;
  
  // Local state
  const [storeHydrated, setStoreHydrated] = useState(
    typeof useConfigStore.persist?.hasHydrated === 'function'
      ? useConfigStore.persist.hasHydrated()
      : true
  );

  useEffect(() => {
    if (storeHydrated) {
      return undefined;
    }

    if (typeof useConfigStore.persist?.onFinishHydration === 'function') {
      const unsub = useConfigStore.persist.onFinishHydration(() => {
        setStoreHydrated(true);
      });
      return () => unsub?.();
    }

    setStoreHydrated(true);
    return undefined;
  }, [storeHydrated]);
  
  // Deep linking
  useConfigSync();
  
  // Store garageItemId in configStore so it persists across re-renders
  useEffect(() => {
    if (garageItemId && garageItemId !== storedGarageItemId) {
      console.log('[ConfiguratorNew] Storing garageItemId in configStore:', garageItemId);
      setGarageItemId(garageItemId);
    }
  }, [garageItemId, storedGarageItemId, setGarageItemId]);
  
  // Initialize from garage config or vehicle
  useEffect(() => {
    if (!storeHydrated) {
      console.log('[Configurator] Waiting for store hydration...');
      return;
    }

    const initializeConfigurator = async () => {
      let targetVehicleId = vehicleId;
      let targetVehicleSlug = 'tornado-gt';
      
      // Get vehicle ID from garage config
      if (garageConfig?.vehicle?.model) {
        // Look up vehicle by model/slug
        targetVehicleSlug = garageConfig.vehicle.model.toLowerCase().replace(/\s+/g, '-');
        
        try {
          const { data: vehicleData, error: vehicleError } = await supabase
            .from('vehicles')
            .select('id, slug, base_price_cents')
            .eq('slug', targetVehicleSlug)
            .single();
          
          if (!vehicleError && vehicleData) {
            targetVehicleId = vehicleData.id;
            setVehicle(targetVehicleId, (vehicleData.base_price_cents || 0) / 100);
          } else {
            // Fallback to default Tornado GT ID
            targetVehicleId = '11111111-1111-1111-1111-111111111111';
            setVehicle(targetVehicleId, 180000);
          }
        } catch (error) {
          console.error('[Configurator] Error looking up vehicle:', error);
          // Fallback to default
          targetVehicleId = '11111111-1111-1111-1111-111111111111';
          setVehicle(targetVehicleId, 180000);
        }
      } else if (!targetVehicleId) {
        // Default to Tornado GT
        targetVehicleId = '11111111-1111-1111-1111-111111111111';
        setVehicle(targetVehicleId, 180000);
      }
      
      if (!targetVehicleId) {
        console.warn('[Configurator] No vehicle ID found');
        return;
      }
      
      // Load manifest - try direct fetch first (more reliable)
      setManifestLoading(true);
      try {
        const { data: directManifest, error: directError } = await supabase
          .from('config_2d_manifests')
          .select('data')
          .eq('slug', 'tornado-gt-launch')
          .eq('status', 'published')
          .single();
        
        if (!directError && directManifest?.data) {
          const parsed = parseManifest(directManifest.data);
          if (parsed) {
            loadManifest('tornado-gt-launch', parsed);
            cacheManifest('tornado-gt-launch', parsed);
          }
        } else {
          // Fallback to vehicle-based lookup
          const { data: manifestData, error: manifestError } = await fetchPublishedManifestByVehicle(targetVehicleSlug);
          if (!manifestError && manifestData) {
            const parsed = parseManifest(manifestData);
            if (parsed) {
              loadManifest('tornado-gt-launch', parsed);
              cacheManifest('tornado-gt-launch', parsed);
            }
          }
        }
      } catch (error) {
        console.error('[Configurator] Error loading manifest:', error);
      } finally {
        setManifestLoading(false);
      }
      
      // Load vehicle options (bypass cache to see actual fetch)
      setOptionsLoading(true);
      try {
        const { data: options, error: optionsError } = await fetchVehicleOptions(targetVehicleId, true); // Bypass cache
        
        if (optionsError) {
          console.error('[Configurator] Failed to load options:', optionsError);
          setOptionsLoading(false);
          return;
        }
        
        if (options && options.length > 0) {
          console.log('[Configurator] ===== LOADED VEHICLE OPTIONS =====');
          console.log('[Configurator] Total options loaded:', options.length);
          console.log('[Configurator] Options details:', options.map(o => ({
            id: o.id,
            code: o.code,
            label: o.label,
            category: o.category,
            configurator_group: o.configurator_group,
            configurator_visible: o.configurator_visible,
            price_cents: o.price_cents
          })));
          console.log('[Configurator] Paint options:', options.filter(o => {
            const code = (o.code || '').toLowerCase();
            return code.startsWith('paint_') || code.includes('paint');
          }).map(o => ({ code: o.code, label: o.label })));
          console.log('[Configurator] Performance options:', options.filter(o => {
            const code = (o.code || '').toLowerCase();
            return code.startsWith('brake') || code.startsWith('engine') || o.category === 'performance';
          }).map(o => ({ code: o.code, label: o.label })));
          loadVehicleOptions(options);
          
          // Apply garage config selections if available
          if (garageConfig?.options) {
            console.log('[Configurator] ===== APPLYING GARAGE CONFIG =====');
            console.log('[Configurator] Garage config options:', garageConfig.options);
            
            // Clear existing selections first
            clearSelections();
            
            // Map garage options to configurator option IDs
            const allOptions = [...(garageConfig.options.exterior || []), 
                                ...(garageConfig.options.interior || []),
                                ...(garageConfig.options.performance || [])];
            
            console.log('[Configurator] All garage options to apply:', allOptions);
            
            // Process options immediately (no setTimeout)
            for (const garageOption of allOptions) {
              const optionId = typeof garageOption === 'string' ? garageOption : garageOption?.id || garageOption?.code;
              if (!optionId) continue;
              
              console.log('[Configurator] Looking for match for garage option:', optionId);
              
              // Find matching option in loaded options
              const matchingOption = options.find(opt => {
                if (opt.code === optionId || opt.id === optionId) return true;
                
                const normalizedOptCode = (opt.code || '').replace(/-/g, '_').toLowerCase();
                const normalizedGarageId = (optionId || '').replace(/-/g, '_').toLowerCase();
                if (normalizedOptCode === normalizedGarageId) return true;
                
                const garageBase = optionId.replace(/^(paint_|rim_|rims_|wheel_)/, '').replace(/_/g, '-');
                const optBase = (opt.code || '').replace(/^(paint_|rim_|rims_|wheel_)/, '').replace(/_/g, '-');
                if (garageBase && optBase && garageBase === optBase) return true;
                
                if (opt.code && (opt.code.includes(optionId) || optionId.includes(opt.code))) return true;
                
                return false;
              });
              
              if (matchingOption) {
                const priceDelta = (matchingOption.price_cents || 0) / 100;
                
                const code = (matchingOption.code || '').toLowerCase();
                let optionGroup = matchingOption.configurator_group;
                
                if (!optionGroup) {
                  if (code.startsWith('paint_') || code.includes('paint')) optionGroup = 'exterior';
                  else if (code.startsWith('rim') || code.startsWith('wheel')) optionGroup = 'wheels';
                  else if (code.startsWith('seat') || matchingOption.category === 'interior') optionGroup = 'interior';
                  else if (code.startsWith('engine') || code.startsWith('brake') || matchingOption.category === 'performance') optionGroup = 'performance';
                  else if (code.includes('trim') || code.includes('model')) optionGroup = 'trim';
                }
                
                // Select with explicit group to ensure radio behavior
                selectOption(matchingOption.id, matchingOption.id, priceDelta, optionGroup);
                console.log('[Configurator] ✓ Selected option:', matchingOption.code, 'ID:', matchingOption.id, 'Group:', optionGroup);
              } else {
                console.warn('[Configurator] ✗ No match found for garage option:', optionId);
              }
            }
            
            console.log('[Configurator] ===== GARAGE CONFIG APPLIED =====');
            console.log('[Configurator] Final selectedOptions:', useConfigStore.getState().selectedOptions);
          }
          
          // Set initial angle from garage config
          if (garageConfig?.cameraAngle) {
            setAngle(garageConfig.cameraAngle);
          }
        }
      } catch (error) {
        console.error('[Configurator] Error loading options:', error);
      } finally {
        setOptionsLoading(false);
      }
    };
    
    initializeConfigurator();
  }, [garageConfig, storeHydrated]); // Re-run if garageConfig changes or hydration completes
  
  // Resolve assets from manifest and selected options
  const resolvedLayers = useMemo(() => {
    if (!manifest || !selectedOptions) {
      return [];
    }
    
    return resolveAssets(manifest, selectedOptions, currentAngle, vehicleOptions);
  }, [manifest, selectedOptions, currentAngle, vehicleOptions]);
  
  // Get available angles from manifest
  const availableAngles = useMemo(() => {
    if (!manifest || !manifest.angles) {
      return ['front-3q', 'side', 'rear-3q', 'rim'];
    }
    return manifest.angles;
  }, [manifest]);
  
  // Handle option selection - this will be called from ConfigurationPanel
  // The actual selection is handled by the store directly
  // This function is for compatibility checking and pricing updates
  useEffect(() => {
    if (!vehicleId || Object.keys(selectedOptions).length === 0) {
      return;
    }
    
    const updateCompatibilityAndPricing = async () => {
      // Check compatibility
      try {
        const { data: violations, error } = await checkCompatibility(
          selectedOptions,
          vehicleId
        );
        
        if (!error && violations) {
          setCompatibilityViolations(violations);
        } else {
          setCompatibilityViolations([]);
        }
      } catch (error) {
        console.error('[Configurator] Error checking compatibility:', error);
      }
      
      // Update pricing
      setPricingLoading(true);
      try {
        const { data: pricing, error: pricingError } = await calculateConfigurationTotals(
          selectedOptions,
          vehicleId
        );
        
        if (!pricingError && pricing) {
          updatePricing(pricing);
        }
      } catch (error) {
        console.error('[Configurator] Error calculating pricing:', error);
      } finally {
        setPricingLoading(false);
      }
    };
    
    updateCompatibilityAndPricing();
  }, [selectedOptions, vehicleId]);
  
  // Handle auto-resolve compatibility
  const handleAutoResolve = (violation) => {
    if (violation.type === 'requires_missing' && violation.secondary_option_value_id) {
      // Find the option that corresponds to this value ID
      const option = vehicleOptions.find(opt => opt.id === violation.secondary_option_value_id);
      if (option) {
        selectOption(option.id, option.id, (option.price_cents || 0) / 100);
      }
    }
  };
  
  // Render 3D viewer if in 3D mode
  const renderViewer = () => {
    if (viewMode === '3d') {
      // Extract colors from selected options for 3D
      // Convert selectedOptions object to array of option codes
      const selectedOptionCodes = Object.keys(selectedOptions).map(optionId => {
        const option = vehicleOptions.find(opt => opt.id === optionId);
        return option?.code || optionId;
      });
      
      console.log('[Configurator] ===== 3D VIEWER COLOR EXTRACTION =====');
      console.log('[Configurator] selectedOptions keys:', Object.keys(selectedOptions));
      console.log('[Configurator] selectedOptionCodes:', selectedOptionCodes);
      console.log('[Configurator] vehicleOptions:', vehicleOptions.map(o => ({ id: o.id, code: o.code })));
      
      const paintColor = findPaintColorFromOptions(selectedOptionCodes);
      const rimColor = findRimColorFromOptions(selectedOptionCodes);
      
      const BODY_COLOR_HEX = {
        'blu-blue': '#060FE7',
        'nero-black': '#111111',
        'bianco-white': '#FFFFFF',
        'rosso-red': '#E10600',
        'orange-fury': '#FF4520',
      };
      
      const RIM_COLOR_HEX = {
        'black': '#111111',
        'silver': '#F7FAFF',
        'bronze': '#900678',
      };
      
      console.log('[Configurator] Extracted colors:', { paintColor, rimColor });
      console.log('[Configurator] Final hex colors:', { 
        bodyColorHex: BODY_COLOR_HEX[paintColor] || '#060FE7',
        rimColorHex: RIM_COLOR_HEX[rimColor] || '#111111'
      });
      
      return (
        <Viewer3D 
          bodyColor={BODY_COLOR_HEX[paintColor] || '#060FE7'} 
          rimColor={RIM_COLOR_HEX[rimColor] || '#111111'} 
        />
      );
    }
    
    // 2D mode - use ConfiguratorCanvas with LayeredViewer
    return (
      <ConfiguratorCanvas
        layers={resolvedLayers}
        isLoading={loading.manifest || loading.options}
        currentAngle={currentAngle}
        showGrid={false}
        manifest={manifest}
        onLayerLoad={(layerId, url) => {
          console.log('[Configurator] Layer loaded:', layerId, url);
        }}
        onLayerError={(layerId, url, error) => {
          console.error('[Configurator] Layer error:', layerId, url, error);
        }}
      />
    );
  };
  
  return (
    <ConfiguratorLayout
      header={<ConfiguratorHeader />}
          panel={<ConfigurationPanel garageItemId={effectiveGarageItemId} />}
    >
      {/* View Mode Toggle */}
      <ViewModeToggle />
      
      {/* Compatibility Alerts */}
      {compatibilityViolations.length > 0 && (
        <CompatibilityAlert
          violations={compatibilityViolations}
          onAutoResolve={handleAutoResolve}
          onDismiss={(violation) => {
            // Remove violation from list
            setCompatibilityViolations(
              compatibilityViolations.filter(v => v.ruleId !== violation.ruleId)
            );
          }}
        />
      )}
      
      {/* Main Viewer */}
      {renderViewer()}
      
      {/* Camera Controls (for 2D mode) */}
      {viewMode === '2d' && (
        <CameraControls availableAngles={availableAngles} />
      )}
      
      {/* Pricing Footer Overlay */}
      <PricingFooter garageItemId={effectiveGarageItemId} />
    </ConfiguratorLayout>
  );
}

