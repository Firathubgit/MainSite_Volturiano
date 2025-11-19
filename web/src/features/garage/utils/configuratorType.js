/**
 * Configurator type detection and normalization utilities
 * 
 * Detects which configurator type (2D, 3D, hybrid) was used to create
 * a configuration and normalizes configurator-specific metadata.
 * 
 * @module features/garage/utils/configuratorType
 */

import { isValidHexColor, isColorOption } from './colorMappings';

/**
 * Detect configurator type from configuration payload
 * @param {Object} config - Configuration payload
 * @returns {"2d" | "3d" | "hybrid" | "unknown"} Configurator type
 */
export function detectConfiguratorType(config) {
  if (!config || typeof config !== 'object') {
    return 'unknown';
  }

  // Check explicit type in metadata or history
  const explicitType = config.metadata?.configurator?.type || 
                      config.history?.configuratorType;
  
  if (explicitType === '2d' || explicitType === '3d' || explicitType === 'hybrid') {
    return explicitType;
  }

  // Detect from 2D indicators
  // Check both metadata.configurator and history for 2D-specific fields
  const has2DIndicators = 
    config.metadata?.configurator?.manifestId ||
    config.history?.manifestId ||
    config.metadata?.configurator?.cameraAngle ||
    config.history?.cameraAngle ||
    has2DOptions(config);

  // Detect from 3D indicators
  const has3DIndicators =
    config.metadata?.configurator?.materialSettings ||
    config.metadata?.configurator?.environment ||
    has3DOptions(config);

  // Determine type
  if (has2DIndicators && has3DIndicators) {
    return 'hybrid';
  } else if (has2DIndicators) {
    return '2d';
  } else if (has3DIndicators) {
    return '3d';
  }

  return 'unknown';
}

/**
 * Check if config has 2D-specific option structure
 * 2D configs use option IDs (e.g., "paint_blu_blue")
 * @param {Object} config - Configuration payload
 * @returns {boolean} True if options appear to be 2D format
 */
function has2DOptions(config) {
  if (!config.options) {
    return false;
  }

  // Check if options use option IDs (string IDs starting with paint_ or rim_)
  const checkArray = (arr) => {
    if (!Array.isArray(arr)) return false;
    return arr.some(opt => {
      const id = typeof opt === 'string' ? opt : opt?.id;
      return id && (isColorOption(id) || typeof id === 'string');
    });
  };

  return checkArray(config.options.exterior) ||
         checkArray(config.options.interior) ||
         checkArray(config.options.performance);
}

/**
 * Check if config has 3D-specific option structure
 * 3D configs may use hex colors directly
 * @param {Object} config - Configuration payload
 * @returns {boolean} True if options appear to be 3D format
 */
function has3DOptions(config) {
  if (!config.options) {
    return false;
  }

  // Check if options contain hex colors
  const checkArray = (arr) => {
    if (!Array.isArray(arr)) return false;
    return arr.some(opt => {
      if (typeof opt === 'object' && opt !== null) {
        // Check for hex property
        if (opt.hex && isValidHexColor(opt.hex)) {
          return true;
        }
        // Check if id is a hex color
        if (opt.id && isValidHexColor(opt.id)) {
          return true;
        }
      }
      return false;
    });
  };

  return checkArray(config.options.exterior) ||
         checkArray(config.options.interior) ||
         checkArray(config.options.performance);
}

/**
 * Normalize configurator metadata in configuration payload
 * Ensures consistent structure regardless of source
 * @param {Object} config - Configuration payload
 * @param {Object} options - Normalization options
 * @param {string} options.detectedType - Override detected type
 * @returns {Object} Normalized configuration payload
 */
