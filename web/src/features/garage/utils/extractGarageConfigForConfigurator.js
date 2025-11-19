/**
 * Extract and normalize garage item config_payload into configurator-ready state
 * 
 * This utility extracts configuration data from a garage item's config_payload
 * and normalizes it into a format that the configurator can use to pre-fill options.
 * 
 * @module features/garage/utils/extractGarageConfigForConfigurator
 */

import { detectConfiguratorType } from './configuratorType';
import { autoMigrateConfig } from './migrateConfigs';

/**
 * Extract configuration from garage item for configurator
 * @param {Object} garageItem - Garage item object with config_payload
 * @returns {Object} Extraction result with success flag and data or error
 */
export function extractGarageConfigForConfigurator(garageItem) {
  // Validate garage item exists
  if (!garageItem || typeof garageItem !== 'object') {
    return {
      success: false,
      error: 'MISSING_ITEM',
      reason: 'Garage item is missing or invalid'
    };
  }

  // Extract config_payload
  let configPayload = garageItem.config_payload;

  // Handle string config_payload (should be JSON)
  if (typeof configPayload === 'string') {
    try {
      configPayload = JSON.parse(configPayload);
    } catch (parseError) {
      return {
        success: false,
        error: 'INVALID_CONFIG',
        reason: 'Config payload is not valid JSON'
      };
    }
  }

  // Validate config_payload exists
  if (!configPayload || typeof configPayload !== 'object') {
    return {
      success: false,
      error: 'MISSING_CONFIG',
      reason: 'Config payload is missing from garage item'
    };
  }

  // Auto-migrate legacy configs if needed
  try {
    configPayload = autoMigrateConfig(configPayload);
  } catch (migrateError) {
    console.warn('[extractGarageConfig] Failed to migrate config:', migrateError);
    // Continue with original config if migration fails
  }

  // Detect configurator type
  const configuratorType = detectConfiguratorType(configPayload);

  // Extract vehicle information
  const vehicle = configPayload.vehicle || {};
  if (!vehicle.model) {
    // Fallback to vehicle_model from garage item
    const fallbackModel = garageItem.vehicle_model;
    if (!fallbackModel) {
      return {
        success: false,
        error: 'MISSING_VEHICLE',
        reason: 'Vehicle model is missing from configuration'
      };
    }
    vehicle.model = fallbackModel;
  }

  // Extract options with fallbacks
  const options = {
    exterior: Array.isArray(configPayload.options?.exterior) 
      ? configPayload.options.exterior 
      : [],
    interior: Array.isArray(configPayload.options?.interior) 
      ? configPayload.options.interior 
      : [],
    performance: Array.isArray(configPayload.options?.performance) 
      ? configPayload.options.performance 
      : []
  };

  // Extract pricing information
  const pricing = configPayload.pricing || {};
  const pricingData = {
    basePriceCents: pricing.basePriceCents || garageItem.price_cents || 0,
    optionsTotalCents: pricing.optionsTotalCents || 0,
    discountCents: pricing.discountCents || 0,
    currency: pricing.currency || garageItem.currency || 'EUR'
  };

  // Extract configurator-specific metadata
  const metadata = configPayload.metadata || {};
  const configuratorMeta = metadata.configurator || {};
  const history = configPayload.history || {};

  // Extract 2D-specific data
  const cameraAngle = configuratorMeta.cameraAngle || 
                     history.cameraAngle || 
                     'front-3q'; // Default

  const manifestId = configuratorMeta.manifestId || 
                    history.manifestId || 
                    null;

  // Extract 3D-specific data
  const cameraPosition = configuratorMeta.cameraPosition || null;
  
  const materialSettings = configuratorMeta.materialSettings || 
                          (configuratorType === '3d' || configuratorType === 'hybrid' 
                            ? {
                                metalness: 0.8,
                                roughness: 0.2,
                                envMapIntensity: 1.5
                              }
                            : null);

  const environment = configuratorMeta.environment || 
                     (configuratorType === '3d' || configuratorType === 'hybrid' 
                       ? 'studio_06' 
                       : null);

  // Build normalized state object
  const normalizedState = {
    vehicle: {
      model: vehicle.model,
      trim: vehicle.trim || null,
      year: vehicle.year || null
    },
    options: {
      exterior: options.exterior,
      interior: options.interior,
      performance: options.performance
    },
    pricing: pricingData,
    configuratorType: configuratorType,
    cameraAngle: cameraAngle,
    cameraPosition: cameraPosition,
    materialSettings: materialSettings,
    manifestId: manifestId,
    environment: environment
  };

  return {
    success: true,
    data: normalizedState,
    error: null,
    reason: null
  };
}

/**
 * Map option ID to Viewer2D color key
 * Handles conversion from garage option IDs (e.g., "paint_blu-blue") to viewer keys (e.g., "blu-blue")
 * @param {string} optionId - Option ID from garage config
 * @returns {string|null} Viewer color key or null if not recognized
 */
export function mapOptionIdToViewerKey(optionId) {
  if (!optionId || typeof optionId !== 'string') {
    return null;
  }

  // Paint options mapping
  const paintMappings = {
    'paint_blu-blue': 'blu-blue',
    'paint_blu_blue': 'blu-blue',
    'paint_nero-black': 'nero-black',
    'paint_nero_black': 'nero-black',
    'paint_bianco-white': 'bianco-white',
    'paint_bianco_white': 'bianco-white',
    'paint_rosso-red': 'rosso-red',
    'paint_rosso_red': 'rosso-red',
    'paint_orange-fury': 'orange-fury',
    'paint_orange_fury': 'orange-fury'
  };

  // Rim options mapping
  const rimMappings = {
    'rim_black': 'black',
    'rim_silver': 'silver',
    'rim_bronze': 'bronze'
  };

  // Check paint mappings
  if (paintMappings[optionId]) {
    return paintMappings[optionId];
  }

  // Check rim mappings
  if (rimMappings[optionId]) {
    return rimMappings[optionId];
  }

  // Try to extract from option object if it has an id property
  // This handles cases where optionId might be an object
  if (typeof optionId === 'object' && optionId !== null && optionId.id) {
    return mapOptionIdToViewerKey(optionId.id);
  }

  return null;
}

/**
 * Find paint color option from options array
 * @param {Array} options - Options array (exterior/interior/performance)
 * @returns {string|null} Viewer color key or null if not found
 */
export function findPaintColorFromOptions(options) {
  if (!Array.isArray(options)) {
    return null;
  }

  for (const option of options) {
    const optionId = typeof option === 'string' ? option : option?.id;
    if (!optionId) continue;

    // Check if it's a paint option
    if (optionId.startsWith('paint_')) {
      const viewerKey = mapOptionIdToViewerKey(optionId);
      if (viewerKey) {
        return viewerKey;
      }
    }
  }

  return null;
}

/**
 * Find rim color option from options array
 * @param {Array} options - Options array (exterior/performance)
 * @returns {string|null} Viewer color key or null if not found
 */
export function findRimColorFromOptions(options) {
  if (!Array.isArray(options)) {
    return null;
  }

  for (const option of options) {
    const optionId = typeof option === 'string' ? option : option?.id;
    if (!optionId) continue;

    // Check if it's a rim option
    if (optionId.startsWith('rim_')) {
      const viewerKey = mapOptionIdToViewerKey(optionId);
      if (viewerKey) {
        return viewerKey;
      }
    }
  }

  return null;
}

