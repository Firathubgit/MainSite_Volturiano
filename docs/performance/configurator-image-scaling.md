## Configurator Image Scaling Strategy

This guide defines how the 2D configurator selects the appropriate asset quality based on the viewer’s device. It adheres to performance expectations in `.cursor/rules/06-performance.md` and builds on the asset taxonomy documented in `docs/data/asset-manifest.md`.

### Asset Tiers

| Tier | Filename suffix | Target devices | Max resolution | Notes |
| --- | --- | --- | --- | --- |
| Low | `@1x.webp` | Mobile, low bandwidth | 1280px width | Progressive load placeholder |
| Medium | `@2x.webp` | Tablets, standard desktop | 1920px width | Default for moderate DPR |
| High | `@3x.webp` | HiDPI desktop | 2560px width | Loaded lazily; avoid on slow networks |
| Ultra | `@4x.avif` | Art director review | 3200px width | Manual opt-in via query flag |

### Breakpoints & Conditions

- **Viewport width**: `<= 768`, `769–1280`, `1281–1920`, `>1920`.
- **Device Pixel Ratio (DPR)**: `<=1`, `1<dpr<=1.5`, `1.5<dpr<=2`, `>2`.
- **Network info**: Use `navigator.connection.effectiveType` when available to defer high tiers on `2g`/`slow-2g`.

### Implementation Checklist

1. Expose utility `selectImageSource({ baseUrl, viewport, dpr, network })` returning the optimal suffix.
2. Extend configurator loader to:
   - Preload low-tier assets.
   - Swap to higher tier once image enters viewport (`IntersectionObserver`).
   - Cache chosen tier in session storage for subsequent renders.
3. Include `<link rel="preload">` hints for hero assets on desktop.
4. Honour `prefers-reduced-data` media query, locking to `@1x`.

### Lazy Loading & Intersection

- Each layer registers with a shared observer.
- Observer threshold `0.25` to begin fetching before element fully visible.
- Use requestIdleCallback to schedule tier recalculation after layout changes.

### Testing & Monitoring

- Lighthouse runs at three viewport sizes with `npm run perf:configurator`.
- Capture WebPageTest scripts (mobile vs desktop) and compare total transfer size.
- Log chosen tier per session via telemetry for future tuning.

### CDN Considerations

- All assets served via CDN with `Cache-Control: public, max-age=604800`.
- Query parameter `?quality=low|medium|high` maps to underlying filename.
- Provide fallback to `.png` if AVIF/WebP unsupported (validate using feature detection).

### Future Enhancements

- Integrate adaptive streaming for video layers.
- Feed historical tier metrics into ML-based predictor for returning users.
- Evaluate Web Workers for asset decoding to keep main thread responsive.


