# 2D Configurator - Context for Next Developer

**Last Updated:** 2025-01-XX  
**Status:** Fully functional with dev controls, ready for production UI integration

## What's Been Built

### Core Implementation
- **2D Viewer Component:** `web/src/viewers/two-d/Viewer2D.jsx`
  - Loads pre-rendered images based on body color, rim color, and camera angle
  - Handles loading states, error handling, and smooth transitions
  - Image path construction: `{bodyColor}_{rimColor}_{angle}.webp`
  - Images loaded from: `web/src/assets/Configurator/volturiano/`

### Image Assets
- **Total Images:** 60 (5 body colors × 3 rim colors × 4 angles)
- **Naming Convention:** `{body-color}_{rim-color}_{angle}.webp`
- **Format:** WEBP (optimized for web)
- **Resolution:** 1920×1080 (16:9 aspect ratio)
- **Location:** `web/src/assets/Configurator/volturiano/`

### Available Options

**Body Colors (5):**
- `orange-fury` - Orange Fury (#FF4520)
- `nero-black` - Nero Black (#111111)
- `bianco-white` - Bianco White (#FFFFFF)
- `rosso-red` - Rosso Red (#E10600)
- `blu-blue` - Blu Blue (#060FE7)

**Rim Colors (3):**
- `black` - Black (#111111)
- `silver` - Silver (#F7FAFF)
- `bronze` - Bronze (#900678)

**Camera Angles (4):**
- `front-3q` - Front 3/4 view
- `side` - Pure side view
- `rear-3q` - Rear 3/4 view
- `rim` - Close-up rim/wheel view

### Integration
- **Configurator Page:** `web/src/pages/Configurator/Configurator.jsx`
  - Toggle between 2D/3D modes
  - Dev-mode controls panel (top-left) when in 2D mode
  - Dropdowns for body/rim color selection
  - Button group for angle selection
  - Default: Orange Fury body, Black rims, Front 3/4 angle

### Dev Controls
- **Body Color:** Dropdown select with all 5 body color options
- **Rim Color:** Dropdown select with all 3 rim color options
- **Angle:** Button group with 4 angle options (active state highlighted)
- **Styling:** Red dashed border, dark background (matches 3D dev controls)

## Key Files

- `web/src/viewers/two-d/Viewer2D.jsx` - Main 2D viewer component
- `web/src/viewers/two-d/Viewer2D.module.css` - Viewer styling
- `web/src/pages/Configurator/Configurator.jsx` - Page with mode toggle and dev controls
- `web/src/pages/Configurator/Configurator.module.css` - Page styling
- `web/src/assets/Configurator/volturiano/*.webp` - All 60 rendered images
- `docs/configurator3d/blender-batch-render-script.py` - Script used to generate images

## Image Generation

Images were rendered using a Blender Python script:
- **Script:** `docs/configurator3d/blender-batch-render-script.py`
- **Process:** Automated batch rendering of all combinations
- **Settings:** Cycles engine, 128 samples, 1920×1080 resolution
- **Camera Setup:** 4 cameras positioned for each angle
- **Material Names:** `Mat_BodyPaint` (body), `Mat_RimPaint` (rims)

See `docs/configurator3d/blender-render-guide.md` for rendering instructions.

## Current State

✅ **Working:**
- All 60 image combinations load correctly
- Smooth transitions between images
- Loading states with spinner
- Error handling for missing images
- Dev controls for testing all combinations
- Responsive design

⏳ **Next Steps:**
- Replace dev controls with production UI
- Integrate with configurator state management (Zustand)
- Connect to Supabase option system
- Add image preloading for smoother transitions
- Implement manifest system for dynamic image loading
- Add image optimization (lazy loading, responsive images)
- Consider @2x versions for retina displays

## Important Notes

1. **Image Paths:** Uses `new URL()` with `import.meta.url` for Vite asset handling
2. **State Management:** Currently uses local React state, should integrate with Zustand store
3. **Image Loading:** Preloads images using `Image()` API for smooth transitions
4. **Error Handling:** Shows error message if image fails to load (with filename)
5. **Constants:** Exported from Viewer2D for use in parent components

## Code Structure

```javascript
// Viewer2D component usage
<Viewer2D 
  bodyColor="orange-fury"  // Body color key
  rimColor="black"         // Rim color key
  angle="front-3q"         // Angle key
  onImageLoad={callback}   // Optional callback
  onImageError={callback}  // Optional error callback
/>

// Available options exported
import { BODY_COLORS, RIM_COLORS, ANGLES } from '../../viewers/two-d/Viewer2D';
```

## Image Naming Convention

All images follow this pattern:
```
{body-color}_{rim-color}_{angle}.webp
```

Examples:
- `orange-fury_black_front-3q.webp`
- `nero-black_silver_rim.webp`
- `bianco-white_bronze_side.webp`

## Performance Considerations

- **File Sizes:** 29KB - 89KB per image (WEBP compression)
- **Loading:** Images load on-demand (not preloaded)
- **Caching:** Browser cache handles repeated views
- **Future:** Consider implementing:
  - Image preloading on hover
  - Lazy loading for off-screen images
  - Responsive image sizes (@1x, @2x)
  - CDN hosting for better performance

## Troubleshooting

- **Image not loading:** Check filename matches convention exactly (case-sensitive)
- **404 errors:** Verify image exists in `web/src/assets/Configurator/volturiano/`
- **Wrong image:** Check bodyColor/rimColor/angle props match available options
- **Slow loading:** Images are large (1920×1080), consider optimization or CDN

## Future Enhancements

1. **Manifest System:** JSON manifest defining all available combinations
2. **State Management:** Integrate with Zustand store for configurator state
3. **Image Optimization:** Multiple resolutions, lazy loading, preloading
4. **Animation:** Smooth fade transitions between images
5. **Parallax:** Subtle parallax effects for depth (mentioned in roadmap)
6. **Production UI:** Replace dev controls with proper color swatches and UI

---

**For questions, check the image assets folder and ensure filenames match the convention.**

