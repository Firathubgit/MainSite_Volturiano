/**
 * Configurator adapter utilities for converting between 2D and 3D formats
 * 
 * Provides conversion functions to transform configurations between
 * different configurator types while preserving all non-configurator-specific data.
 * 
 * @module features/garage/utils/configuratorAdapters
 */

import { 
  getColorHex, 
  getColorOptionId, 
  findClosestColorOptionId,
  extractColorFromOption,
  isValidHexColor
} from './colorMappings';
import { detectConfiguratorType, normalizeConfiguratorMetadata } from './configuratorType';

/**
 * Camera angle to 3D camera position mapping
 * Used when converting 2D configs to 3D
 */
const CAMERA_ANGLE_TO_POSITION = {
  'front-3q': { x: 6, y: 1.8, z: 8 },
  'side': { x: 0, y: 1.5, z: 8 },
  'rear-3q': { x: -6, y: 1.8, z: 8 },
  'rim': { x: 0, y: 0.5, z: 3 }
};

/**
 * Default 3D material settings
 */
const DEFAULT_3D_MATERIAL_SETTINGS = {
  metalness: 0.8,
  roughness: 0.2,
  envMapIntensity: 1.5
};

/**
 * Convert 2D configuration to 3D format
 * 
 * Transforms option IDs to hex colors, converts camera angles to 3D positions,
 * and adds 3D-specific metadata while preserving all other configuration data.
 * 
 * @param {Object} config2D - 2D configuration payload
 * @returns {Object} 3D configuration payload
 */
export function convert2DTo3D(config2D) {
  if (!config2D || typeof config2D !== 'object') {
    throw new Error('Invalid 2D configuration');
  }

  const config3D = JSON.parse(JSON.stringify(config2D)); // Deep clone

  // Convert options: option IDs → hex colors
  if (config3D.options) {
    ['exterior', 'interior', 'performance'].forEach(category => {
      if (Array.isArray(config3D.options[category])) {
        config3D.options[category] = config3D.options[category].map(option => {
          if (typeof option === 'string') {
            // Simple string option ID
            const hex = getColorHex(option);
            if (hex) {
              return {
                id: option,
                hex: hex,
                label: option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              };
            }
            return { id: option };
          } else if (option && typeof option === 'object') {
            // Object option
            const converted = { ...option };
            
            // Convert color option IDs to hex
            if (converted.id) {
              const hex = getColorHex(converted.id);
              if (hex) {
                converted.hex = hex;
              }
            }
            
            return converted;
          }
          return option;
        });
      }
    });
  }

  // Convert camera angle to 3D camera position
  const cameraAngle = config2D.metadata?.configurator?.cameraAngle || 
                     config2D.history?.cameraAngle;
  if (cameraAngle && CAMERA_ANGLE_TO_POSITION[cameraAngle]) {
    if (!config3D.metadata) {
      config3D.metadata = {};
    }
    if (!config3D.metadata.configurator) {
      config3D.metadata.configurator = {};
    }
    config3D.metadata.configurator.cameraPosition = CAMERA_ANGLE_TO_POSITION[cameraAngle];
  }

  // Update configurator metadata
  if (!config3D.metadata) {
    config3D.metadata = {};
  }
  if (!config3D.metadata.configurator) {
    config3D.metadata.configurator = {};
  }

  config3D.metadata.configurator.type = '3d';
  config3D.metadata.configurator.materialSettings = 
    config2D.metadata?.configurator?.materialSettings || DEFAULT_3D_MATERIAL_SETTINGS;
  config3D.metadata.configurator.environment = 
    config2D.metadata?.configurator?.environment || 'studio_06';

  // Remove 2D-specific fields
  delete config3D.metadata.configurator.manifestId;
  delete config3D.metadata.configurator.cameraAngle;

  // Update history
  if (!config3D.history) {
    config3D.history = {};
  }
  config3D.history.configuratorType = '3d';
  delete config3D.history.manifestId;
  delete config3D.history.cameraAngle;

  // Normalize metadata
  return normalizeConfiguratorMetadata(config3D, { detectedType: '3d' });
}

/**
 * Convert 3D configuration to 2D format
 * 
 * Transforms hex colors to option IDs, selects appropriate camera angle,
 * and adds 2D-specific metadata while preserving all other configuration data.
 * 
 * @param {Object} config3D - 3D configuration payload
 * @param {Object} options - Conversion options
 * @param {string} options.manifestId - Manifest ID for 2D configurator
 * @param {string} options.cameraAngle - Preferred camera angle (optional)
 * @returns {Object} 2D configuration payload
 */
