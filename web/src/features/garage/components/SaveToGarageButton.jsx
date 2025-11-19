import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import { useUserStore } from '../../../stores/userStore';
import styles from '../styles/garage.module.css';

/**
 * SaveToGarageButton - Reusable button component for saving configurations to garage
 * 
 * @param {Object} props
 * @param {Object} props.configuration - Configuration payload (must match garage schema)
 * @param {string} props.initialState - Initial state ('saved', 'wishlist', 'prototype', 'purchased')
 * @param {Function} props.onSuccess - Callback when save succeeds (receives saved item)
 * @param {Function} props.onError - Callback when save fails (receives error)
 * @param {boolean} props.navigateToGarage - Whether to navigate to garage after save
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.buttonProps - Additional props to pass to button element
 */
export default function SaveToGarageButton({
  configuration,
  initialState = 'wishlist',
  onSuccess,
  onError,
  navigateToGarage = false,
  className = '',
  buttonProps = {}
}) {
  const { t } = useTranslation('account');
  const navigate = useNavigate();
  const session = useUserStore((state) => state.session);
  const authStatus = useUserStore((state) => state.status);
  const { addItem } = useGarageStore();
  
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);

  /**
   * Validate configuration payload structure
   * @param {Object} config - Configuration payload
   * @returns {Promise<{valid: boolean, error: string|null, warnings: Array<string>}>}
   */
  const validateConfiguration = async (config) => {
    if (!config) {
      return { valid: false, error: 'Configuration is required', warnings: [] };
    }

    const warnings = [];

    // Check required top-level keys
    if (!config.schemaVersion) {
      return { valid: false, error: 'Missing schemaVersion', warnings: [] };
    }

    if (!config.vehicle || typeof config.vehicle !== 'object') {
      return { valid: false, error: 'Missing or invalid vehicle object', warnings: [] };
    }

    if (!config.vehicle.model || typeof config.vehicle.model !== 'string') {
      return { valid: false, error: 'Missing or invalid vehicle.model', warnings: [] };
    }

    if (!config.options || typeof config.options !== 'object') {
      return { valid: false, error: 'Missing or invalid options object', warnings: [] };
    }

    if (!config.pricing || typeof config.pricing !== 'object') {
      return { valid: false, error: 'Missing or invalid pricing object', warnings: [] };
    }

    // Validate pricing fields
    if (typeof config.pricing.basePriceCents !== 'number') {
      return { valid: false, error: 'Missing or invalid pricing.basePriceCents', warnings: [] };
    }

    // Configurator-specific validation
    try {
      const { validateConfig: validateConfigurator } = await import('../utils/configuratorValidator');
      const configuratorValidation = validateConfigurator(config);
      
      if (!configuratorValidation.valid) {
        return {
          valid: false,
          error: `Configurator validation failed: ${configuratorValidation.errors.join(', ')}`,
          warnings: configuratorValidation.warnings || []
        };
      }
      
      warnings.push(...(configuratorValidation.warnings || []));
    } catch (importError) {
      console.warn('[SaveToGarageButton] Failed to import configurator validator:', importError);
      // Continue without configurator validation if import fails
    }

    return { valid: true, error: null, warnings };
  };

  /**
   * Build garage item payload from configuration
   * @param {Object} config - Configuration payload
   * @returns {Object} Garage item payload
   */
  const buildGaragePayload = (config) => {
    const vehicleModel = config.vehicle.model;
    const basePriceCents = config.pricing.basePriceCents || 0;
    const optionsTotalCents = config.pricing.optionsTotalCents || 0;
    const totalPriceCents = basePriceCents + optionsTotalCents - (config.pricing.discountCents || 0);

    // Generate title from vehicle model and trim
    const trim = config.vehicle.trim || '';
    const title = trim 
      ? `${vehicleModel} ${trim}`
      : vehicleModel;

    // Build description from selected options
    const optionLabels = [];
    if (config.options.exterior) {
      config.options.exterior.forEach(opt => {
        if (opt.label) optionLabels.push(opt.label);
      });
    }
    if (config.options.interior) {
      config.options.interior.forEach(opt => {
        if (opt.label) optionLabels.push(opt.label);
      });
    }
    if (config.options.performance) {
      config.options.performance.forEach(opt => {
        if (opt.label) optionLabels.push(opt.label);
      });
    }
    const description = optionLabels.length > 0 
      ? optionLabels.slice(0, 3).join(', ') + (optionLabels.length > 3 ? '...' : '')
      : null;

    return {
      title,
      description,
      vehicle_model: vehicleModel,
      state: initialState,
      config_payload: config,
      price_cents: totalPriceCents,
      currency: config.pricing.currency || 'EUR',
      thumbnail_url: config.media?.heroImage || null
    };
  };

  /**
   * Handle save button click
   */
  const handleSave = async () => {
    // Wait for auth to be ready
    if (authStatus === 'loading' || authStatus === 'idle') {
      console.log('[SaveToGarageButton] Auth still loading, waiting...', { authStatus, hasSession: !!session });
      return;
    }

    // Check authentication
    if (!session || !session.user) {
      console.log('[SaveToGarageButton] No session, redirecting to login', { authStatus, session });
      // Redirect to login
      navigate('/account/login', { 
        state: { 
          returnTo: window.location.pathname,
          message: t('garage.save.requiresLogin')
        } 
      });
      return;
    }

    console.log('[SaveToGarageButton] User authenticated:', session.user.id);

    // Validate configuration
    const validation = await validateConfiguration(configuration);
    if (!validation.valid) {
      const error = new Error(validation.error);
      console.error('[SaveToGarageButton] Validation failed:', validation.error);
      setSaveStatus('error');
      setErrorMessage(validation.error);
      if (onError) onError(error);
      return;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('[SaveToGarageButton] Validation warnings:', validation.warnings);
      // Could show warnings to user if needed
    }

    // Normalize configurator metadata before saving
    let normalizedConfig = configuration;
    try {
      const { detectConfiguratorType, normalizeConfiguratorMetadata } = await import('../utils/configuratorType');
      const detectedType = detectConfiguratorType(configuration);
      normalizedConfig = normalizeConfiguratorMetadata(configuration, { detectedType });
    } catch (importError) {
      console.warn('[SaveToGarageButton] Failed to normalize configurator metadata:', importError);
      // Continue with original config if normalization fails
    }

    // Set saving state
    setSaveStatus('saving');
    setErrorMessage(null);
    console.log('[SaveToGarageButton] Starting save...');

    try {
      // Build garage item payload (use normalized config)
      const payload = buildGaragePayload(normalizedConfig);

      // Save to garage (optimistic update handled by store)
      const result = await addItem(payload);

      if (result.error) {
        throw result.error;
      }

      // Success!
      console.log('[SaveToGarageButton] Save successful!', result.data);
      setSaveStatus('success');
      
      // Create initial milestone for the new item
      try {
        const { createMilestone } = await import('../../../features/account/api');
        await createMilestone(result.data.id, {
          milestone_type: 'created',
          from_state: null,
          to_state: initialState,
          note: 'Initial creation',
          metadata: { source: 'manual' }
        });
        console.log('[SaveToGarageButton] Initial milestone created');
      } catch (milestoneError) {
        console.warn('[SaveToGarageButton] Failed to create initial milestone (non-critical):', milestoneError);
        // Don't fail the save if milestone creation fails
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess(result.data);
      }

      // Navigate to garage if requested
      if (navigateToGarage) {
        setTimeout(() => {
          navigate('/account/garage');
        }, 500); // Small delay to show success state
      } else {
        // Reset to idle after showing success briefly
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      }
    } catch (err) {
      console.error('[SaveToGarageButton] Save error:', err);
      setSaveStatus('error');
      setErrorMessage(err.message || t('garage.save.error'));
      
      if (onError) {
        onError(err);
      }

      // Reset to idle after showing error
      setTimeout(() => {
        setSaveStatus('idle');
        setErrorMessage(null);
      }, 3000);
    }
  };

  // Determine button text and disabled state
  const getButtonText = () => {
    switch (saveStatus) {
      case 'saving':
        return t('garage.save.saving', 'Saving...');
      case 'success':
        return t('garage.save.saved', 'Saved!');
      case 'error':
        return t('garage.save.error', 'Error');
      default:
        return t('garage.save.saveToGarage', 'Save to Garage');
    }
  };

  const isDisabled = saveStatus === 'saving' || saveStatus === 'success' || authStatus === 'loading';

  return (
    <div className={`${styles.saveToGarageWrapper} ${className}`}>
      <button
        type="button"
        onClick={handleSave}
        disabled={isDisabled}
        className={`${styles.saveToGarageButton} ${
          saveStatus === 'saving' ? styles.saving : ''
        } ${
          saveStatus === 'success' ? styles.success : ''
        } ${
          saveStatus === 'error' ? styles.error : ''
        }`}
        aria-label={getButtonText()}
        {...buttonProps}
      >
        {saveStatus === 'saving' && (
          <span className={styles.spinner} aria-hidden="true">⏳</span>
        )}
        {saveStatus === 'success' && (
          <span className={styles.checkmark} aria-hidden="true">✓</span>
        )}
        {saveStatus === 'error' && (
          <span className={styles.errorIcon} aria-hidden="true">✗</span>
        )}
        <span>{getButtonText()}</span>
      </button>
      
      {errorMessage && saveStatus === 'error' && (
        <div className={styles.errorMessage} role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

