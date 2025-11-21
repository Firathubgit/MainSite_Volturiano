# Configurator Image Scaling Strategy

## Overview
This document defines the image scaling strategy for the configurator to ensure optimal performance across devices and network conditions.

## Breakpoints

### Viewport Breakpoints
- **Mobile**: < 768px width
- **Tablet**: 768px - 1024px width
- **Desktop**: > 1024px width

### Device Pixel Ratio (DPR)
- **1x**: Standard displays
- **2x**: Retina displays (most modern devices)
- **3x**: High-DPI displays (premium devices)

## Quality Tiers

### Image Sizes
- **Low**: 800px width (mobile, slow networks)
- **Medium**: 1200px width (tablet, standard networks)
- **High**: 2000px width (desktop, fast networks)
- **Ultra**: Original size (premium experience, very fast networks)

### Network Speed Detection
Uses `navigator.connection` API when available:
- **slow-2g / 2g**: Low quality
- **3g**: Medium quality
- **4g**: High quality
- **5g / wifi**: Ultra quality (if available)

### Data Saver Mode
When `navigator.connection.saveData === true`:
- Force Low quality tier
- Disable preloading
- Reduce image sizes by 50%

## Implementation

### Image Selection Logic
1. Detect viewport size
2. Detect DPR
3. Detect network speed
4. Check data saver mode
5. Select appropriate quality tier
6. Generate CDN URL with transformations

### CDN URL Format
For Supabase Storage:
```
{baseUrl}/storage/v1/object/public/{bucket}/{path}?transform=resize&width={size}&quality={quality}
```

### Preloading Strategy
- **Current angle**: Load immediately at selected quality
- **Adjacent angles**: Prefetch at Medium quality when idle
- **Hover prefetch**: Load at Low quality on swatch hover

## Performance Targets

- **LCP (Largest Contentful Paint)**: < 2.5s
- **Image load time**: < 1s on 3G
- **Option swap time**: < 100ms (cached images)
- **Preload time**: < 500ms (background)

## Fallback Strategy

1. If image fails to load:
   - Retry with lower quality tier
   - Show placeholder image
   - Log error for monitoring

2. If network is unavailable:
   - Use cached images
   - Show offline indicator
   - Queue requests for when online
