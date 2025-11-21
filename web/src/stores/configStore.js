import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

/**
 * Configurator Store
 * Manages all configurator state including manifest, options, selections, pricing, and compatibility
 */
export const useConfigStore = create(
  devtools(
    persist(
      (set, get) => ({
        // Vehicle & Manifest
        vehicleId: null,
        manifestId: null,
        manifest: null,
        
        // Garage Integration
        garageItemId: null, // ID of garage item being edited (null = new config)
        
        // Options & Selections
        vehicleOptions: [],
        optionGroups: {},
        selectedOptions: {},
        
        // View State
        currentAngle: 'front-3q',
        viewMode: '2d', // '2d' | '3d'
        
        // Compatibility & Validation
        compatibilityViolations: [],
        
        // Pricing
        basePrice: 0,
        pricing: {
          base: 0,
          options: 0,
          taxes: 0,
          incentives: 0,
          total: 0,
          currency: 'EUR'
        },
        
        // Loading States
        loading: {
          manifest: false,
          options: false,
          pricing: false,
          compatibility: false
        },
        
        // Error State
        error: null,
        
        // Actions
        setVehicle: (vehicleId, basePrice = 0) => {
          set({ vehicleId, basePrice, pricing: { ...get().pricing, base: basePrice } });
        },
        
        setGarageItemId: (garageItemId) => {
          console.log('[ConfigStore] Setting garageItemId:', garageItemId);
          set({ garageItemId });
        },
        
        loadManifest: (manifestId, manifestData) => {
          set({ 
            manifestId, 
            manifest: manifestData,
            loading: { ...get().loading, manifest: false }
          });
        },
        
        setManifestLoading: (loading) => {
          set({ loading: { ...get().loading, manifest: loading } });
        },
        
        loadVehicleOptions: (options) => {
          // Group options by configurator_group
          const groups = {};
          options.forEach(option => {
            const group = option.configurator_group || 'other';
            if (!groups[group]) {
              groups[group] = [];
            }
            groups[group].push(option);
          });
          
          set({ 
            vehicleOptions: options,
            optionGroups: groups,
            loading: { ...get().loading, options: false }
          });
        },
        
        setOptionsLoading: (loading) => {
          set({ loading: { ...get().loading, options: loading } });
        },
        
        selectOption: (optionId, valueId, priceDelta = 0, optionGroup = null) => {
          const currentOptions = get().selectedOptions;
          const currentPricing = get().pricing;
          const vehicleOptions = get().vehicleOptions;
          
          // Check if this option is already selected (toggle off)
          const isCurrentlySelected = currentOptions[optionId] === valueId;
          
          // If clicking the same option, deselect it
          if (isCurrentlySelected) {
            const next = { ...currentOptions };
            delete next[optionId];
            
            // Recalculate pricing by removing this option's price
            const removedPrice = priceDelta;
            
            set({ 
              selectedOptions: next,
              pricing: {
                ...currentPricing,
                options: Math.max(0, currentPricing.options - removedPrice),
                total: currentPricing.base + Math.max(0, currentPricing.options - removedPrice) + currentPricing.taxes - currentPricing.incentives
              }
            });
            return;
          }
          
          // For radio button groups (paint, wheels, etc.), deselect other options in the same group
          let next = { ...currentOptions };
          
          if (optionGroup) {
            // Find all options in the same group and deselect them
            const groupOptions = vehicleOptions.filter(opt => {
              const code = (opt.code || '').toLowerCase();
              if (optionGroup === 'exterior' || optionGroup === 'paint') {
                return code.startsWith('paint_') || code.includes('paint');
              } else if (optionGroup === 'wheels' || optionGroup === 'rims') {
                return code.startsWith('rim') || code.startsWith('wheel') || code.includes('rim') || code.includes('wheel');
              } else if (optionGroup === 'interior') {
                return code.startsWith('seat') || code.includes('interior') || opt.category === 'interior';
              } else if (optionGroup === 'performance') {
                return code.startsWith('engine') || code.startsWith('brake') || opt.category === 'performance';
              } else if (optionGroup === 'trim') {
                return code.includes('trim') || code.includes('model');
              }
              return opt.configurator_group === optionGroup;
            });
            
            // Remove all options in this group from selectedOptions
            groupOptions.forEach(opt => {
              if (next[opt.id]) {
                // Subtract their price
                const oldPrice = (opt.price_cents || 0) / 100;
                currentPricing.options = Math.max(0, currentPricing.options - oldPrice);
                delete next[opt.id];
              }
            });
          }
          
          // Add the new selection
          next[optionId] = valueId;
          
          // Calculate new pricing
          const newOptionsPrice = currentPricing.options + priceDelta;
          
          set({ 
            selectedOptions: next,
            pricing: {
              ...currentPricing,
              options: newOptionsPrice,
              total: currentPricing.base + newOptionsPrice + currentPricing.taxes - currentPricing.incentives
            }
          });
        },
        
        setAngle: (angle) => {
          set({ currentAngle: angle });
        },
        
        setViewMode: (mode) => {
          set({ viewMode: mode });
        },
        
        setCompatibilityViolations: (violations) => {
          set({ 
            compatibilityViolations: violations,
            loading: { ...get().loading, compatibility: false }
          });
        },
        
        setCompatibilityLoading: (loading) => {
          set({ loading: { ...get().loading, compatibility: loading } });
        },
        
        clearSelections: () => {
          set((state) => ({
            selectedOptions: {},
            pricing: {
              ...state.pricing,
              options: 0,
              total: state.pricing.base + state.pricing.taxes - state.pricing.incentives
            }
          }));
        },

        updatePricing: (pricingData) => {
          set({ 
            pricing: pricingData,
            loading: { ...get().loading, pricing: false }
          });
        },
        
        setPricingLoading: (loading) => {
          set({ loading: { ...get().loading, pricing: loading } });
        },
        
        setError: (error) => {
          set({ error });
        },
        
        clearError: () => {
          set({ error: null });
        },
        
        reset: () => {
          set({
            vehicleId: null,
            manifestId: null,
            manifest: null,
            garageItemId: null,
            vehicleOptions: [],
            optionGroups: {},
            selectedOptions: {},
            currentAngle: 'front-3q',
            viewMode: '2d',
            compatibilityViolations: [],
            basePrice: 0,
            pricing: {
              base: 0,
              options: 0,
              taxes: 0,
              incentives: 0,
              total: 0,
              currency: 'EUR'
            },
            loading: {
              manifest: false,
              options: false,
              pricing: false,
              compatibility: false
            },
            error: null
          });
        },
        
        // Computed Selectors
        totalPrice: () => {
          const pricing = get().pricing;
          return pricing.base + pricing.options + pricing.taxes - pricing.incentives;
        },
        
        isComplete: () => {
          const { vehicleOptions, selectedOptions } = get();
          // Check if all required option groups have a selection
          const requiredGroups = vehicleOptions
            .filter(opt => opt.configurator_required)
            .map(opt => opt.configurator_group)
            .filter((v, i, a) => a.indexOf(v) === i); // unique
          
          return requiredGroups.every(group => {
            const groupOptions = vehicleOptions.filter(opt => opt.configurator_group === group);
            return groupOptions.some(opt => selectedOptions[opt.id]);
          });
        }
      }),
      {
        name: 'volturiano_config_guest',
        partialize: (state) => ({
          vehicleId: state.vehicleId,
          selectedOptions: state.selectedOptions,
          currentAngle: state.currentAngle,
          viewMode: state.viewMode
        }),
        // Skip hydration - we'll manually load garage config instead
        skipHydration: false
      }
    ),
    { name: 'ConfigStore' }
  )
);

