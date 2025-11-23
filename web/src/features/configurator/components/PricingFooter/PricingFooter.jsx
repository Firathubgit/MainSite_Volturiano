import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../../stores/configStore';
import { useUserStore } from '../../../../stores/userStore';
import SaveToGarageButton from '../../../garage/components/SaveToGarageButton';
import styles from './PricingFooter.module.css';

/**
 * PricingFooter Component
 * Fixed footer with total price and order button
 */
export default function PricingFooter({ garageItemId = null }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const pricing = useConfigStore((state) => state.pricing);
  const totalPrice = useConfigStore((state) => state.totalPrice());
  const vehicleId = useConfigStore((state) => state.vehicleId);
  const manifest = useConfigStore((state) => state.manifest);
  const selectedOptions = useConfigStore((state) => state.selectedOptions);
  const vehicleOptions = useConfigStore((state) => state.vehicleOptions);
  const currentAngle = useConfigStore((state) => state.currentAngle);
  
  // Debug logging
  console.log('[PricingFooter] Rendered with garageItemId:', garageItemId);
  
  // Build configuration payload for saving to garage
  const configuration = useMemo(() => {
    if (!vehicleId || !manifest) return null;
    
    // Group selected options by category
    const exteriorOptions = [];
    const interiorOptions = [];
    const performanceOptions = [];
    
    Object.entries(selectedOptions).forEach(([optionId, valueId]) => {
      const option = vehicleOptions.find(opt => opt.id === optionId);
      if (!option) return;
      
      const optionData = {
        id: option.code || optionId,
        label: option.label,
        price: (option.price_cents || 0) / 100
      };
      
      if (option.category === 'exterior' || option.configurator_group === 'exterior' || option.code?.startsWith('paint_') || option.code?.startsWith('rim') || option.code?.startsWith('wheel')) {
        exteriorOptions.push(optionData);
      } else if (option.category === 'interior' || option.configurator_group === 'interior') {
        interiorOptions.push(optionData);
      } else if (option.category === 'performance' || option.configurator_group === 'performance') {
        performanceOptions.push(optionData);
      }
    });
    
    return {
      schemaVersion: 1,
      vehicle: {
        model: manifest.vehicleModel || 'Tornado GT',
        trim: null,
        year: 2025,
        vin: null
      },
      options: {
        exterior: exteriorOptions,
        interior: interiorOptions,
        performance: performanceOptions
      },
      pricing: {
        basePriceCents: pricing.base * 100 || 0,
        optionsTotalCents: pricing.options * 100 || 0,
        discountCents: pricing.incentives * 100 || 0,
        currency: pricing.currency || 'EUR'
      },
      history: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'configurator',
        configuratorType: '2d',
        manifestId: manifest.id || 'tornado-gt-launch',
        cameraAngle: currentAngle,
        notes: null
      },
      metadata: {
        configurator: {
          type: '2d',
          manifestId: manifest.id || 'tornado-gt-launch',
          cameraAngle: currentAngle
        }
      }
    };
  }, [vehicleId, manifest, selectedOptions, vehicleOptions, pricing, currentAngle]);

  const formatPrice = (cents) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: pricing.currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Get selected option names for summary
  const getSelectedPaint = () => {
    const paintOption = vehicleOptions.find(opt => 
      selectedOptions[opt.id] && 
      (opt.code?.startsWith('paint_') || opt.configurator_group === 'exterior')
    );
    return paintOption?.label || 'Not Selected';
  };

  const getSelectedWheels = () => {
    const wheelOption = vehicleOptions.find(opt => 
      selectedOptions[opt.id] && 
      (opt.code?.startsWith('rim') || opt.code?.startsWith('wheel') || opt.configurator_group === 'wheels')
    );
    return wheelOption?.label || 'Not Selected';
  };

  const getSelectedInterior = () => {
    const interiorOption = vehicleOptions.find(opt => 
      selectedOptions[opt.id] && 
      (opt.category === 'interior' || opt.configurator_group === 'interior')
    );
    return interiorOption?.label || 'Not Selected';
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        {/* Left: Configuration Summary */}
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <p className={styles.summaryLabel}>Paint</p>
            <p className={styles.summaryValue}>{getSelectedPaint()}</p>
          </div>
          <div className={styles.summaryItem}>
            <p className={styles.summaryLabel}>Wheels</p>
            <p className={styles.summaryValue}>{getSelectedWheels()}</p>
          </div>
          <div className={`${styles.summaryItem} ${styles.summaryItemHidden}`}>
            <p className={styles.summaryLabel}>Interior</p>
            <p className={styles.summaryValue}>{getSelectedInterior()}</p>
          </div>
        </div>

        {/* Right: Price & Order Button */}
      <div className={styles.priceSection}>
          <div className={styles.priceInfo}>
            <p className={styles.priceLabel}>Est. Price</p>
        <h3 className={styles.priceValue}>
          {formatPrice(pricing.total * 100 || 0)}
        </h3>
      </div>
      
      {configuration ? (
        <>
          {console.log('[PricingFooter] Rendering SaveToGarageButton with garageItemId:', garageItemId)}
          <SaveToGarageButton
            configuration={configuration}
            garageItemId={garageItemId}
                initialState={garageItemId ? undefined : 'saved'}
            className={styles.orderButton}
            onSuccess={(item) => {
              console.log('[Configurator] Configuration saved to garage:', item);
            }}
            onError={(error) => {
              console.error('[Configurator] Failed to save configuration:', error);
            }}
          />
        </>
      ) : (
        <button
          type="button"
          className={styles.orderButton}
          disabled
        >
              Place Order
              <svg xmlns="http://www.w3.org/2000/svg" className={styles.orderIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
        </button>
      )}
    </div>
      </div>
    </footer>
  );
}

