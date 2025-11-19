/**
 * Filter Registry
 * 
 * Central registry for filter definitions to enable easy extension of filtering capabilities.
 * This registry pattern allows new filters to be added without modifying core filtering logic.
 * 
 * Usage:
 * - Auto-generate UI components from registry
 * - Validate filter values
 * - Determine server-side vs client-side filtering
 * - Generate API queries dynamically
 */

/**
 * Filter type definitions
 * @typedef {Object} FilterDefinition
 * @property {string} type - Filter type: 'select' | 'input' | 'range' | 'date' | 'tags'
 * @property {boolean} serverSide - Whether filtering happens server-side (true) or client-side (false)
 * @property {string} field - Database field name for server-side filters
 * @property {Function} [validator] - Optional validator function
 * @property {Object} [options] - Options for select-type filters
 */

/**
 * Filter registry - defines all available filters
 * Future filters can be added here without modifying core logic
 */
export const FILTER_REGISTRY = {
  state: {
    type: 'select',
    serverSide: true,
    field: 'state',
    options: [
      { value: null, label: 'All states' },
      { value: 'saved', label: 'Saved Builds' },
      { value: 'purchased', label: 'Purchases' },
      { value: 'prototype', label: 'Prototypes' },
      { value: 'wishlist', label: 'Wishlist' }
    ]
  },
  
  model: {
    type: 'select',
    serverSide: true,
    field: 'vehicle_model',
    // Options loaded dynamically from modelCounts
    dynamicOptions: true
  },
  
  search: {
    type: 'input',
    serverSide: false,
    field: null, // Searches multiple fields client-side
    placeholder: 'Search by title or description...'
  },
  
  dateRange: {
    type: 'select',
    serverSide: true,
    field: null, // Uses dateField to determine actual field
    options: [
      { value: null, label: 'All time' },
      { value: '7d', label: 'Last 7 days' },
      { value: '30d', label: 'Last 30 days' },
      { value: '90d', label: 'Last 90 days' },
      { value: '1y', label: 'Last year' }
    ]
  },
  
  dateField: {
    type: 'select',
    serverSide: true,
    field: null, // Used with dateRange
    options: [
      { value: 'created_at', label: 'Created date' },
      { value: 'updated_at', label: 'Updated date' }
    ]
  },
  
  priceMin: {
    type: 'input',
    serverSide: true,
    field: 'price_cents',
    inputType: 'number',
    placeholder: 'Min (EUR)'
  },
  
  priceMax: {
    type: 'input',
    serverSide: true,
    field: 'price_cents',
    inputType: 'number',
    placeholder: 'Max (EUR)'
  },
  
  tags: {
    type: 'tags',
    serverSide: false,
    field: null, // Handled via garage_item_tags join
    multiSelect: true,
    mode: 'OR' // Default mode: 'AND' | 'OR'
  },
  
  // Future filters - examples of extensibility
  // year: {
  //   type: 'select',
  //   serverSide: true,
  //   field: 'config_payload->vehicle->year',
  //   options: [] // Loaded dynamically
  // },
  // 
  // trim: {
  //   type: 'select',
  //   serverSide: true,
  //   field: 'config_payload->vehicle->trim',
  //   options: [] // Loaded dynamically
  // },
  // 
  // color: {
  //   type: 'select',
  //   serverSide: false, // Search in config_payload JSONB
  //   field: 'config_payload->options->exterior',
  //   options: [] // Loaded dynamically
  // }
};

/**
 * Get filter definition by key
 * @param {string} filterKey - Filter key
 * @returns {FilterDefinition|null} Filter definition or null if not found
 */
export function getFilterDefinition(filterKey) {
  return FILTER_REGISTRY[filterKey] || null;
}

/**
 * Get all server-side filters
 * @returns {Array<string>} Array of filter keys that are server-side
 */
export function getServerSideFilters() {
  return Object.keys(FILTER_REGISTRY).filter(
    key => FILTER_REGISTRY[key].serverSide === true
  );
}

/**
 * Get all client-side filters
 * @returns {Array<string>} Array of filter keys that are client-side
 */
export function getClientSideFilters() {
  return Object.keys(FILTER_REGISTRY).filter(
    key => FILTER_REGISTRY[key].serverSide === false
  );
}

/**
 * Validate filter value
 * @param {string} filterKey - Filter key
 * @param {*} value - Filter value
 * @returns {boolean} True if valid
 */
export function validateFilterValue(filterKey, value) {
  const definition = getFilterDefinition(filterKey);
  if (!definition) return false;
  
  if (definition.validator) {
    return definition.validator(value);
  }
  
  // Default validation
  if (definition.type === 'select' && definition.options) {
    return definition.options.some(opt => opt.value === value);
  }
  
  return true;
}

