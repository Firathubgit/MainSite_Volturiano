/**
 * Get the front angle configurator image URL based on car configuration
 * @param {Object} config - Configuration object from garage item
 * @returns {string} Image URL or default image URL
 */

// Mapping from option IDs to image filename parts
const PAINT_ID_TO_FILENAME = {
  'paint_blu-blue': 'blu-blue',
  'paint_blu_blue': 'blu-blue',
  'paint_nero-black': 'nero-black',
  'paint_nero_black': 'nero-black',
  'paint_bianco-white': 'bianco-white',
  'paint_bianco_white': 'bianco-white',
  'paint_rosso-red': 'rosso-red',
  'paint_rosso_red': 'rosso-red',
  'paint_orange-fury': 'orange-fury',
  'paint_orange_fury': 'orange-fury'
};

const RIM_ID_TO_FILENAME = {
  'rim_black': 'black',
  'rim_silver': 'silver',
  'rim_bronze': 'bronze'
};

/**
 * Extract body color from config options
 * @param {Object} config - Configuration object
 * @returns {string} Body color filename part or null
 */
function extractBodyColor(config) {
  if (!config || !config.options) return null;
  
  const exterior = config.options.exterior || [];
  if (!Array.isArray(exterior)) return null;
  
  // Find paint option
  for (const option of exterior) {
    const optionId = typeof option === 'string' ? option : option?.id || option?.option_id;
    if (!optionId) continue;
    
    // Check if it's a paint option
    if (PAINT_ID_TO_FILENAME[optionId]) {
      return PAINT_ID_TO_FILENAME[optionId];
    }
  }
  
  return null;
}

/**
 * Extract rim color from config options
 * @param {Object} config - Configuration object
 * @returns {string} Rim color filename part or null
 */
function extractRimColor(config) {
  if (!config || !config.options) return null;
  
  const exterior = config.options.exterior || [];
  if (!Array.isArray(exterior)) return null;
  
  // Find rim option
  for (const option of exterior) {
    const optionId = typeof option === 'string' ? option : option?.id || option?.option_id;
    if (!optionId) continue;
    
    // Check if it's a rim option
    if (RIM_ID_TO_FILENAME[optionId]) {
      return RIM_ID_TO_FILENAME[optionId];
    }
  }
  
  return null;
}

// Import all front-3q images statically (Vite requires static imports)
// This allows Vite to bundle and optimize the images
import bluBlueBlackFront from '../../../assets/Configurator/volturiano/blu-blue_black_front-3q.webp';
import bluBlueBronzeFront from '../../../assets/Configurator/volturiano/blu-blue_bronze_front-3q.webp';
import bluBlueSilverFront from '../../../assets/Configurator/volturiano/blu-blue_silver_front-3q.webp';
import neroBlackBlackFront from '../../../assets/Configurator/volturiano/nero-black_black_front-3q.webp';
import neroBlackBronzeFront from '../../../assets/Configurator/volturiano/nero-black_bronze_front-3q.webp';
import neroBlackSilverFront from '../../../assets/Configurator/volturiano/nero-black_silver_front-3q.webp';
import biancoWhiteBlackFront from '../../../assets/Configurator/volturiano/bianco-white_black_front-3q.webp';
import biancoWhiteBronzeFront from '../../../assets/Configurator/volturiano/bianco-white_bronze_front-3q.webp';
import biancoWhiteSilverFront from '../../../assets/Configurator/volturiano/bianco-white_silver_front-3q.webp';
import rossoRedBlackFront from '../../../assets/Configurator/volturiano/rosso-red_black_front-3q.webp';
import rossoRedBronzeFront from '../../../assets/Configurator/volturiano/rosso-red_bronze_front-3q.webp';
import rossoRedSilverFront from '../../../assets/Configurator/volturiano/rosso-red_silver_front-3q.webp';
import orangeFuryBlackFront from '../../../assets/Configurator/volturiano/orange-fury_black_front-3q.webp';
import orangeFuryBronzeFront from '../../../assets/Configurator/volturiano/orange-fury_bronze_front-3q.webp';
import orangeFurySilverFront from '../../../assets/Configurator/volturiano/orange-fury_silver_front-3q.webp';

// Map body and rim colors to imported images
const IMAGE_MAP = {
  'blu-blue': {
    'black': bluBlueBlackFront,
    'bronze': bluBlueBronzeFront,
    'silver': bluBlueSilverFront
  },
  'nero-black': {
    'black': neroBlackBlackFront,
    'bronze': neroBlackBronzeFront,
    'silver': neroBlackSilverFront
  },
  'bianco-white': {
    'black': biancoWhiteBlackFront,
    'bronze': biancoWhiteBronzeFront,
    'silver': biancoWhiteSilverFront
  },
  'rosso-red': {
    'black': rossoRedBlackFront,
    'bronze': rossoRedBronzeFront,
    'silver': rossoRedSilverFront
  },
  'orange-fury': {
    'black': orangeFuryBlackFront,
    'bronze': orangeFuryBronzeFront,
    'silver': orangeFurySilverFront
  }
};

/**
 * Get configurator image URL for front angle view
 * @param {Object} config - Configuration object from garage item
 * @returns {string|null} Image URL or null if not available
 */
export function getConfiguratorImageUrl(config) {
  // Default: blue body, black rims
  const defaultBodyColor = 'blu-blue';
  const defaultRimColor = 'black';
  
  // Extract colors from config
  const bodyColor = extractBodyColor(config) || defaultBodyColor;
  const rimColor = extractRimColor(config) || defaultRimColor;
  
  // Get image from map
  const image = IMAGE_MAP[bodyColor]?.[rimColor] || IMAGE_MAP[defaultBodyColor]?.[defaultRimColor] || null;
  
  return image;
}

/**
 * Get configurator image URL (alias for consistency)
 * @param {Object} config - Configuration object from garage item
 * @returns {string} Image URL
 */
export function getConfiguratorImage(config) {
  return getConfiguratorImageUrl(config);
}

