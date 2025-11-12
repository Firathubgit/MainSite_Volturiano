## Configurator 3D Lighting Performance Guidelines

Lighting is a key differentiator for Volturiano renders. This guide describes quality tiers and safeguards so the experience scales across devices.

### Quality Tiers

| Tier | Target devices | Features | Notes |
| --- | --- | --- | --- |
| Ultra | Desktop GPUs | HDRI + 3 spot lights, volumetric beams, shadow maps 4096² | Default for high-power mode |
| High | Modern laptops | HDRI + 2 spot lights, shadow maps 2048², fog enabled | Default |
| Medium | Mid tablets | HDRI + 1 key light, shadow maps 1024², fog disabled | Reduced quality |
| Low | Mobile / fallback | HDRI only, baked AO, no dynamic shadows | Automatic on low capability |

### Capability Detection

- Use heuristics:
  - `navigator.hardwareConcurrency`
  - `performance.memory` (where available)
  - GPU tier (via `navigator.gpu` or fallback user agent checks)
- Allow manual override in settings.

### Volumetric Lighting

- Implement via `postprocessing` `GodRaysEffect` or custom light shaft shader.
- Apply only for Ultra/High tiers.
- Provide real-time density slider; default low intensity.

### Fog

- Exponential fog (`scene.fog = new FogExp2(color, density)`).
- For low tier, replace with gradient backplate to avoid fill-rate cost.

### Shadow Strategy

- Use cascaded shadow maps for exterior camera; static directional light.
- Bias and normal offset tuned per `.cursor/rules/06-performance.md`.
- For interior mode, focus on punctual lights with small shadow maps.

### Monitoring

- Track average frame time via built-in telemetry.
- Log tier adjustments (auto downgrades) for product analytics.
- Provide debug overlay (dev-only) showing draw calls, triangles, tier.

### References

- `docs/configurator3d/scene-architecture.md` — overall scene layout.
- `docs/configurator3d/paint-shader.md` — material impacts on lighting.
- `.cursor/rules/06-performance.md` — general performance standards.


