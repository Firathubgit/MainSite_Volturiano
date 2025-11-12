## Configurator 3D Scene Architecture

This document outlines how the React Three Fiber (R3F) scene is structured for the Volturiano configurator. Follow `.cursor/rules/01-architecture.md` and `.cursor/rules/07-extensibility.md` when implementing.

### Directory Layout

```
web/src/features/configurator3d/
  components/
    SceneRoot.jsx
    CameraRig.jsx
    EnvironmentStage.jsx
    PresetPicker.jsx
  hooks/
    useConfigurator3DStore.js
    useLODController.js
    useXRSession.js
  materials/
    PaintMaterial.ts
    GlassMaterial.ts
  systems/
    AnimationSystem.js
    LightingSystem.js
    AudioSystem.js
```

### Scene Graph

- **SceneRoot**: entry point wrapping `<Canvas>` with suspense fallbacks + loaders.
- **CameraRig**: orchestrates orbit/target cameras, XR support, parallax offsets.
- **VehicleGroup**: loaded GLB containing body, wheels, interior; nodes partitioned by tags (exterior/interior).
- **LightingSystem**: merges studio presets (key, fill, rim) plus HDRI environment.
- **EffectsComposer**: optional post-processing (bloom, volumetrics, tone mapping).
- **AudioSystem**: positions spatial audio sources relative to vehicle.

### LOD Strategy

1. Define mesh groups with LOD levels baked into GLB (LOD0, LOD1, LOD2).
2. `useLODController` evaluates:
   - Camera distance.
   - Device capability (`navigator.hardwareConcurrency`, GPU benchmark heuristics).
   - User settings (quality slider).
3. On downgrade, swap to lower LOD meshes and simplify materials (fallback to `MeshStandardMaterial`).

### State Management

- Extend existing Zustand store or create dedicated `useConfigurator3DStore`.
- Key slices:
  - `quality` (low/medium/high).
  - `lightingPreset`.
  - `xrActive`.
  - `scenario`.
  - `paintUniforms`.
  - `audioMuted`.
- Persist user preferences using `localStorage` and Supabase profile sync when authenticated.

### Integration Points

- **Supabase**: fetch presets from `studio_light_presets`, `interior_light_profiles`, `scenario_presets`.
- **Analytics**: send events via telemetry pipeline for preset changes, XR toggles, exports.
- **Configurator 2D**: share configuration state via unified store to allow cross-mode switching.

### Performance Considerations

- Lazy-load heavy subsystems (Paint shader, XR) with dynamic imports.
- Use suspense boundaries for GLB streaming; show skeleton/outline preview.
- Guard expensive features behind capability checks and expose overrides in settings.


