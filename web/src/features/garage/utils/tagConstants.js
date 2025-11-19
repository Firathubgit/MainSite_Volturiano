/**
 * Tag constants and configuration for garage items
 * 
 * Defines predefined tags, validation, and normalization utilities.
 * Designed for future extensibility with custom tags.
 */

/**
 * Predefined tags available for garage items
 * @type {string[]}
 */
export const PREDEFINED_TAGS = [
  'track',
  'grand-tourer',
  'concept',
  'daily-driver'
];

/**
 * Display labels for tags (i18n keys)
 * Maps tag values to translation keys
 * @type {Object<string, string>}
 */
export const TAG_LABELS = {
  'track': 'garage.tags.track',
  'grand-tourer': 'garage.tags.grandTourer',
  'concept': 'garage.tags.concept',
  'daily-driver': 'garage.tags.dailyDriver'
};

/**
 * Tag metadata for future extensibility
 * @type {Object<string, Object>}
 */
export const TAG_METADATA = {
  'track': {
    color: 'var(--color-accent)',
    description: 'Track-focused configuration'
  },
  'grand-tourer': {
    color: 'var(--color-primary)',
    description: 'Long-distance touring'
  },
  'concept': {
    color: 'var(--color-secondary)',
    description: 'Experimental design'
  },
  'daily-driver': {
    color: 'var(--color-text-secondary)',
    description: 'Everyday use'
  }
};

/**
 * Validate if a tag is valid
 * Currently only predefined tags are allowed
 * Future: extend to allow custom tags
 * 
 * @param {string} tag - Tag to validate
 * @returns {boolean} True if tag is valid
 */
export function isValidTag(tag) {
  if (!tag || typeof tag !== 'string') {
    return false;
  }
  
  const normalized = normalizeTag(tag);
  
  // For now, only predefined tags are valid
  // Future: allow custom tags with validation rules
  return PREDEFINED_TAGS.includes(normalized);
}

/**
 * Normalize a tag string
 * - Trim whitespace
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * 
 * @param {string} tag - Tag to normalize
 * @returns {string} Normalized tag
 */
export function normalizeTag(tag) {
  if (!tag || typeof tag !== 'string') {
    return '';
  }
  
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Get tag metadata
 * @param {string} tag - Tag value
 * @returns {Object|null} Tag metadata or null if not found
 */
export function getTagMetadata(tag) {
  const normalized = normalizeTag(tag);
  return TAG_METADATA[normalized] || null;
}

/**
 * Check if tag is predefined
 * @param {string} tag - Tag to check
 * @returns {boolean} True if tag is predefined
 */
export function isPredefinedTag(tag) {
  const normalized = normalizeTag(tag);
  return PREDEFINED_TAGS.includes(normalized);
}

