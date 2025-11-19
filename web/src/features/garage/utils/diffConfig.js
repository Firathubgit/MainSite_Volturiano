/**
 * Diff calculation utilities for garage configuration payloads
 * 
 * Compares two configuration payloads and generates a diff summary
 * that can be stored in garage_versions.diff_summary and used for
 * visual diff display.
 * 
 * Enhanced with configurator-aware diffing for 2D/3D configurator support.
 * 
 * @module features/garage/utils/diffConfig
 */

import { detectConfiguratorType, validateConfiguratorCompatibility } from './configuratorType';
import { normalizeForDiff, needsConversion } from './configuratorAdapters';
import { getConfiguratorTypeDisplayName } from './configuratorType';

/**
 * Calculate price delta between two configurations
 * @param {Object} oldConfig - Old configuration payload
 * @param {Object} newConfig - New configuration payload
 * @returns {number} Price difference in cents (new - old)
 */
export function calculatePriceDelta(oldConfig, newConfig) {
  const oldPrice = oldConfig?.pricing?.basePriceCents || 0;
  const oldOptions = oldConfig?.pricing?.optionsTotalCents || 0;
  const oldDiscount = oldConfig?.pricing?.discountCents || 0;
  const oldTotal = oldPrice + oldOptions - oldDiscount;

  const newPrice = newConfig?.pricing?.basePriceCents || 0;
  const newOptions = newConfig?.pricing?.optionsTotalCents || 0;
  const newDiscount = newConfig?.pricing?.discountCents || 0;
  const newTotal = newPrice + newOptions - newDiscount;

  return newTotal - oldTotal;
}

/**
 * Compare two option arrays and find differences
 * @param {Array} oldArray - Old option array
 * @param {Array} newArray - New option array
 * @param {string} basePath - Base path for diff entries (e.g., "options.exterior")
 * @returns {Array} Array of diff entries
 */
function diffOptionArray(oldArray, newArray, basePath) {
  const diffs = [];
  const oldMap = new Map();
  const newMap = new Map();

  // Build maps for O(1) lookups
  (oldArray || []).forEach((item, index) => {
    const id = item?.id || item;
    oldMap.set(id, { item, index });
  });

  (newArray || []).forEach((item, index) => {
    const id = item?.id || item;
    newMap.set(id, { item, index });
  });

  // Find added and changed items
  newMap.forEach(({ item, index }, id) => {
    const oldEntry = oldMap.get(id);
    if (!oldEntry) {
      // Added
      diffs.push({
        path: `${basePath}[${index}]`,
        from: null,
        to: typeof item === 'string' ? item : item.id,
        type: 'added'
      });
    } else if (JSON.stringify(oldEntry.item) !== JSON.stringify(item)) {
      // Changed
      diffs.push({
        path: `${basePath}[${index}]`,
        from: typeof oldEntry.item === 'string' ? oldEntry.item : oldEntry.item.id,
        to: typeof item === 'string' ? item : item.id,
        type: 'changed'
      });
    }
  });

  // Find removed items
  oldMap.forEach(({ item, index }, id) => {
    if (!newMap.has(id)) {
      // Removed
      diffs.push({
        path: `${basePath}[${index}]`,
        from: typeof item === 'string' ? item : item.id,
        to: null,
        type: 'removed'
      });
    }
  });

  return diffs;
}

/**
 * Compare two nested objects recursively
 * @param {Object} oldObj - Old object
 * @param {Object} newObj - New object
 * @param {string} basePath - Base path for diff entries
 * @returns {Array} Array of diff entries
 */
function diffObject(oldObj, newObj, basePath = '') {
  const diffs = [];
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {})
  ]);

  allKeys.forEach((key) => {
    const currentPath = basePath ? `${basePath}.${key}` : key;
    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];

    // Handle arrays (for options)
    if (Array.isArray(oldValue) || Array.isArray(newValue)) {
      const arrayDiffs = diffOptionArray(
        Array.isArray(oldValue) ? oldValue : [],
        Array.isArray(newValue) ? newValue : [],
        currentPath
      );
      diffs.push(...arrayDiffs);
    }
    // Handle objects (recursive)
    else if (
      oldValue &&
      newValue &&
      typeof oldValue === 'object' &&
      typeof newValue === 'object' &&
      !Array.isArray(oldValue) &&
      !Array.isArray(newValue)
    ) {
      const objectDiffs = diffObject(oldValue, newValue, currentPath);
      diffs.push(...objectDiffs);
    }
    // Handle primitives
    else if (oldValue !== newValue) {
      diffs.push({
        path: currentPath,
        from: oldValue ?? null,
        to: newValue ?? null,
        type: oldValue === undefined ? 'added' : newValue === undefined ? 'removed' : 'changed'
      });
    }
  });

  return diffs;
}

