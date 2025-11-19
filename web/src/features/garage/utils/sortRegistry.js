/**
 * Sort Registry
 * 
 * Central registry for sort field definitions to enable easy extension of sorting capabilities.
 * This registry pattern allows new sort options to be added without modifying core sorting logic.
 * 
 * Usage:
 * - Auto-generate sort dropdown options
 * - Validate sort field names
 * - Support multi-field sorting (future)
 * - Generate API queries dynamically
 */

/**
 * Sort option definition
 * @typedef {Object} SortOption
 * @property {string} value - Sort field name (e.g., 'created_at', 'price_cents')
 * @property {string} label - Display label
 * @property {Array<string>} fields - Database fields used for sorting (for multi-field sorts)
 * @property {boolean} [requiresIndex] - Whether this sort requires a database index
 */

/**
 * Sort registry - defines all available sort options
 * Future sort options can be added here without modifying core logic
 */
export const SORT_OPTIONS = [
  {
    value: 'created_at',
    label: 'Date',
    fields: ['created_at'],
    requiresIndex: true
  },
  {
    value: 'updated_at',
    label: 'Updated Date',
    fields: ['updated_at'],
    requiresIndex: true
  },
  {
    value: 'price_cents',
    label: 'Price',
    fields: ['price_cents'],
    requiresIndex: true
  },
  {
    value: 'title',
    label: 'Name',
    fields: ['title'],
    requiresIndex: false // May need case-insensitive index for large datasets
  }
  // Future sort options - examples of extensibility
  // {
  //   value: 'custom_order',
  //   label: 'Custom Order',
  //   fields: ['custom_order', 'created_at'], // Secondary sort
  //   requiresIndex: true
  // },
  // {
  //   value: 'popularity',
  //   label: 'Popularity',
  //   fields: ['share_count', 'view_count'], // Composite sort
  //   requiresIndex: true
  // },
  // {
  //   value: 'model',
  //   label: 'Model',
  //   fields: ['vehicle_model', 'created_at'], // Secondary sort
  //   requiresIndex: true
  // }
];

/**
 * Sort order options
 */
export const SORT_ORDERS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' }
];

/**
 * Get sort option by value
 * @param {string} value - Sort field value
 * @returns {SortOption|null} Sort option or null if not found
 */
export function getSortOption(value) {
  return SORT_OPTIONS.find(opt => opt.value === value) || null;
}

/**
 * Get all sort option values
 * @returns {Array<string>} Array of sort field values
 */
export function getSortValues() {
  return SORT_OPTIONS.map(opt => opt.value);
}

/**
 * Validate sort field
 * @param {string} sortBy - Sort field name
 * @returns {boolean} True if valid
 */
export function validateSortField(sortBy) {
  return SORT_OPTIONS.some(opt => opt.value === sortBy);
}

/**
 * Validate sort order
 * @param {string} sortOrder - Sort order ('asc' | 'desc')
 * @returns {boolean} True if valid
 */
export function validateSortOrder(sortOrder) {
  return SORT_ORDERS.some(opt => opt.value === sortOrder);
}

/**
 * Get sort fields for a sort option (supports multi-field sorting)
 * @param {string} sortBy - Sort field value
 * @returns {Array<string>} Array of database field names
 */
export function getSortFields(sortBy) {
  const option = getSortOption(sortBy);
  return option ? option.fields : [sortBy];
}

/**
 * Generate sort options for UI dropdown
 * @param {string} sortBy - Current sort field
 * @param {string} sortOrder - Current sort order
 * @returns {Array<Object>} Array of { value, label } objects for dropdown
 */
export function generateSortDropdownOptions(sortBy = 'created_at', sortOrder = 'desc') {
  const options = [];
  
  SORT_OPTIONS.forEach(opt => {
    // Add ascending option
    options.push({
      value: `${opt.value}:asc`,
      label: `${opt.label} (Ascending)`,
      sortBy: opt.value,
      sortOrder: 'asc'
    });
    
    // Add descending option
    options.push({
      value: `${opt.value}:desc`,
      label: `${opt.label} (Descending)`,
      sortBy: opt.value,
      sortOrder: 'desc'
    });
  });
  
  return options;
}

/**
 * Parse sort value from dropdown format
 * @param {string} value - Dropdown value (format: "sortBy:sortOrder")
 * @returns {Object} { sortBy, sortOrder }
 */
export function parseSortValue(value) {
  const [sortBy, sortOrder] = value.split(':');
  return {
    sortBy: sortBy || 'created_at',
    sortOrder: sortOrder || 'desc'
  };
}

/**
 * Format sort value for dropdown
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order
 * @returns {string} Dropdown value (format: "sortBy:sortOrder")
 */
export function formatSortValue(sortBy, sortOrder) {
  return `${sortBy}:${sortOrder}`;
}

