/**
 * Adaptive Image Loader
 * Handles viewport detection, DPR detection, network awareness, and image preloading
 */

class ImageLoader {
  constructor() {
    this.preloadQueue = [];
    this.loadedImages = new Map();
    this.loadingImages = new Map();
  }

  /**
   * Detect viewport size and DPR
   * @returns {object} {width, height, dpr}
   */
  detectViewport() {
    if (typeof window === 'undefined') {
      return { width: 1920, height: 1080, dpr: 1 };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1
    };
  }

  /**
   * Detect network speed
   * @returns {string} Network speed category
   */
  detectNetworkSpeed() {
    if (typeof navigator === 'undefined' || !navigator.connection) {
      return '4g'; // Default to fast
    }

    const conn = navigator.connection;
    const effectiveType = conn.effectiveType || '4g';
    
    // Map effectiveType to our categories
    const speedMap = {
      'slow-2g': 'slow',
      '2g': 'slow',
      '3g': 'medium',
      '4g': 'fast'
    };

    return speedMap[effectiveType] || 'fast';
  }

  /**
   * Check if data saver mode is enabled
   * @returns {boolean}
   */
  isDataSaverEnabled() {
    if (typeof navigator === 'undefined' || !navigator.connection) {
      return false;
    }

    return navigator.connection.saveData === true;
  }

  /**
   * Select appropriate image variant based on context
   * @param {string} baseUrl - Base image URL
   * @param {object} options - Options {size, quality, dpr}
   * @returns {string} Optimized image URL
   */
  selectImageVariant(baseUrl, options = {}) {
    const viewport = this.detectViewport();
    const networkSpeed = this.detectNetworkSpeed();
    const dataSaver = this.isDataSaverEnabled();
    
    // Determine size based on viewport and network
    let size = options.size;
    if (!size) {
      if (dataSaver) {
        size = 800; // Force low quality
      } else if (viewport.width < 768) {
        size = networkSpeed === 'slow' ? 800 : 1200;
      } else if (viewport.width < 1024) {
        size = networkSpeed === 'slow' ? 1200 : 2000;
      } else {
        size = networkSpeed === 'slow' ? 2000 : null; // Original
      }
    }

    // Apply DPR multiplier
    const dpr = options.dpr || viewport.dpr;
    if (size && dpr > 1) {
      size = Math.round(size * Math.min(dpr, 2)); // Cap at 2x
    }

    // Generate CDN URL with transformations
    return this.generateCDNUrl(baseUrl, size, options.quality || 85);
  }

  /**
   * Generate CDN URL with transformations
   * @param {string} path - Image path
   * @param {number|null} size - Target width (null for original)
   * @param {number} quality - JPEG quality (1-100)
   * @returns {string} CDN URL
   */
  generateCDNUrl(path, size = null, quality = 85) {
    // If path is already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // If path is relative, construct full URL
    // For now, assume assets are served from public directory
    // In production, this would use Supabase Storage CDN
    if (path.startsWith('/')) {
      return path; // Already absolute path
    }

    // Relative path - prepend base
    return `/assets/Configurator/volturiano/${path}`;
  }

  /**
   * Preload a single image
   * @param {string} url - Image URL
   * @param {object} options - Preload options
   * @returns {Promise<HTMLImageElement>}
   */
  preloadImage(url, options = {}) {
    // Check if already loaded
    if (this.loadedImages.has(url)) {
      return Promise.resolve(this.loadedImages.get(url));
    }

    // Check if currently loading
    if (this.loadingImages.has(url)) {
      return this.loadingImages.get(url);
    }

    // Create loading promise
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.loadedImages.set(url, img);
        this.loadingImages.delete(url);
        resolve(img);
      };

      img.onerror = () => {
        this.loadingImages.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };

      // Set src to trigger load
      img.src = url;
    });

    this.loadingImages.set(url, promise);
    return promise;
  }

  /**
   * Prefetch image on hover (low priority)
   * @param {string} url - Image URL
   */
  prefetchOnHover(url) {
    // Use requestIdleCallback if available
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        this.preloadImage(url).catch(() => {
          // Silently fail on hover prefetch
        });
      });
    } else {
      // Fallback to setTimeout
      setTimeout(() => {
        this.preloadImage(url).catch(() => {
          // Silently fail on hover prefetch
        });
      }, 100);
    }
  }

  /**
   * Queue images for prioritized loading
   * @param {Array<string>} urls - Image URLs (in priority order)
   */
  queueImages(urls) {
    this.preloadQueue = urls;
    this.processQueue();
  }

  /**
   * Process preload queue
   */
  async processQueue() {
    if (this.preloadQueue.length === 0) return;

    // Load first image immediately
    const firstUrl = this.preloadQueue[0];
    if (firstUrl) {
      await this.preloadImage(firstUrl).catch(() => {});
    }

    // Load remaining images when idle
    const remaining = this.preloadQueue.slice(1);
    for (const url of remaining) {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          this.preloadImage(url).catch(() => {});
        });
      } else {
        setTimeout(() => {
          this.preloadImage(url).catch(() => {});
        }, 100);
      }
    }

    this.preloadQueue = [];
  }

  /**
   * Clear loaded images cache
   */
  clearCache() {
    this.loadedImages.clear();
    this.loadingImages.clear();
    this.preloadQueue = [];
  }
}

// Export singleton instance
export const imageLoader = new ImageLoader();

