import { getLayerAssets, getVariantMapping } from './manifestLoader';
import { resolveImagePath } from './imagePathResolver';

/**
 * Asset Resolver Utility
 * Resolves selected options + manifest + angle into layer asset URLs
 */

/**
 * Resolve assets for current configuration
 * @param {object} manifest - Parsed manifest
 * @param {object} selectedOptions - Selected options {optionId: valueId}
 * @param {string} currentAngle - Current camera angle
 * @returns {Array<object>} Array of layer definitions with resolved URLs
 */
export function resolveAssets(manifest, selectedOptions, currentAngle, vehicleOptions = []) {
  if (!manifest || !manifest.layers) {
    return [];
  }
  
  const variantMapping = getVariantMapping(manifest);
  const resolvedLayers = [];
  
  // Build a map of option IDs to codes for easier lookup
  const optionIdToCode = new Map();
  vehicleOptions.forEach(opt => {
    optionIdToCode.set(opt.id, opt.code);
  });
  
  // Extract paint and rim from selected options
  let paintKey = null;
  let rimKey = null;
  
  // Find paint option from selectedOptions
  Object.entries(selectedOptions).forEach(([optionId, valueId]) => {
    const optionCode = optionIdToCode.get(optionId) || optionId;
    
    // Check if it's a paint option
    if (optionCode && (optionCode.startsWith('paint_') || optionCode.includes('paint'))) {
      // Extract color from code (e.g., "paint_blu-blue" -> "blu-blue", "paint_orange_fury" -> "orange-fury")
      paintKey = optionCode.replace(/^paint_/, '').replace(/^paint/, '').replace(/^_/, '');
      // Normalize underscores to hyphens
      paintKey = paintKey.replace(/_/g, '-');
    }
    
    // Check if it's a rim/wheel option
    if (optionCode && (optionCode.startsWith('rim') || optionCode.startsWith('wheel') || optionCode.includes('rim'))) {
      // Extract rim color from code
      rimKey = optionCode.replace(/^rims_/, '').replace(/^rim_/, '').replace(/^wheel_/, '').replace(/^_/, '');
      rimKey = rimKey.replace(/_/g, '-');
    }
  });
  
  // Fallback to defaults if not found
  if (!paintKey) {
    paintKey = manifest.metadata?.defaultOptions?.paint || 'blu-blue';
  }
  if (!rimKey) {
    rimKey = manifest.metadata?.defaultOptions?.rims || manifest.metadata?.defaultOptions?.rim || 'black';
  }
  
  console.log('[AssetResolver] Resolving assets:', { paintKey, rimKey, selectedOptions, optionIdToCode: Array.from(optionIdToCode.entries()) });
  
  // Iterate through layers in z-index order
  const sortedLayers = [...manifest.layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  
  sortedLayers.forEach(layer => {
    // Determine variant key from selected options
    let variantKey = null;
    let fallbackKey = null;
    
    // For body layer, try paint-only first (as per manifest), but also prepare paint_rim fallback
    if (layer.id === 'body') {
      variantKey = paintKey;
      fallbackKey = `${paintKey}_${rimKey}`;
    }
    
    // For wheels layer, combine paint + rim (manifest has paint_rim keys)
    if (layer.id === 'wheels') {
      variantKey = `${paintKey}_${rimKey}`;
    }
    
    // For background layer, use default
    if (layer.id === 'background') {
      variantKey = 'default';
    }
    
    // Resolve asset URL - try primary key first
    let assetUrl = getLayerAssets(layer, variantKey, currentAngle);
    
    // Fallback: if body layer doesn't have paint-only, try paint_rim combination
    if (!assetUrl && layer.id === 'body' && fallbackKey) {
      assetUrl = getLayerAssets(layer, fallbackKey, currentAngle);
    }
    
    // Final fallback to default
    let finalUrl = assetUrl || layer.assets?.default || null;
    
    // Skip background layer if it's trying to use a car image
    if (layer.id === 'background' && finalUrl && (finalUrl.includes('_front-3q') || finalUrl.includes('_side') || finalUrl.includes('_rear-3q') || finalUrl.includes('_rim'))) {
      // Background layer should be transparent or a proper background image
      // Skip it for now - we'll render a dark background via CSS
      finalUrl = null;
    }
    
    // Resolve image path to Vite-compatible URL
    if (finalUrl && typeof finalUrl === 'string' && finalUrl.trim().length > 0) {
      const resolvedUrl = resolveImagePath(finalUrl);
      
      if (resolvedUrl && typeof resolvedUrl === 'string' && !resolvedUrl.includes('undefined')) {
        resolvedLayers.push({
          id: layer.id,
          zIndex: layer.zIndex || 0,
          url: resolvedUrl,
          blendMode: layer.blendMode || 'normal',
          parallaxDepth: layer.parallaxDepth || 0
        });
      } else {
        console.warn('[AssetResolver] Failed to resolve image path:', finalUrl, 'for layer:', layer.id, 'resolvedUrl:', resolvedUrl, 'variantKey:', variantKey, 'angle:', currentAngle);
      }
    } else if (layer.id !== 'background') {
      // Only warn for non-background layers
      console.warn('[AssetResolver] No asset found for layer:', layer.id, 'variant:', variantKey, 'fallback:', fallbackKey, 'angle:', currentAngle, 'finalUrl:', finalUrl, 'assetUrl:', assetUrl, 'layer assets keys:', Object.keys(layer.assets || {}));
    }
  });
  
  console.log('[AssetResolver] Resolved layers:', resolvedLayers.length, resolvedLayers.map(l => ({ id: l.id, url: l.url?.substring(0, 50) + '...' })));
  
  return resolvedLayers;
}

/**
 * Resolve asset URL for a specific layer and variant
 * @param {object} manifest - Parsed manifest
 * @param {string} layerId - Layer ID
 * @param {object} selectedOptions - Selected options
 * @param {string} angle - Camera angle
 * @returns {string|null} Asset URL or null
 */
export function resolveLayerAsset(manifest, layerId, selectedOptions, angle) {
  if (!manifest || !manifest.layers) {
    return null;
  }
  
  const layer = manifest.layers.find(l => l.id === layerId);
  if (!layer) {
    return null;
  }
  
  // Determine variant key
  let variantKey = null;
  
  if (layerId === 'body') {
    variantKey = selectedOptions.paint || manifest.metadata?.defaultOptions?.paint;
  } else if (layerId === 'wheels') {
    const paint = selectedOptions.paint || manifest.metadata?.defaultOptions?.paint;
    const rim = selectedOptions.rims || selectedOptions.wheels || manifest.metadata?.defaultOptions?.rims;
    if (paint && rim) {
      variantKey = `${paint}_${rim}`;
    }
  }
  
  const assetUrl = getLayerAssets(layer, variantKey, angle);
  
  // Fallback to default
  return assetUrl || layer.assets?.default || null;
}

/**
 * Get available angles from manifest
 * @param {object} manifest - Parsed manifest
 * @returns {Array<string>} Available camera angles
 */
export function getAvailableAngles(manifest) {
  if (!manifest || !manifest.angles) {
    return ['front-3q']; // Default angle
  }
  
  return manifest.angles;
}

/**
 * Check if angle is available in manifest
 * @param {object} manifest - Parsed manifest
 * @param {string} angle - Angle to check
 * @returns {boolean} True if angle is available
 */
export function isAngleAvailable(manifest, angle) {
  const availableAngles = getAvailableAngles(manifest);
  return availableAngles.includes(angle);
}

