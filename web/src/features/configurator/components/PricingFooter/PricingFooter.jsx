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

  return (
    <div className={styles.footer}>
      <div className={styles.priceSection}>
        <div className={styles.priceLabel}>Total Configuration</div>
        <h3 className={styles.priceValue}>
          {formatPrice(pricing.total * 100 || 0)}
        </h3>
      </div>
      
      <button
        type="button"
        className={styles.breakdownLink}
        onClick={() => setShowBreakdown(!showBreakdown)}
      >
        View Breakdown
      </button>
      
      {showBreakdown && (
        <div className={styles.breakdown}>
          <div className={styles.breakdownRow}>
            <span>Base Price</span>
            <span>{formatPrice(pricing.base * 100 || 0)}</span>
          </div>
          <div className={styles.breakdownRow}>
            <span>Options</span>
            <span>{formatPrice(pricing.options * 100 || 0)}</span>
          </div>
          {pricing.taxes > 0 && (
            <div className={styles.breakdownRow}>
              <span>Taxes</span>
              <span>{formatPrice(pricing.taxes * 100 || 0)}</span>
            </div>
          )}
          {pricing.incentives > 0 && (
            <div className={styles.breakdownRow}>
              <span>Incentives</span>
              <span>-{formatPrice(pricing.incentives * 100 || 0)}</span>
            </div>
          )}
        </div>
      )}
      
      {configuration ? (
        <>
          {console.log('[PricingFooter] Rendering SaveToGarageButton with garageItemId:', garageItemId)}
          <SaveToGarageButton
            configuration={configuration}
            garageItemId={garageItemId}
            initialState={garageItemId ? undefined : 'saved'} // Use existing state if updating
            className={styles.orderButton}
            buttonProps={{
              style: {
                width: '100%',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }
            }}
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
          Order Configuration
        </button>
      )}
    </div>
  );
}

