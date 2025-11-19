/**
 * Color mapping utilities for converting between option IDs and hex colors
 * 
 * Provides bidirectional mapping between configurator option IDs (used in 2D)
 * and hex color values (used in 3D configurator).
 * 
 * @module features/garage/utils/colorMappings
 */

/**
 * Mapping from option ID to hex color
 * Used when converting 2D configs to 3D format
 */
export const COLOR_ID_TO_HEX = {
  // Body colors
  'paint_blu_blue': '#060FE7',
  'paint_nero_black': '#111111',
  'paint_bianco_white': '#FFFFFF',
  'paint_rosso_red': '#E10600',
  'paint_orange_fury': '#FF4520',
  
  // Rim colors
  'rim_black': '#111111',
  'rim_silver': '#F7FAFF',
  'rim_bronze': '#900678',
};

/**
 * Mapping from hex color to option ID
 * Used when converting 3D configs to 2D format
 * Note: Some hex values may map to multiple option IDs (e.g., black body vs black rim)
 * This mapping prioritizes body colors over rim colors
 */
export const HEX_TO_COLOR_ID = {
  '#060FE7': 'paint_blu_blue',
  '#111111': 'paint_nero_black', // Also rim_black, but prioritize body
  '#FFFFFF': 'paint_bianco_white',
  '#E10600': 'paint_rosso_red',
  '#FF4520': 'paint_orange_fury',
  '#F7FAFF': 'rim_silver',
  '#900678': 'rim_bronze',
};

/**
 * Rim-specific hex to option ID mapping
 * Used when we know the color is for rims specifically
 */
export const RIM_HEX_TO_COLOR_ID = {
  '#111111': 'rim_black',
  '#F7FAFF': 'rim_silver',
  '#900678': 'rim_bronze',
};

/**
 * Get hex color from option ID
 * @param {string} optionId - Option ID (e.g., "paint_blu_blue")
 * @returns {string|null} Hex color or null if not found
 */
export function getColorHex(optionId) {
  if (!optionId || typeof optionId !== 'string') {
    return null;
  }
  return COLOR_ID_TO_HEX[optionId] || null;
}

/**
 * Get option ID from hex color
 * @param {string} hex - Hex color (e.g., "#060FE7")
 * @param {string} category - Optional category hint ("exterior" | "rim" | null)
 * @returns {string|null} Option ID or null if not found
 */
export function getColorOptionId(hex, category = null) {
  if (!hex || typeof hex !== 'string') {
    return null;
  }
  
  // Normalize hex (uppercase, ensure # prefix)
  const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
  
  // If category is "rim", use rim-specific mapping
  if (category === 'rim' && RIM_HEX_TO_COLOR_ID[normalizedHex]) {
    return RIM_HEX_TO_COLOR_ID[normalizedHex];
  }
  
  // Otherwise use general mapping
  return HEX_TO_COLOR_ID[normalizedHex] || null;
}

/**
 * Find closest matching option ID for a hex color
 * Uses color distance calculation for approximate matches
 * @param {string} hex - Hex color
 * @param {string} category - Optional category hint
 * @returns {string|null} Closest matching option ID
 */
export function findClosestColorOptionId(hex, category = null) {
  const exactMatch = getColorOptionId(hex, category);
  if (exactMatch) {
    return exactMatch;
  }
  
  // If no exact match, try to find closest by color distance
  // For now, return null - can be enhanced with color distance algorithm
  return null;
}

/**
 * Check if an option ID is a color option
 * @param {string} optionId - Option ID to check
 * @returns {boolean} True if it's a color option
 */
export function isColorOption(optionId) {
  if (!optionId || typeof optionId !== 'string') {
    return false;
  }
  return optionId.startsWith('paint_') || optionId.startsWith('rim_');
}

/**
 * Check if a hex value is a valid color
 * @param {string} hex - Hex color to validate
 * @returns {boolean} True if valid hex color
 */
export function isValidHexColor(hex) {
  if (!hex || typeof hex !== 'string') {
    return false;
  }
  const normalizedHex = hex.startsWith('#') ? hex : `#${hex}`;
  return /^#[0-9A-F]{6}$/i.test(normalizedHex);
}

/**
 * Extract color from option object
 * Handles both ID-based and hex-based options
 * @param {Object} option - Option object
 * @returns {Object} { id: string, hex: string|null, isHex: boolean }
 */
export function extractColorFromOption(option) {
  if (!option) {
    return { id: null, hex: null, isHex: false };
  }
  
  // Check if option has hex color directly
  if (option.hex && isValidHexColor(option.hex)) {
    const optionId = getColorOptionId(option.hex, option.category);
    return {
      id: optionId,
      hex: option.hex,
      isHex: true
    };
  }
  
  // Check if option has ID
  if (option.id && isColorOption(option.id)) {
    const hex = getColorHex(option.id);
    return {
      id: option.id,
      hex: hex,
      isHex: false
    };
  }
  
  return { id: option.id || null, hex: null, isHex: false };
}

