/**
 * Manifest Loader Utility
 * Handles loading, parsing, and caching of configurator manifests
 */

const manifestCache = new Map();

/**
 * Load manifest by ID or slug
 * @param {string} manifestIdOrSlug - Manifest ID or slug
 * @returns {Promise<object|null>}
 */
export async function loadManifest(manifestIdOrSlug) {
  // Check cache
  if (manifestCache.has(manifestIdOrSlug)) {
    return manifestCache.get(manifestIdOrSlug);
  }
  
  // This will be called from API layer
  // For now, return null - API layer handles fetching
  return null;
}

/**
 * Parse manifest data structure
 * @param {object} data - Raw manifest JSONB data
 * @returns {object} Parsed manifest
 */
export function parseManifest(data) {
  if (!data) return null;
  
  // Validate basic structure
  if (!data.schemaVersion || !data.layers || !Array.isArray(data.layers)) {
    console.warn('[ManifestLoader] Invalid manifest structure');
    return null;
  }
  
  return {
    schemaVersion: data.schemaVersion,
    id: data.id,
    vehicleModel: data.vehicleModel,
    localeBundle: data.localeBundle,
    angles: data.angles || [],
    layers: data.layers || [],
    variants: data.variants || [],
    metadata: data.metadata || {}
  };
}

/**
 * Get asset URL for a specific layer, variant, and angle
 * @param {object} layer - Layer definition from manifest
 * @param {string} variant - Variant key (e.g., "blu-blue_black")
 * @param {string} angle - Camera angle (e.g., "front-3q")
 * @returns {string|null} Asset URL or null if not found
 */
export function getLayerAssets(layer, variant, angle) {
  if (!layer || !layer.assets) return null;
  
  const assets = layer.assets;
  
  // Check for variant-specific assets (e.g., assets["blu-blue_black"]["front-3q"])
  if (variant && assets[variant]) {
    if (typeof assets[variant] === 'object' && assets[variant][angle]) {
      return assets[variant][angle];
    }
    // If variant is a string URL, return it
    if (typeof assets[variant] === 'string') {
      return assets[variant];
    }
  }
  
  // Check for paint-only variant (for body layer)
  if (variant && !variant.includes('_')) {
    // Try to find paint variant in assets
    const paintVariant = Object.keys(assets).find(key => key === variant || key.startsWith(variant + '_'));
    if (paintVariant && assets[paintVariant]) {
      if (typeof assets[paintVariant] === 'object' && assets[paintVariant][angle]) {
        return assets[paintVariant][angle];
      }
      if (typeof assets[paintVariant] === 'string') {
        return assets[paintVariant];
      }
    }
  }
  
  // Check for default assets
  if (assets.default) {
    return typeof assets.default === 'string' 
      ? assets.default 
      : assets.default[angle] || null;
  }
  
  // Check for direct angle mapping (legacy format)
  if (assets[angle]) {
    return assets[angle];
  }
  
  console.warn('[ManifestLoader] No asset found for layer:', layer.id, 'variant:', variant, 'angle:', angle);
  return null;
}

/**
 * Build variant mapping from manifest
 * Maps option selections to variant keys
 * @param {object} manifest - Parsed manifest
 * @returns {Map<string, string>} Map of option selections to variant keys
 */
export function getVariantMapping(manifest) {
  const mapping = new Map();
  
  if (!manifest || !manifest.variants) return mapping;
  
  manifest.variants.forEach(variant => {
    if (variant.optionMapping) {
      const key = `${variant.optionMapping.optionId}:${variant.optionMapping.valueId}`;
      mapping.set(key, variant.key);
    }
  });
  
  return mapping;
}

/**
 * Cache a manifest
 * @param {string} key - Cache key
 * @param {object} manifest - Manifest data
 */
export function cacheManifest(key, manifest) {
  manifestCache.set(key, manifest);
}

/**
 * Get cached manifest
 * @param {string} key - Cache key
 * @returns {object|null}
 */
export function getCachedManifest(key) {
  return manifestCache.get(key) || null;
}

/**
 * Clear manifest cache
 */
export function clearManifestCache() {
  manifestCache.clear();
}

