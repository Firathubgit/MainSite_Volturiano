/**
 * Image Path Resolver Utility
 * Converts manifest asset paths to Vite-compatible URLs
 * 
 * In production, Vite needs to know about assets at build time.
 * We use import.meta.glob with eager:true to preload all images so Vite can process them.
 */

// Preload all configurator images at build time using Vite's glob import
// eager: true ensures all images are loaded synchronously at build time
// Use relative path from this file: ../../../assets/Configurator/volturiano/*.webp
const imageModules = import.meta.glob('../../../assets/Configurator/volturiano/*.webp', { 
  eager: true,
  import: 'default' 
});

// Create a map of filename -> resolved URL for quick lookup
const imageUrlMap = new Map();

// Build the map from the glob results
Object.entries(imageModules).forEach(([path, module]) => {
  const filename = path.split('/').pop();
  if (filename && module) {
    // Extract URL from module (could be direct URL string or module.default)
    const url = typeof module === 'string' ? module : (module.default || module);
    if (url) {
      imageUrlMap.set(filename, url);
    }
  }
});

/**
 * Resolve image path from manifest to Vite-compatible URL
 * @param {string} manifestPath - Path from manifest (e.g., "/assets/Configurator/volturiano/blu-blue_black_front-3q.webp")
 * @returns {string|null} Vite-compatible URL or null if invalid
 */
export function resolveImagePath(manifestPath) {
  if (!manifestPath || typeof manifestPath !== 'string') {
    console.warn('[ImagePathResolver] Invalid manifest path:', manifestPath);
    return null;
  }
  
  // If already a full URL, return as-is
  if (manifestPath.startsWith('http://') || manifestPath.startsWith('https://')) {
    return manifestPath;
  }
  
  // Extract filename from path
  const filename = manifestPath.split('/').pop();
  
  if (!filename || !filename.endsWith('.webp')) {
    console.warn('[ImagePathResolver] Invalid filename:', filename);
    return null;
  }
  
  // Look up in the preloaded map
  const resolvedUrl = imageUrlMap.get(filename);
  
  if (resolvedUrl) {
    return resolvedUrl;
  }
  
  // Fallback: try using new URL for development (works in dev, not in prod)
  if (import.meta.env.DEV) {
    try {
      const assetPath = `../../../assets/Configurator/volturiano/${filename}`;
      const resolvedUrl = new URL(assetPath, import.meta.url).href;
      
      if (resolvedUrl && !resolvedUrl.includes('undefined')) {
        return resolvedUrl;
      }
    } catch (error) {
      console.warn('[ImagePathResolver] Fallback URL resolution failed:', error);
    }
  }
  
  console.warn('[ImagePathResolver] Could not resolve image:', filename, 'Available files:', Array.from(imageUrlMap.keys()).slice(0, 5));
  return null;
}

/**
 * Resolve multiple image paths
 * @param {Array<string>} paths - Array of manifest paths
 * @returns {Array<string>} Array of resolved URLs
 */
export function resolveImagePaths(paths) {
  if (!Array.isArray(paths)) return [];
  return paths.map(resolveImagePath).filter(Boolean);
}

