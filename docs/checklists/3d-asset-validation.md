## 3D Asset Validation Checklist

Use this checklist before uploading assets to Supabase or shipping in releases. Automate via `tools/validate-3d-asset.ts`.

### Geometry
- [ ] Units in meters (1 unit = 1 meter).
- [ ] Origin at world zero; forward axis +Z.
- [ ] Pivot centered on logical rotation point (wheel, door hinge).
- [ ] Triangle count within budget (Vehicle body < 150k tris LOD0).

### Materials
- [ ] PBR texture sets (baseColor, normal, metalness, roughness) provided in linear space.
- [ ] Texture resolution powers of two; max 4K.
- [ ] Material names follow convention `material_{part}`.
- [ ] No unused materials.

### Hierarchy & Naming
- [ ] Node names snake_case (`body_main`, `wheel_front_left`).
- [ ] Group nodes by function (exterior_, interior_, animation_).
- [ ] Animation tracks named `{part}-{action}` (e.g., `door_left-open`).

### Animations
- [ ] Timeline starts at 0; keyframes normalized to 0–1 range.
- [ ] Exported as GLTF/GLB with baked keyframes.
- [ ] Doors/parts closed at frame 0.

### Lighting & Cameras (if provided)
- [ ] Cameras named `camera_exterior`, `camera_interior`.
- [ ] Light intensities normalized; color temperature noted.

### Metadata
- [ ] Include asset manifest JSON describing LODs and variant mapping.
- [ ] Provide thumbnail preview.

### Validation Script Requirements
- [ ] `scale == 1` for root node.
- [ ] No NaN transforms.
- [ ] Bounding box not exceeding 7m length, 3m height.


