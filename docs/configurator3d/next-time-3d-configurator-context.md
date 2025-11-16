# 3D Configurator - Context for Next Developer

**Last Updated:** 2025-11-16  
**Status:** Core 3D viewer functional, ready for color controls and UI polish

## What's Been Built

### Core Implementation
- **3D Viewer Component:** `web/src/viewers/three-d/Viewer3D.jsx`
  - React Three Fiber + Drei setup
  - Loads `VolturianoGLB.glb` from `web/src/assets/3DConfigurator/`
  - Custom HDRI: `studio_small_06_4k.exr` (Poly Haven) - provides lighting and background
  - Ground plane with polished concrete material (MeshPhysicalMaterial)
  - Car scaled 2x for proper studio presence
  - Camera positioned at `[6, 1.8, 8]` with FOV 50° for natural viewing angle

### Material System
- **Mat_BodyPaint:** Car body material (metalness: 0.8, roughness: 0.2, envMapIntensity: 1.5)
- **Mat_RimPaint:** Rim material (metalness: 0.9, roughness: 0.1, envMapIntensity: 1.2)
- Both materials support real-time color changes via props (`bodyColor`, `rimColor`)
- Materials automatically use environment map for reflections

### Integration
- **Configurator Page:** `web/src/pages/Configurator/Configurator.jsx`
  - Toggle between 2D/3D modes
  - DEBUG button bypasses env flags for testing
  - Dev-mode color overlay (temporary UI) for body/rim color changes
  - Default colors: Body `#FF4520`, Rim `#111111`

### Environment & Lighting
- Custom HDRI loaded via drei's `Environment` component
- Ground plane: 200x200 units, polished concrete aesthetic
- HDRI provides primary lighting (environmentIntensity: 1.8)
- Subtle fill lights complement HDRI (ambient: 0.3, directional: 0.4/0.2)

## Key Files

- `web/src/viewers/three-d/Viewer3D.jsx` - Main 3D viewer component
- `web/src/pages/Configurator/Configurator.jsx` - Page with mode toggle
- `web/src/pages/Configurator/Configurator.module.css` - Styling
- `web/src/assets/3DConfigurator/VolturianoGLB.glb` - Car model
- `web/src/assets/3DConfigurator/studio_small_06_4k.exr` - HDRI environment
- `docs/configurator3d/volturiano-model-context.txt` - Model structure documentation

## Model Context

See `docs/configurator3d/volturiano-model-context.txt` for complete model details:
- Root object: `Car` (contains body mesh)
- Key materials: `Mat_BodyPaint` (body only), `Mat_RimPaint` (all 4 rims)
- No animations, no skeleton, static PBR materials
- Exported from Blender 4.5 as glTF 2.0 Binary

## Current State

✅ **Working:**
- 3D scene loads and renders correctly
- Custom HDRI environment provides realistic lighting
- Car materials respond to color changes
- Ground plane with reflections
- OrbitControls for camera interaction
- Dev-mode color picker overlay

⏳ **Next Steps:**
- Replace dev-mode overlay with production UI
- Add proper color swatches/picker UI
- Implement option selection system
- Connect to configurator state management
- Add more environment presets/options
- Optimize performance (LOD, quality tiers)
- Add interior/exterior toggle (when interior model available)

## Important Notes

1. **Environment Flag:** `VITE_ENABLE_R3F_MODE=true` required for 3D mode (or use DEBUG button)
2. **HDRI Loading:** Uses drei's Environment component - supports .hdr and .exr files
3. **Material Updates:** Color changes happen via `useEffect` watching `bodyColor`/`rimColor` props
4. **Scale:** Car is scaled 2x - adjust in `VolturianoCar` component if model size changes
5. **Ground Plane:** Uses `MeshPhysicalMaterial` with clearcoat for premium finish
6. **Camera:** OrbitControls target set to `[0, 0.5, 0]` to focus on car center

## Performance Considerations

- HDRI resolution: 512 (can increase to 1024 for better quality)
- DPR: [1, 2] for device pixel ratio scaling
- Ground plane: 200x200 units (large but necessary for studio feel)
- Consider LOD system for lower-end devices (future)

## Troubleshooting

- **Car too small/large:** Adjust scale in `VolturianoCar` useEffect
- **HDRI not loading:** Check file path, ensure .exr/.hdr is in assets folder
- **Materials not updating:** Verify material names match (`Mat_BodyPaint`, `Mat_RimPaint`)
- **Black car:** Check environment map is loaded, verify material settings
- **Ground not visible:** Check ground plane position and material setup

## Resources

- HDRI Sources: https://polyhaven.com/hdris, https://hdrihaven.com/
- Drei Environment Docs: https://github.com/pmndrs/drei#environment
- React Three Fiber Docs: https://docs.pmnd.rs/react-three-fiber
- Model Context: `docs/configurator3d/volturiano-model-context.txt`

---

**For questions or issues, check the model context file and ensure HDRI is loading correctly.**

