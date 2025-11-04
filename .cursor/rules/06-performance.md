---
title: Performance, Assets & 3D
description: Rules for speed, lazy-loading, and asset handling.
status: active
apply_to: repo
labels: [performance, assets, 3d]
---

General
- Ship minimal above-the-fold; defer heavy code via route-level code splitting.
- Use long-cache hashed filenames; immutable CDN caching.

2D Primary Mode
- Layered transparent images per angle/part; serve WebP/AVIF when possible.
- Preload next-likely frames; prefetch swatch on-hover for instant color swap.

3D Optional Mode (R3F)
- Load GLB via Suspense; set frameloop="demand"; use LOD with drei <Detailed>.
- HDRI for IBL; contact/soft shadows; compress textures (Basis/ktx2) and meshes (Draco).

Audio & Media
- Lazy-load audio; respect prefers-reduced-motion and mute by default.

Monitoring
- Track TTI, CLS, LCP, FPS for viewer interactions; block merges on regressions.

Context
- Prioritize perceived speed: instant UI feedback (optimistic UI, prefetch on-hover) consistently feels faster than raw bandwidth gains. Auto step down 3D quality on low-end devices; always allow a 2D fallback.

