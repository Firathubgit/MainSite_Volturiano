/**
 * Manifest Validator Utility
 * Validates manifest structure and data integrity
 */

/**
 * Validate manifest structure
 * @param {object} manifest - Manifest data to validate
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateManifest(manifest) {
  const errors = [];
  
  if (!manifest) {
    errors.push('Manifest is null or undefined');
    return errors;
  }
  
  // Check schema version
  if (!manifest.schemaVersion) {
    errors.push('Missing schemaVersion');
  }
  
  // Check layers
  if (!manifest.layers || !Array.isArray(manifest.layers)) {
    errors.push('Missing or invalid layers array');
  } else {
    manifest.layers.forEach((layer, index) => {
      if (!layer.id) {
        errors.push(`Layer ${index} missing id`);
      }
      if (typeof layer.zIndex !== 'number') {
        errors.push(`Layer ${index} missing or invalid zIndex`);
      }
      if (!layer.assets || typeof layer.assets !== 'object') {
        errors.push(`Layer ${index} missing or invalid assets`);
      }
    });
  }
  
  // Check variants
  if (manifest.variants && Array.isArray(manifest.variants)) {
    manifest.variants.forEach((variant, index) => {
      if (!variant.key) {
        errors.push(`Variant ${index} missing key`);
      }
      if (!variant.optionMapping) {
        errors.push(`Variant ${index} missing optionMapping`);
      } else {
        if (!variant.optionMapping.optionId) {
          errors.push(`Variant ${index} missing optionMapping.optionId`);
        }
        if (!variant.optionMapping.valueId) {
          errors.push(`Variant ${index} missing optionMapping.valueId`);
        }
      }
    });
  }
  
  // Check metadata
  if (manifest.metadata && typeof manifest.metadata !== 'object') {
    errors.push('Invalid metadata (must be object)');
  }
  
  return errors;
}

/**
 * Validate layer structure
 * @param {object} layer - Layer to validate
 * @returns {Array<string>} Validation errors
 */
export function validateLayer(layer) {
  const errors = [];
  
  if (!layer) {
    errors.push('Layer is null or undefined');
    return errors;
  }
  
  if (!layer.id) {
    errors.push('Layer missing id');
  }
  
  if (typeof layer.zIndex !== 'number') {
    errors.push('Layer missing or invalid zIndex');
  }
  
  if (!layer.assets || typeof layer.assets !== 'object') {
    errors.push('Layer missing or invalid assets');
  }
  
  return errors;
}

/**
 * Validate variant definition
 * @param {object} variant - Variant to validate
 * @returns {Array<string>} Validation errors
 */
export function validateVariant(variant) {
  const errors = [];
  
  if (!variant) {
    errors.push('Variant is null or undefined');
    return errors;
  }
  
  if (!variant.key) {
    errors.push('Variant missing key');
  }
  
  if (!variant.optionMapping) {
    errors.push('Variant missing optionMapping');
  } else {
    if (!variant.optionMapping.optionId) {
      errors.push('Variant missing optionMapping.optionId');
    }
    if (!variant.optionMapping.valueId) {
      errors.push('Variant missing optionMapping.valueId');
    }
  }
  
  return errors;
}

/**
 * Validate asset URL format
 * @param {string} url - Asset URL to validate
 * @returns {boolean} True if valid
 */
export function validateAssetUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Check for relative paths (starting with /)
  if (url.startsWith('/')) {
    return true;
  }
  
  // Check for absolute URLs (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }
  
  // Check for data URLs
  if (url.startsWith('data:')) {
    return true;
  }
  
  return false;
}