/**
 * Calculate diff between two configuration payloads
 * 
 * Returns an array of diff entries in the format:
 * [
 *   {
 *     path: "options.exterior[0]",
 *     from: null,
 *     to: "paint_blu_blue",
 *     type: "added"
 *   },
 *   ...
 * ]
 * 
 * @param {Object} oldConfig - Old configuration payload
 * @param {Object} newConfig - New configuration payload
 * @returns {Array} Array of diff entries
 */
export function diffConfig(oldConfig, newConfig) {
  if (!oldConfig && !newConfig) {
    return [];
  }

  if (!oldConfig) {
    // Entire config is new
    return [{
      path: 'root',
      from: null,
      to: 'new_configuration',
      type: 'added'
    }];
  }

  if (!newConfig) {
    // Entire config was deleted
    return [{
      path: 'root',
      from: 'deleted_configuration',
      to: null,
      type: 'removed'
    }];
  }

  const diffs = [];

  // Compare options (most important for diff visualization)
  if (oldConfig.options || newConfig.options) {
    const optionDiffs = diffObject(
      oldConfig.options || {},
      newConfig.options || {},
      'options'
    );
    diffs.push(...optionDiffs);
  }

  // Compare vehicle info
  if (oldConfig.vehicle || newConfig.vehicle) {
    const vehicleDiffs = diffObject(
      oldConfig.vehicle || {},
      newConfig.vehicle || {},
      'vehicle'
    );
    diffs.push(...vehicleDiffs);
  }

  // Compare pricing (we already have calculatePriceDelta, but track individual changes)
  if (oldConfig.pricing || newConfig.pricing) {
    const priceDelta = calculatePriceDelta(oldConfig, newConfig);
    if (priceDelta !== 0) {
      diffs.push({
        path: 'pricing.totalDelta',
        from: (oldConfig.pricing?.basePriceCents || 0) + 
              (oldConfig.pricing?.optionsTotalCents || 0) - 
              (oldConfig.pricing?.discountCents || 0),
        to: (newConfig.pricing?.basePriceCents || 0) + 
            (newConfig.pricing?.optionsTotalCents || 0) - 
            (newConfig.pricing?.discountCents || 0),
        type: 'changed',
        delta: priceDelta
      });
    }

    // Track individual pricing field changes
    const pricingDiffs = diffObject(
      oldConfig.pricing || {},
      newConfig.pricing || {},
      'pricing'
    );
    diffs.push(...pricingDiffs.filter(d => d.path !== 'pricing.totalDelta'));
  }

  // Compare metadata (goalTags, etc.)
  if (oldConfig.metadata || newConfig.metadata) {
    const metadataDiffs = diffObject(
      oldConfig.metadata || {},
      newConfig.metadata || {},
      'metadata'
    );
    diffs.push(...metadataDiffs);
  }

  // Compare configurator-specific metadata
  const configuratorDiffs = diffConfiguratorMetadata(oldConfig, newConfig);
  diffs.push(...configuratorDiffs);

  return diffs;
}

/**
 * Compare configurator-specific metadata between two configs
 * Detects configurator type changes and configurator-specific field changes
 * @param {Object} oldConfig - Old configuration payload
 * @param {Object} newConfig - New configuration payload
 * @returns {Array} Array of diff entries for configurator changes
 */
