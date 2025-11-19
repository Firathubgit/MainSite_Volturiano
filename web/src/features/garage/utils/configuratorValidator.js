/**
 * Configurator-specific validation utilities
 * 
 * Validates configuration payloads for configurator-specific requirements
 * and provides detailed error reporting.
 * 
 * @module features/garage/utils/configuratorValidator
 */

import { detectConfiguratorType, validateConfiguratorMetadata } from './configuratorType';
import { isValidHexColor, isColorOption } from './colorMappings';

/**
 * Valid camera angles for 2D configurator
 */
const VALID_CAMERA_ANGLES = ['front-3q', 'side', 'rear-3q', 'rim'];

/**
 * Validate 2D configuration
 * @param {Object} config - Configuration payload
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validate2DConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration is missing or invalid'] };
  }

  const configuratorMeta = config.metadata?.configurator || {};
  const history = config.history || {};

  // Check manifestId (optional but recommended)
  // Note: normalizeConfiguratorMetadata will set a default if missing,
  // but we still warn if it's not explicitly set
  if (!configuratorMeta.manifestId && !history.manifestId) {
    // This is a warning, not an error, since normalization will add a default
    // But we log it for debugging purposes
    console.warn('[validate2DConfig] 2D configurator missing manifestId, will use default');
  }

  // Validate camera angle if present
  const cameraAngle = configuratorMeta.cameraAngle || history.cameraAngle;
  if (cameraAngle && !VALID_CAMERA_ANGLES.includes(cameraAngle)) {
    errors.push(`Invalid camera angle: ${cameraAngle}. Must be one of: ${VALID_CAMERA_ANGLES.join(', ')}`);
  }

  // Validate options use option IDs, not hex colors
  if (config.options) {
    ['exterior', 'interior', 'performance'].forEach(category => {
      if (Array.isArray(config.options[category])) {
        config.options[category].forEach((option, index) => {
          if (typeof option === 'object' && option !== null) {
            // Check if option has hex but no ID (3D format)
            if (option.hex && !option.id && isValidHexColor(option.hex)) {
              errors.push(`${category}[${index}]: 2D configurator should use option IDs, not hex colors`);
            }
            
            // Check if ID is a hex color (invalid for 2D)
            if (option.id && isValidHexColor(option.id)) {
              errors.push(`${category}[${index}]: Option ID cannot be a hex color in 2D configurator`);
            }
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate 3D configuration
 * @param {Object} config - Configuration payload
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validate3DConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration is missing or invalid'] };
  }

  const configuratorMeta = config.metadata?.configurator || {};

  // Validate materialSettings structure
  if (configuratorMeta.materialSettings) {
    const material = configuratorMeta.materialSettings;
    
    if (typeof material !== 'object' || material === null) {
      errors.push('materialSettings must be an object');
    } else {
      if (typeof material.metalness !== 'undefined' && 
          (typeof material.metalness !== 'number' || material.metalness < 0 || material.metalness > 1)) {
        errors.push('materialSettings.metalness must be a number between 0 and 1');
      }
      
      if (typeof material.roughness !== 'undefined' && 
          (typeof material.roughness !== 'number' || material.roughness < 0 || material.roughness > 1)) {
        errors.push('materialSettings.roughness must be a number between 0 and 1');
      }
      
      if (typeof material.envMapIntensity !== 'undefined' && 
          (typeof material.envMapIntensity !== 'number' || material.envMapIntensity < 0)) {
        errors.push('materialSettings.envMapIntensity must be a non-negative number');
      }
    }
  }

  // Validate environment
  if (configuratorMeta.environment && typeof configuratorMeta.environment !== 'string') {
    errors.push('environment must be a string');
  }

  // Validate options can use hex colors
  // (3D configurator allows hex colors, but we should validate format)
  if (config.options) {
    ['exterior', 'interior', 'performance'].forEach(category => {
      if (Array.isArray(config.options[category])) {
        config.options[category].forEach((option, index) => {
          if (typeof option === 'object' && option !== null) {
            // Validate hex color format if present
            if (option.hex && !isValidHexColor(option.hex)) {
              errors.push(`${category}[${index}]: Invalid hex color format: ${option.hex}`);
            }
            
            // If ID is provided and it's a hex, validate it
            if (option.id && isValidHexColor(option.id)) {
              // This is valid for 3D, but warn if it's not a proper hex format
              if (!/^#[0-9A-F]{6}$/i.test(option.id)) {
                errors.push(`${category}[${index}]: Option ID appears to be hex but format is invalid`);
              }
            }
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate configurator metadata structure
 * @param {Object} metadata - Configurator metadata object
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateConfiguratorMetadataStructure(metadata) {
  const errors = [];

  if (!metadata || typeof metadata !== 'object') {
    return { valid: false, errors: ['Configurator metadata is missing or invalid'] };
  }

  // Validate type
  if (metadata.type && !['2d', '3d', 'hybrid'].includes(metadata.type)) {
    errors.push(`Invalid configurator type: ${metadata.type}. Must be '2d', '3d', or 'hybrid'`);
  }

  // Validate 2D-specific fields
  if (metadata.type === '2d' || metadata.type === 'hybrid') {
    if (metadata.cameraAngle && !VALID_CAMERA_ANGLES.includes(metadata.cameraAngle)) {
      errors.push(`Invalid camera angle: ${metadata.cameraAngle}`);
    }
  }

  // Validate 3D-specific fields
  if (metadata.type === '3d' || metadata.type === 'hybrid') {
    if (metadata.materialSettings && typeof metadata.materialSettings !== 'object') {
      errors.push('materialSettings must be an object');
    }
  }

  // Validate renderSettings if present
  if (metadata.renderSettings) {
    if (typeof metadata.renderSettings !== 'object' || metadata.renderSettings === null) {
      errors.push('renderSettings must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get all validation errors for a configuration
 * Combines general validation with configurator-specific validation
 * @param {Object} config - Configuration payload
 * @returns {Array<string>} Array of validation error messages
 */
