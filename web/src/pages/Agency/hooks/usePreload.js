import { useEffect } from 'react';

/**
 * Preloads images and resources in the background
 * @param {Array<string>} imageUrls - Array of image URLs to preload
 * @param {Object} options - Options for preloading
 * @param {number} options.delay - Delay before starting preload (ms)
 * @param {number} options.priority - Priority level (1 = high, 2 = medium, 3 = low)
 */
export function usePreload(imageUrls = [], options = {}) {
  const { delay = 0, priority = 2 } = options;

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) return;

    const preloadImages = () => {
      imageUrls.forEach((url) => {
        // Skip if already loaded or invalid
        if (!url) return;

        const img = new Image();
        
        // Set loading priority based on priority level
        if (priority === 1) {
          img.fetchPriority = 'high';
        } else if (priority === 3) {
          img.fetchPriority = 'low';
        } else {
          img.fetchPriority = 'auto';
        }

        // Preload the image
        img.src = url;
      });
    };

    // Delay preloading to not interfere with critical resources
    const timeoutId = setTimeout(preloadImages, delay);

    return () => clearTimeout(timeoutId);
  }, [imageUrls, delay, priority]);
}

/**
 * Preloads images when component is near viewport
 * @param {React.RefObject} ref - Ref to the component element
 * @param {Array<string>} imageUrls - Array of image URLs to preload
 * @param {Object} options - Intersection Observer options
 */
export function usePreloadOnIntersect(ref, imageUrls = [], options = {}) {
  const {
    rootMargin = '200px', // Start loading 200px before component is visible
    threshold = 0,
    delay = 0,
  } = options;

  useEffect(() => {
    if (!ref.current || !imageUrls || imageUrls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Component is near viewport, start preloading
            setTimeout(() => {
              imageUrls.forEach((url) => {
                if (!url) return;
                const img = new Image();
                img.src = url;
              });
            }, delay);

            // Unobserve after preloading starts
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, imageUrls, rootMargin, threshold, delay]);
}

/**
 * Preloads all critical images immediately on page load
 */
export function usePreloadCriticalImages() {
  useEffect(() => {
    // Preload critical images immediately
    const criticalImages = [
      // Add critical image paths here
      // Example: '/src/assets/Logo/TornadoLogo.png',
    ];

    criticalImages.forEach((url) => {
      if (!url) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });

    return () => {
      // Cleanup if needed
      criticalImages.forEach((url) => {
        const link = document.querySelector(`link[href="${url}"]`);
        if (link) {
          document.head.removeChild(link);
        }
      });
    };
  }, []);
}
