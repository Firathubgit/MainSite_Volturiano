## Configurator Motion Guidelines

Motion reinforces the Volturiano brand—sleek, purposeful, and precise. Follow these rules whenever animating camera angles, parallax, or option transitions.

### Principles

- **Purposeful**: Only animate to communicate change (angle shift, layer swap).
- **Responsive**: Duration scales with distance travelled and respects reduced-motion preferences.
- **Layered depth**: Foreground elements move faster than background to suggest depth.

### Timing & Easing

| Motion | Duration | Easing | Notes |
| --- | --- | --- | --- |
| Camera angle switch | 320ms | `cubic-bezier(0.22, 0.61, 0.36, 1)` | Applies fade + pan simultaneously. |
| Parallax settle | 180ms | `cubic-bezier(0.2, 0, 0, 1)` | For mouse/touch move release. |
| Variant overlay | 220ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Use opacity + y-translate. |

- Respect `prefers-reduced-motion`: fall back to fade-only transitions.

### Camera Transitions

1. Fade current layer to 70% opacity.
2. Begin pan to target offset; parallax depth uses `layer.parallaxDepth`.
3. Crossfade new angle content, then restore full opacity.

Implementation reference: `web/src/features/configurator/components/CameraView.jsx`.

### Parallax Mapping

| Layer | Depth value | Movement ratio |
| --- | --- | --- |
| Background sky | 0.05 | 5% of camera delta |
| Midground (vehicle body) | 0.20 | 20% of camera delta |
| Foreground UI chrome | 0.35 | 35% of camera delta |

Values stored in manifest (`parallaxDepth`).

### Accessibility

- Provide toggle “Reduce motion” in settings (mirrors OS preference).
- Never trigger seizures: avoid strobing or rapid oscillation.

### Tooling

- Prototype animations in Figma Smart Animate before implementation.
- In code, prefer `framer-motion` or CSS transitions with hardware acceleration (`transform`, `opacity`).
- Log animation start/stop for future UX telemetry.