function diffConfiguratorMetadata(oldConfig, newConfig) {
  const diffs = [];
  
  if (!oldConfig && !newConfig) {
    return diffs;
  }

  const oldType = detectConfiguratorType(oldConfig);
  const newType = detectConfiguratorType(newConfig);

  // Detect configurator type change
  if (oldType !== newType && oldType !== 'unknown' && newType !== 'unknown') {
    diffs.push({
      path: 'configurator.type',
      from: oldType,
      to: newType,
      type: 'changed',
      category: 'configurator',
      importance: 'high',
      displayLabel: `Configurator type changed from ${getConfiguratorTypeDisplayName(oldType)} to ${getConfiguratorTypeDisplayName(newType)}`,
      conversionNote: needsConversion(oldConfig, newConfig) 
        ? `Configuration converted from ${oldType} to ${newType} format`
        : null
    });
  }

  // Compare configurator metadata object
  const oldConfiguratorMeta = oldConfig?.metadata?.configurator || {};
  const newConfiguratorMeta = newConfig?.metadata?.configurator || {};

  // Compare configurator-specific fields
  const configuratorFields = [
    'manifestId',
    'cameraAngle',
    'materialSettings',
    'environment',
    'renderSettings'
  ];

  configuratorFields.forEach(field => {
    const oldValue = oldConfiguratorMeta[field];
    const newValue = newConfiguratorMeta[field];

    if (oldValue !== newValue) {
      // Handle object comparison for materialSettings and renderSettings
      if (typeof oldValue === 'object' && typeof newValue === 'object' && 
          oldValue !== null && newValue !== null) {
        const objectDiffs = diffObject(oldValue, newValue, `metadata.configurator.${field}`);
        diffs.push(...objectDiffs.map(d => ({
          ...d,
          category: 'configurator',
          importance: field === 'materialSettings' ? 'medium' : 'low'
        })));
      } else {
        diffs.push({
          path: `metadata.configurator.${field}`,
          from: oldValue ?? null,
          to: newValue ?? null,
          type: oldValue === undefined ? 'added' : newValue === undefined ? 'removed' : 'changed',
          category: 'configurator',
          importance: field === 'cameraAngle' || field === 'manifestId' ? 'medium' : 'low',
          displayLabel: getConfiguratorFieldLabel(field, oldValue, newValue)
        });
      }
    }
  });

  // Compare history.configuratorType if different from metadata
  const oldHistoryType = oldConfig?.history?.configuratorType;
  const newHistoryType = newConfig?.history?.configuratorType;
  
  if (oldHistoryType !== newHistoryType && 
      oldHistoryType !== oldType && 
      newHistoryType !== newType) {
    diffs.push({
      path: 'history.configuratorType',
      from: oldHistoryType ?? null,
      to: newHistoryType ?? null,
      type: 'changed',
      category: 'configurator',
      importance: 'medium'
    });
  }

  return diffs;
}

/**
 * Get human-readable label for configurator field changes
 * @param {string} field - Field name
 * @param {*} oldValue - Old value
 * @param {*} newValue - New value
 * @returns {string} Display label
 */
function getConfiguratorFieldLabel(field, oldValue, newValue) {
  const labels = {
    'manifestId': 'Manifest',
    'cameraAngle': 'Camera angle',
    'materialSettings': 'Material settings',
    'environment': 'Environment',
    'renderSettings': 'Render settings'
  };

  const label = labels[field] || field;
  
  if (field === 'cameraAngle') {
    return `${label}: ${oldValue || 'none'} → ${newValue || 'none'}`;
  }
  
  return label;
}

/**
 * Check if two configurations are identical
 * @param {Object} config1 - First configuration
 * @param {Object} config2 - Second configuration
 * @returns {boolean} True if configurations are identical
 */
export function configsAreEqual(config1, config2) {
  if (!config1 && !config2) return true;
  if (!config1 || !config2) return false;
  
  const diffs = diffConfig(config1, config2);
  return diffs.length === 0;
}

/**
 * Get a human-readable summary of changes
 * @param {Array} diffSummary - Array of diff entries
 * @returns {string} Human-readable summary
 */
export function getDiffSummary(diffSummary) {
  if (!diffSummary || diffSummary.length === 0) {
    return 'No changes';
  }

  const added = diffSummary.filter(d => d.type === 'added').length;
  const removed = diffSummary.filter(d => d.type === 'removed').length;
  const changed = diffSummary.filter(d => d.type === 'changed').length;
  
  // Check for configurator type changes
  const configuratorTypeChange = diffSummary.find(
    d => d.path === 'configurator.type' && d.type === 'changed'
  );

  const parts = [];
  
  // Highlight configurator type change
  if (configuratorTypeChange) {
    parts.push(`Configurator type changed`);
  }
  
  if (added > 0) parts.push(`${added} added`);
  if (removed > 0) parts.push(`${removed} removed`);
  if (changed > 0 && !configuratorTypeChange) parts.push(`${changed} changed`);

  return parts.join(', ') || 'Modified';
}

/**
 * Filter diff entries by category
 * @param {Array} diffSummary - Array of diff entries
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered diff entries
 */
export function filterDiffByCategory(diffSummary, category) {
  if (!diffSummary || !Array.isArray(diffSummary)) {
    return [];
  }
  return diffSummary.filter(d => d.category === category);
}

/**
 * Get configurator type change from diff summary
 * @param {Array} diffSummary - Array of diff entries
 * @returns {Object|null} Configurator type change entry or null
 */
export function getConfiguratorTypeChange(diffSummary) {
  if (!diffSummary || !Array.isArray(diffSummary)) {
    return null;
  }
  return diffSummary.find(d => d.path === 'configurator.type' && d.type === 'changed') || null;
}


