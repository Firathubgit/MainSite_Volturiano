## Volturiano Paint Shader Specification

The paint shader delivers signature Volturiano finishes with metallic flakes, clearcoat sheen, and polarization highlights. Built on top of `THREE.MeshPhysicalMaterial` with custom shader chunks.

### Parameters

| Uniform | Type | Range | Description |
| --- | --- | --- | --- |
| `baseColor` | vec3 | 0–1 | Base diffuse color (SRGB corrected). |
| `flakeColor` | vec3 | 0–1 | Metallic flake tint. |
| `flakeDensity` | float | 0–1 | Probability of flake appearance (default 0.35). |
| `flakeSize` | float | 0–1 | Controls noise scale for sparkles. |
| `clearcoat` | float | 0–1 | Intensity of clearcoat layer. |
| `clearcoatRoughness` | float | 0–1 | Roughness of clearcoat reflection. |
| `polarizationStrength` | float | 0–1 | Polarization highlight intensity. |
| `environmentIntensity` | float | 0–2 | Scales reflection contribution. |

### Architecture

1. Start from `MeshPhysicalMaterial`.
2. Inject custom fragment chunk to add procedural flake highlights using blue noise texture.
3. Blend polarization highlight based on view angle and environment reflection vector.
4. Support clearcoat normal perturbation for subtle waves.

### Implementation Outline

```ts
import { ShaderMaterial, Vector3 } from 'three';

export function createPaintMaterial(params) {
  const material = new MeshPhysicalMaterial({
    color: params.baseColor,
    metalness: 0.95,
    roughness: 0.25,
    clearcoat: params.clearcoat,
    clearcoatRoughness: params.clearcoatRoughness,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.flakeColor = { value: new Vector3().fromArray(params.flakeColor) };
    shader.uniforms.flakeDensity = { value: params.flakeDensity };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <dithering_fragment>', customFlakeChunk + '\n#include <dithering_fragment>');
  };

  return material;
}
```

### Controls

- UI sliders / presets adjust uniforms; values stored in configurator store.
- Provide preset library (e.g., `Launch Orange`, `Polar Midnight`) with curated parameters.
- Persist selections to Supabase when user saves configuration.

### Performance

- Fall back to standard physical material when quality set to low.
- Use half-resolution render target for reflection pass if GPU cost too high.
- Cache precomputed noise textures.

### Testing

- Validate shading in glTF viewer (gltf-transform inspector).
- Compare renders across HDRI environments to ensure consistent highlights.
- QA on mobile with quality set to low to confirm fallback behavior.