export function convert3DTo2D(config3D, options = {}) {
  if (!config3D || typeof config3D !== 'object') {
    throw new Error('Invalid 3D configuration');
  }

  const config2D = JSON.parse(JSON.stringify(config3D)); // Deep clone

  // Convert options: hex colors → option IDs
  if (config2D.options) {
    ['exterior', 'interior', 'performance'].forEach(category => {
      if (Array.isArray(config2D.options[category])) {
        config2D.options[category] = config2D.options[category].map(option => {
          if (typeof option === 'object' && option !== null) {
            const converted = { ...option };
            
            // Extract color information
            const colorInfo = extractColorFromOption(option);
            
            // If we have hex but no ID, try to find matching option ID
            if (colorInfo.hex && !colorInfo.id) {
              const optionId = getColorOptionId(colorInfo.hex, category === 'exterior' ? 'exterior' : 'rim');
              if (optionId) {
                converted.id = optionId;
              }
            }
            
            // Remove hex if we have ID (2D uses IDs)
            if (converted.id && converted.hex) {
              delete converted.hex;
            }
            
            return converted;
          }
          return option;
        });
      }
    });
  }

  // Convert camera position to camera angle
  const cameraPosition = config3D.metadata?.configurator?.cameraPosition;
  let cameraAngle = options.cameraAngle;
  
  if (!cameraAngle && cameraPosition) {
    // Find closest matching camera angle
    const distances = Object.entries(CAMERA_ANGLE_TO_POSITION).map(([angle, pos]) => {
      const dist = Math.sqrt(
        Math.pow(pos.x - cameraPosition.x, 2) +
        Math.pow(pos.y - cameraPosition.y, 2) +
        Math.pow(pos.z - cameraPosition.z, 2)
      );
      return { angle, dist };
    });
    
    distances.sort((a, b) => a.dist - b.dist);
    cameraAngle = distances[0]?.angle || 'front-3q';
  } else if (!cameraAngle) {
    cameraAngle = 'front-3q'; // Default
  }

  // Update configurator metadata
  if (!config2D.metadata) {
    config2D.metadata = {};
  }
  if (!config2D.metadata.configurator) {
    config2D.metadata.configurator = {};
  }

  config2D.metadata.configurator.type = '2d';
  config2D.metadata.configurator.manifestId = options.manifestId || 'tornado-gt-launch';
  config2D.metadata.configurator.cameraAngle = cameraAngle;

  // Remove 3D-specific fields
  delete config2D.metadata.configurator.materialSettings;
  delete config2D.metadata.configurator.environment;
  delete config2D.metadata.configurator.cameraPosition;

  // Update history
  if (!config2D.history) {
    config2D.history = {};
  }
  config2D.history.configuratorType = '2d';
  config2D.history.manifestId = options.manifestId || 'tornado-gt-launch';
  config2D.history.cameraAngle = cameraAngle;

  // Normalize metadata
  return normalizeConfiguratorMetadata(config2D, { detectedType: '2d' });
}

/**
 * Normalize configuration for diff comparison
 * 
 * Converts configurations to a common format that can be compared
 * regardless of their original configurator type. This allows meaningful
 * diffs between 2D and 3D configs.
 * 
 * @param {Object} config - Configuration payload
 * @returns {Object} Normalized configuration
 */
export function normalizeForDiff(config) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const normalized = JSON.parse(JSON.stringify(config)); // Deep clone
  const type = detectConfiguratorType(normalized);

  // Normalize options to common format (use IDs as canonical)
  if (normalized.options) {
    ['exterior', 'interior', 'performance'].forEach(category => {
      if (Array.isArray(normalized.options[category])) {
        normalized.options[category] = normalized.options[category].map(option => {
          if (typeof option === 'string') {
            return { id: option };
          } else if (option && typeof option === 'object') {
            const normalizedOption = { ...option };
            
            // If we have hex but no ID, try to find ID
            if (normalizedOption.hex && !normalizedOption.id) {
              const optionId = getColorOptionId(normalizedOption.hex, category);
              if (optionId) {
                normalizedOption.id = optionId;
              }
            }
            
            // Keep both ID and hex for comparison
            return normalizedOption;
          }
          return option;
        });
      }
    });
  }

  // Normalize configurator metadata
  normalized.metadata = normalized.metadata || {};
  normalized.metadata.configurator = normalized.metadata.configurator || {};
  normalized.metadata.configurator.type = type;

  return normalized;
}

/**
 * Merge configurator metadata from two sources
 * 
 * Intelligently merges configurator-specific metadata, handling conflicts
 * by prioritizing the override source.
 * 
 * @param {Object} base - Base metadata
 * @param {Object} override - Override metadata
 * @returns {Object} Merged metadata
 */
export function mergeConfiguratorMetadata(base, override) {
  if (!base && !override) {
    return {};
  }
  if (!base) {
    return override || {};
  }
  if (!override) {
    return base || {};
  }

  const merged = { ...base };

  // Merge configurator object
  if (override.configurator) {
    merged.configurator = {
      ...base.configurator,
      ...override.configurator
    };
  }

  return merged;
}

/**
 * Check if conversion is needed between two configs
 * @param {Object} config1 - First configuration
 * @param {Object} config2 - Second configuration
 * @returns {boolean} True if conversion is needed
 */
export function needsConversion(config1, config2) {
  const type1 = detectConfiguratorType(config1);
  const type2 = detectConfiguratorType(config2);
  
  return type1 !== type2 && 
         type1 !== 'unknown' && 
         type2 !== 'unknown' &&
         type1 !== 'hybrid' &&
         type2 !== 'hybrid';
}

