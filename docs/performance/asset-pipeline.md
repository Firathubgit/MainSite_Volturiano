---
title: Asset Pipeline & Performance
description: Source-of-truth for images, 3D models, audio and delivery.
status: active
---

2D Mode
- Primary rendering path. Store per-angle transparent layers per variant.
- Formats: WebP/AVIF preferred. Provide fallback (PNG) only if required.
- Prefetch: on-hover of swatches; preload next angles when idling.

3D Mode
- Model: glTF/GLB with Draco; textures KTX2 (Basis). Provide LOD levels.
- Lighting: HDRI; contact/soft shadows; optional cube-camera reflections.
- Rendering: frameloop=demand; pause when tab hidden; dispose unused geometries/materials.

Storage & Delivery
- Supabase Storage buckets with immutable caching; use hashed filenames.
- Keep manifest JSON mapping model/angle/options to asset URLs.

Build & Budgets
- JS initial < 200kb gzip target; viewer chunks lazy. Monitor Lighthouse/LCP.