export function normalizeConfiguratorMetadata(config, options = {}) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const detectedType = options.detectedType || detectConfiguratorType(config);
  const normalized = { ...config };

  // Ensure metadata.configurator exists
  if (!normalized.metadata) {
    normalized.metadata = {};
  }
  if (!normalized.metadata.configurator) {
    normalized.metadata.configurator = {};
  }

  // Ensure history exists
  if (!normalized.history) {
    normalized.history = {};
  }

  // Set configurator type in both places
  normalized.metadata.configurator.type = detectedType;
  normalized.history.configuratorType = detectedType;

  // Set configurator version if not present
  if (!normalized.history.configuratorVersion) {
    normalized.history.configuratorVersion = '1.0';
  }

  // Normalize 2D-specific fields
  if (detectedType === '2d' || detectedType === 'hybrid') {
    // Sync manifestId bidirectionally (history ↔ metadata.configurator)
    const manifestId = normalized.metadata?.configurator?.manifestId || 
                       normalized.history?.manifestId;
    
    if (manifestId) {
      // Ensure both locations have manifestId
      if (!normalized.metadata.configurator.manifestId) {
        normalized.metadata.configurator.manifestId = manifestId;
      }
      if (!normalized.history.manifestId) {
        normalized.history.manifestId = manifestId;
      }
    } else {
      // Set default manifestId for 2D configs if missing
      // This ensures 2D configs always have a manifestId
      const defaultManifestId = 'tornado-gt-launch';
      normalized.metadata.configurator.manifestId = defaultManifestId;
      normalized.history.manifestId = defaultManifestId;
    }
    
    // Sync cameraAngle bidirectionally (metadata.configurator ↔ history)
    const cameraAngle = normalized.metadata?.configurator?.cameraAngle || 
                       normalized.history?.cameraAngle;
    
    if (cameraAngle) {
      // Ensure both locations have cameraAngle
      if (!normalized.metadata.configurator.cameraAngle) {
        normalized.metadata.configurator.cameraAngle = cameraAngle;
      }
      if (!normalized.history.cameraAngle) {
        normalized.history.cameraAngle = cameraAngle;
      }
    } else if (detectedType === '2d') {
      // Set default cameraAngle for 2D configs if missing
      const defaultCameraAngle = 'front-3q';
      normalized.metadata.configurator.cameraAngle = defaultCameraAngle;
      normalized.history.cameraAngle = defaultCameraAngle;
    }
  }

  // Normalize 3D-specific fields
  if (detectedType === '3d' || detectedType === 'hybrid') {
    // Ensure materialSettings structure
    if (!normalized.metadata.configurator.materialSettings) {
      normalized.metadata.configurator.materialSettings = {
        metalness: 0.8,
        roughness: 0.2,
        envMapIntensity: 1.5
      };
    }
    
    // Ensure environment is set
    if (!normalized.metadata.configurator.environment) {
      normalized.metadata.configurator.environment = 'studio_06';
    }
  }

  // Ensure renderSettings exists
  if (!normalized.metadata.configurator.renderSettings) {
    normalized.metadata.configurator.renderSettings = {
      quality: 'high',
      resolution: '1920x1080'
    };
  }

  return normalized;
}

/**
 * Validate configurator metadata structure
 * @param {Object} metadata - Configurator metadata object
 * @param {string} expectedType - Expected configurator type
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateConfiguratorMetadata(metadata, expectedType) {
  const errors = [];

  if (!metadata || typeof metadata !== 'object') {
    return { valid: false, errors: ['Configurator metadata is missing or invalid'] };
  }

  // Validate type
  if (!metadata.type || !['2d', '3d', 'hybrid'].includes(metadata.type)) {
    errors.push('Invalid configurator type');
  }

  // Validate 2D-specific fields
  if (metadata.type === '2d' || metadata.type === 'hybrid') {
    if (metadata.cameraAngle && 
        !['front-3q', 'side', 'rear-3q', 'rim'].includes(metadata.cameraAngle)) {
      errors.push('Invalid camera angle for 2D configurator');
    }
  }

  // Validate 3D-specific fields
  if (metadata.type === '3d' || metadata.type === 'hybrid') {
    if (metadata.materialSettings && typeof metadata.materialSettings !== 'object') {
      errors.push('Invalid materialSettings structure');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if two configs are compatible for comparison/conversion
 * @param {Object} config1 - First configuration
 * @param {Object} config2 - Second configuration
 * @returns {Object} { compatible: boolean, reason: string|null }
 */
export function validateConfiguratorCompatibility(config1, config2) {
  if (!config1 || !config2) {
    return { compatible: false, reason: 'One or both configs are missing' };
  }

  const type1 = detectConfiguratorType(config1);
  const type2 = detectConfiguratorType(config2);

  // Unknown types are always incompatible
  if (type1 === 'unknown' || type2 === 'unknown') {
    return { 
      compatible: false, 
      reason: 'Cannot determine configurator type for one or both configs' 
    };
  }

  // Same types are always compatible
  if (type1 === type2) {
    return { compatible: true, reason: null };
  }

  // Hybrid can work with both
  if (type1 === 'hybrid' || type2 === 'hybrid') {
    return { compatible: true, reason: 'Hybrid configurator supports both types' };
  }

  // 2D and 3D can be converted (compatible for conversion)
  if ((type1 === '2d' && type2 === '3d') || (type1 === '3d' && type2 === '2d')) {
    return { 
      compatible: true, 
      reason: 'Configs can be converted between 2D and 3D formats' 
    };
  }

  return { compatible: false, reason: 'Incompatible configurator types' };
}

/**
 * Get configurator type display name
 * @param {string} type - Configurator type
 * @returns {string} Display name
 */
export function getConfiguratorTypeDisplayName(type) {
  const names = {
    '2d': '2D Configurator',
    '3d': '3D Configurator',
    'hybrid': 'Hybrid Configurator',
    'unknown': 'Unknown Configurator'
  };
  return names[type] || 'Unknown Configurator';
}