export function getValidationErrors(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return ['Configuration is missing or invalid'];
  }

  // Detect configurator type
  const type = detectConfiguratorType(config);

  // Validate based on type
  if (type === '2d') {
    const result = validate2DConfig(config);
    errors.push(...result.errors);
  } else if (type === '3d') {
    const result = validate3DConfig(config);
    errors.push(...result.errors);
  } else if (type === 'hybrid') {
    // Validate both 2D and 3D aspects
    const result2D = validate2DConfig(config);
    const result3D = validate3DConfig(config);
    errors.push(...result2D.errors);
    errors.push(...result3D.errors);
  }

  // Validate configurator metadata structure
  if (config.metadata?.configurator) {
    const metaResult = validateConfiguratorMetadataStructure(config.metadata.configurator);
    errors.push(...metaResult.errors);
  }

  return errors;
}

/**
 * Validate configuration and return detailed result
 * @param {Object} config - Configuration payload
 * @returns {Object} { valid: boolean, errors: Array<string>, warnings: Array<string> }
 */
export function validateConfig(config) {
  const errors = getValidationErrors(config);
  const warnings = [];

  // Add warnings for potential issues
  if (config && config.metadata?.configurator) {
    const type = detectConfiguratorType(config);
    
    // Warn if type doesn't match metadata
    if (config.metadata.configurator.type && 
        config.metadata.configurator.type !== type && 
        type !== 'unknown') {
      warnings.push(`Configurator type mismatch: metadata says ${config.metadata.configurator.type} but detected ${type}`);
    }

    // Warn if 2D config has 3D-specific fields
    if (type === '2d' && config.metadata.configurator.materialSettings) {
      warnings.push('2D configurator has 3D-specific materialSettings (will be ignored)');
    }

    // Warn if 3D config has 2D-specific fields
    if (type === '3d' && config.metadata.configurator.cameraAngle) {
      warnings.push('3D configurator has 2D-specific cameraAngle (will be ignored)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

