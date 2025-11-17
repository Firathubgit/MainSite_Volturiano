# Configurator System Overview

**Last Updated:** 2025-01-XX  
**Status:** Both 2D and 3D configurators functional with dev controls

## Architecture

The configurator system supports two visualization modes:

1. **2D Mode:** Pre-rendered images from Blender (60 combinations)
2. **3D Mode:** Real-time 3D rendering with React Three Fiber

Both modes share the same UI and state management structure, allowing seamless switching.

## Components

### Main Page
- **Location:** `web/src/pages/Configurator/Configurator.jsx`
- **Features:**
  - Mode toggle (2D/3D)
  - Dev controls overlay (different for each mode)
  - Suspense boundaries for lazy loading

### 2D Viewer
- **Location:** `web/src/viewers/two-d/Viewer2D.jsx`
- **Assets:** `web/src/assets/Configurator/volturiano/*.webp` (60 images)
- **Features:**
  - Image loading with error handling
  - Loading states
  - Smooth transitions

### 3D Viewer
- **Location:** `web/src/viewers/three-d/Viewer3D.jsx`
- **Assets:** `web/src/assets/3DConfigurator/VolturianoGLB.glb`
- **Features:**
  - Real-time material color changes
  - HDRI environment lighting
  - Interactive camera controls

## State Management

Currently uses local React state. Future integration points:

- **Zustand Store:** For global configurator state
- **Supabase:** For option definitions and pricing
- **Manifest System:** For dynamic asset loading

## Available Options

### Body Colors (5)
- Orange Fury
- Nero Black
- Bianco White
- Rosso Red
- Blu Blue

### Rim Colors (3)
- Black
- Silver
- Bronze

### Camera Angles (2D only - 4)
- Front 3/4
- Side
- Rear 3/4
- Rim (close-up)

## Dev Controls

Both modes include temporary dev controls for testing:

- **2D Mode:** Dropdowns for body/rim, buttons for angles
- **3D Mode:** Color pickers for body/rim (hex values)

These should be replaced with production UI components.

## Documentation

- **2D Configurator:** `docs/configurator/2d-configurator-context.md`
- **3D Configurator:** `docs/configurator3d/next-time-3d-configurator-context.md`
- **Model Context:** `docs/configurator3d/volturiano-model-context.txt`
- **Blender Scripts:** `docs/configurator3d/blender-batch-render-script.py`

## Next Steps

1. Replace dev controls with production UI
2. Integrate with Zustand state management
3. Connect to Supabase option system
4. Implement manifest system for dynamic loading
5. Add image optimization and preloading
6. Build proper color swatch components
7. Add pricing calculations
8. Implement save/share functionality

---

**For specific implementation details, see the individual context files for each mode.**

