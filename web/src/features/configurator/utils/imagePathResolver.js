/**
 * Image Path Resolver Utility
 * Converts manifest asset paths to Vite-compatible URLs
 * Uses the same approach as Viewer2D.jsx
 */

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
  
  // Use Vite's import.meta.url to resolve relative paths
  // Path from utils/ to assets/Configurator/volturiano/
  // Current file: web/src/features/configurator/utils/imagePathResolver.js
  // Target: web/src/assets/Configurator/volturiano/${filename}
  // Relative path: ../../../assets/Configurator/volturiano/${filename}
  // (utils/ -> configurator/ -> features/ -> src/ -> assets/)
  try {
    const assetPath = `../../../assets/Configurator/volturiano/${filename}`;
    const resolvedUrl = new URL(assetPath, import.meta.url).href;
    
    // Validate the URL was created successfully
    if (!resolvedUrl || resolvedUrl.includes('undefined')) {
      throw new Error('Invalid URL generated');
    }
    
    return resolvedUrl;
  } catch (error) {
    console.error('[ImagePathResolver] Failed to resolve path:', manifestPath, 'filename:', filename, 'error:', error);
    return null;
  }
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

