// Image loader utility for PDF generation
// Fetches and resizes vehicle images for embedding in PDFs

/**
 * Fetch an image from a URL and convert to base64 data URL
 * @param url - Image URL
 * @param maxWidth - Maximum width in pixels (default: 800)
 * @param maxHeight - Maximum height in pixels (default: 600)
 * @returns Base64 data URL or null if fetch fails
 */
export async function loadImageForPdf(
  url: string,
  maxWidth: number = 800,
  maxHeight: number = 600
): Promise<string | null> {
  try {
    // Fetch the image
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[ImageLoader] Failed to fetch image: ${url} (${response.status})`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // For now, return as base64 data URL
    // In a production environment, you might want to use a proper image processing library
    // like sharp or canvas to resize the image
    const base64 = btoa(
      String.fromCharCode(...buffer)
    );
    
    // Detect MIME type from URL or response headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(`[ImageLoader] Error loading image ${url}:`, error);
    return null;
  }
}

/**
 * Get the best available image URL from a garage item's config payload
 * @param configPayload - Garage item config payload
 * @returns Image URL or null
 */
export function getBestImageUrl(configPayload: any): string | null {
  if (!configPayload) return null;

  // Priority order:
  // 1. media.heroImage
  // 2. media.gallery[0]
  // 3. thumbnail_url (if in config)
  
  if (configPayload.media?.heroImage) {
    return configPayload.media.heroImage;
  }
  
  if (Array.isArray(configPayload.media?.gallery) && configPayload.media.gallery.length > 0) {
    return configPayload.media.gallery[0];
  }
  
  if (configPayload.thumbnail_url) {
    return configPayload.thumbnail_url;
  }
  
  return null;
}


