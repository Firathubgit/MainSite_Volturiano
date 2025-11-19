/**
 * Configurator registry for extensible configurator type management
 * 
 * Provides a registry pattern for managing different configurator types
 * and their adapters. Allows easy addition of new configurator types
 * without modifying core code.
 * 
 * @module features/garage/utils/configuratorRegistry
 */

import { convert2DTo3D, convert3DTo2D, normalizeForDiff } from './configuratorAdapters';
import { detectConfiguratorType } from './configuratorType';

/**
 * Registry of configurator types and their adapters
 * 
 * Structure:
 * {
 *   type: {
 *     name: string,
 *     adapter: function, // Converts TO this type
 *     normalize: function, // Normalizes config for this type
 *     compatibleTypes: string[] // Types that can convert to this
 *   }
 * }
 */
const CONFIGURATOR_TYPES = {
  '2d': {
    name: '2D Configurator',
    adapter: null, // 2D is the base format
    normalize: (config) => normalizeForDiff(config),
    compatibleTypes: ['3d', 'hybrid'],
    from3D: convert3DTo2D
  },
  '3d': {
    name: '3D Configurator',
    adapter: convert2DTo3D,
    normalize: (config) => normalizeForDiff(config),
    compatibleTypes: ['2d', 'hybrid'],
    from2D: convert2DTo3D
  },
  'hybrid': {
    name: 'Hybrid Configurator',
    adapter: null, // Hybrid accepts both formats
    normalize: (config) => normalizeForDiff(config),
    compatibleTypes: ['2d', '3d'],
    from2D: convert2DTo3D,
    from3D: convert3DTo2D
  }
};

/**
 * Register a new configurator type
 * 
 * @param {string} type - Type identifier (e.g., "ar", "vr")
 * @param {Object} definition - Type definition
 * @param {string} definition.name - Display name
 * @param {Function} definition.adapter - Adapter function (optional)
 * @param {Function} definition.normalize - Normalization function
 * @param {string[]} definition.compatibleTypes - Compatible types
 */
export function registerConfiguratorType(type, definition) {
  if (!type || typeof type !== 'string') {
    throw new Error('Configurator type must be a non-empty string');
  }

  if (!definition || typeof definition !== 'object') {
    throw new Error('Configurator definition must be an object');
  }

  if (!definition.name) {
    throw new Error('Configurator definition must have a name');
  }

  CONFIGURATOR_TYPES[type] = {
    name: definition.name,
    adapter: definition.adapter || null,
    normalize: definition.normalize || normalizeForDiff,
    compatibleTypes: definition.compatibleTypes || [],
    ...definition
  };
}

/**
 * Get configurator type definition
 * @param {string} type - Configurator type
 * @returns {Object|null} Type definition or null if not found
 */
export function getConfiguratorType(type) {
  return CONFIGURATOR_TYPES[type] || null;
}

/**
 * Get adapter function for converting to target type
 * @param {string} sourceType - Source configurator type
 * @param {string} targetType - Target configurator type
 * @returns {Function|null} Adapter function or null if not available
 */
export function getAdapter(sourceType, targetType) {
  if (sourceType === targetType) {
    return (config) => config; // No conversion needed
  }

  const targetDef = CONFIGURATOR_TYPES[targetType];
  if (!targetDef) {
    return null;
  }

  // Check for specific adapter (e.g., from2D, from3D)
  const specificAdapter = targetDef[`from${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)}`];
  if (specificAdapter) {
    return specificAdapter;
  }

  // Check for general adapter
  if (targetDef.adapter) {
    return targetDef.adapter;
  }

  // Check if types are compatible
  if (targetDef.compatibleTypes && targetDef.compatibleTypes.includes(sourceType)) {
    // Try to find reverse adapter
    const sourceDef = CONFIGURATOR_TYPES[sourceType];
    if (sourceDef) {
      const reverseAdapter = sourceDef[`from${targetType.charAt(0).toUpperCase() + targetType.slice(1)}`];
      if (reverseAdapter) {
        // We need a wrapper that reverses the conversion
        // This is a simplified approach - full implementation would need bidirectional adapters
        return null;
      }
    }
  }

  return null;
}

/**
 * Convert configuration to target configurator type
 * 
 * @param {Object} config - Configuration payload
 * @param {string} targetType - Target configurator type
 * @param {Object} options - Conversion options
 * @returns {Object} Converted configuration
 */
export function convertConfig(config, targetType, options = {}) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid configuration');
  }

  const sourceType = detectConfiguratorType(config);
  
  if (sourceType === targetType) {
    return config; // No conversion needed
  }

  if (sourceType === 'unknown') {
    throw new Error('Cannot convert: source configurator type is unknown');
  }

  const adapter = getAdapter(sourceType, targetType);
  if (!adapter) {
    throw new Error(`No adapter available for conversion from ${sourceType} to ${targetType}`);
  }

  try {
    return adapter(config, options);
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
}

/**
 * Check if two configurator types are compatible
 * 
 * @param {string} sourceType - Source type
 * @param {string} targetType - Target type
 * @returns {boolean} True if types are compatible
 */
export function isCompatible(sourceType, targetType) {
  if (sourceType === targetType) {
    return true;
  }

  if (sourceType === 'unknown' || targetType === 'unknown') {
    return false;
  }

  const targetDef = CONFIGURATOR_TYPES[targetType];
  if (!targetDef) {
    return false;
  }

  // Hybrid is compatible with everything
  if (sourceType === 'hybrid' || targetType === 'hybrid') {
    return true;
  }

  // Check if target accepts source type
  if (targetDef.compatibleTypes && targetDef.compatibleTypes.includes(sourceType)) {
    return true;
  }

  // Check if adapter exists
  return getAdapter(sourceType, targetType) !== null;
}

/**
 * Get all registered configurator types
 * @returns {string[]} Array of type identifiers
 */
export function getRegisteredTypes() {
  return Object.keys(CONFIGURATOR_TYPES);
}

/**
 * Get display name for configurator type
 * @param {string} type - Configurator type
 * @returns {string} Display name
 */
export function getTypeDisplayName(type) {
  const def = CONFIGURATOR_TYPES[type];
  return def ? def.name : type;
}

/**
 * Check if configurator type is registered
 * @param {string} type - Configurator type
 * @returns {boolean} True if registered
 */
export function isRegistered(type) {
  return type in CONFIGURATOR_TYPES;
}

