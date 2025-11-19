/**
 * Milestone type constants and utilities
 * 
 * Standardizes milestone types across the application and provides
 * mappings, icons, and display labels for each type.
 * 
 * @module features/garage/utils/milestoneTypes
 */

/**
 * Milestone type constants
 */
export const MILESTONE_TYPES = {
  CREATED: 'created',
  UPDATED: 'updated',
  PURCHASED: 'purchased',
  DELIVERED: 'delivered',
  CUSTOM: 'custom'
};

/**
 * Map legacy milestone types to standardized types
 * @param {string} legacyType - Legacy milestone type
 * @returns {string} Standardized milestone type
 */
export function mapLegacyMilestoneType(legacyType) {
  if (!legacyType) return MILESTONE_TYPES.CREATED;
  
  const mapping = {
    'created': MILESTONE_TYPES.CREATED,
    'state_change': MILESTONE_TYPES.UPDATED,
    'payment': MILESTONE_TYPES.PURCHASED,
    'updated': MILESTONE_TYPES.UPDATED,
    'purchased': MILESTONE_TYPES.PURCHASED,
    'delivered': MILESTONE_TYPES.DELIVERED,
    'custom': MILESTONE_TYPES.CUSTOM
  };
  
  return mapping[legacyType] || MILESTONE_TYPES.CUSTOM;
}

/**
 * Get display label key for milestone type (for i18n)
 * @param {string} milestoneType - Milestone type
 * @returns {string} i18n key
 */
export function getMilestoneLabelKey(milestoneType) {
  const normalizedType = mapLegacyMilestoneType(milestoneType);
  return `garage.timeline.milestone.${normalizedType}`;
}

/**
 * Check if milestone type is valid
 * @param {string} type - Milestone type to validate
 * @returns {boolean}
 */
export function isValidMilestoneType(type) {
  return Object.values(MILESTONE_TYPES).includes(type);
}

/**
 * Get all valid milestone types
 * @returns {string[]} Array of valid milestone types
 */
export function getValidMilestoneTypes() {
  return Object.values(MILESTONE_TYPES);
}

