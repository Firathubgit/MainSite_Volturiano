export const IMAGE_UPLOAD_LIMITS = {
  maxImages: 10,
  maxLongEdge: 1568,
  maxImageBytes: 480 * 1024,
  minImageBytes: 220 * 1024,
  maxTotalDataUrlChars: 5_800_000,
  initialQuality: 0.82,
  minQuality: 0.56,
};

const SUPPORTED_PASSTHROUGH_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function optimizeImageFiles(files, options = {}) {
  const limits = { ...IMAGE_UPLOAD_LIMITS, ...options };
  const existingImages = Array.isArray(options.existingImages) ? options.existingImages : [];
  const imageFiles = Array.from(files || []).filter((file) => file?.type?.startsWith('image/'));
  const availableSlots = Math.max(0, limits.maxImages - existingImages.length);
  const selectedFiles = imageFiles.slice(0, availableSlots);
  const skippedForCount = Math.max(0, imageFiles.length - selectedFiles.length);

  const stats = {
    originalBytes: 0,
    optimizedBytes: 0,
    optimizedCount: 0,
    passthroughCount: 0,
    skippedForCount,
    skippedForBudget: 0,
    failedCount: 0,
  };

  let totalChars = existingImages.reduce((sum, image) => sum + String(image || '').length, 0);
  const images = [];

  for (let index = 0; index < selectedFiles.length; index += 1) {
    const file = selectedFiles[index];
    const remainingSlotsIncludingCurrent = selectedFiles.length - index;
    const remainingChars = limits.maxTotalDataUrlChars - totalChars;
    const balancedDataUrlChars = Math.max(0, Math.floor(remainingChars / remainingSlotsIncludingCurrent));
    const balancedMaxBytes = Math.max(
      limits.minImageBytes,
      Math.min(limits.maxImageBytes, Math.floor(balancedDataUrlChars * 0.72))
    );

    try {
      const optimized = await optimizeImageFile(file, {
        ...limits,
        maxImageBytes: balancedMaxBytes,
      });

      stats.originalBytes += optimized.originalBytes;
      stats.optimizedBytes += optimized.optimizedBytes;
      if (optimized.optimized) stats.optimizedCount += 1;
      else stats.passthroughCount += 1;

      if (totalChars + optimized.dataUrl.length > limits.maxTotalDataUrlChars) {
        const finalAttempt = await optimizeImageFile(file, {
          ...limits,
          maxLongEdge: Math.min(1280, limits.maxLongEdge),
          maxImageBytes: limits.minImageBytes,
          initialQuality: 0.7,
          minQuality: 0.5,
        });

        if (totalChars + finalAttempt.dataUrl.length > limits.maxTotalDataUrlChars) {
          stats.skippedForBudget += 1;
          continue;
        }

        images.push(finalAttempt.dataUrl);
        totalChars += finalAttempt.dataUrl.length;
        stats.optimizedBytes += finalAttempt.optimizedBytes - optimized.optimizedBytes;
        stats.optimizedCount += finalAttempt.optimized && !optimized.optimized ? 1 : 0;
        continue;
      }

      images.push(optimized.dataUrl);
      totalChars += optimized.dataUrl.length;
    } catch (error) {
      console.warn('[image-optimizer] Failed to optimize image:', error);
      stats.failedCount += 1;
    }
  }

  return { images, stats };
}

async function optimizeImageFile(file, limits) {
  const originalBytes = file.size || 0;
  const decoded = await decodeImage(file);
  const needsResize = Math.max(decoded.width, decoded.height) > limits.maxLongEdge;
  const canPassThrough =
    !needsResize &&
    originalBytes > 0 &&
    originalBytes <= limits.maxImageBytes &&
    SUPPORTED_PASSTHROUGH_TYPES.has(file.type);

  if (canPassThrough) {
    const dataUrl = await blobToDataUrl(file);
    decoded.close?.();
    return {
      dataUrl,
      originalBytes,
      optimizedBytes: originalBytes,
      optimized: false,
    };
  }

  let targetLongEdge = limits.maxLongEdge;
  let bestBlob = null;

  for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
    const { canvas, cleanup } = drawToCanvas(decoded, targetLongEdge);
    const qualities = qualitySteps(limits.initialQuality, limits.minQuality);

    for (const quality of qualities) {
      const blob = await encodeCanvas(canvas, 'image/webp', quality)
        || await encodeCanvas(canvas, 'image/jpeg', quality);

      if (!blob) continue;
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (blob.size <= limits.maxImageBytes) {
        cleanup();
        decoded.close?.();
        return {
          dataUrl: await blobToDataUrl(blob),
          originalBytes,
          optimizedBytes: blob.size,
          optimized: true,
        };
      }
    }

    cleanup();
    targetLongEdge = Math.max(720, Math.round(targetLongEdge * 0.82));
  }

  decoded.close?.();
  if (!bestBlob) throw new Error('Could not encode image');

  return {
    dataUrl: await blobToDataUrl(bestBlob),
    originalBytes,
    optimizedBytes: bestBlob.size,
    optimized: true,
  };
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close?.(),
    };
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    return {
      image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function drawToCanvas(decoded, maxLongEdge) {
  const scale = Math.min(1, maxLongEdge / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { alpha: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(decoded.image, 0, 0, width, height);

  return {
    canvas,
    cleanup: () => {
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}

function encodeCanvas(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function qualitySteps(initialQuality, minQuality) {
  const steps = [];
  for (let quality = initialQuality; quality >= minQuality; quality -= 0.08) {
    steps.push(Number(quality.toFixed(2)));
  }
  if (!steps.includes(minQuality)) steps.push(minQuality);
  return steps;
}
