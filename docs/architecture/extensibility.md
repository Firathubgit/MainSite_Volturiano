---
title: Extensibility & Module Boundaries
description: How to scale features, swap implementations, and keep tech optional.
status: active
---

Patterns
- Feature slices under src/features with public index.js exporting the minimal API.
- Viewers implement a common interface so 2D/3D can be swapped or co-exist.
- Feature flags via env: ENABLE_R3F_MODE, ENABLE_AR, ENABLE_WORLD, ENABLE_INVEST.
- Data manifests (see ../data/asset-manifest.md) drive viewers; no hardcoded paths.

Optional Areas
- AI helper, investor site, WORLD can be mounted conditionally by route config.
- Monorepo-ready: promote shared-ui and edge-fns to packages/ if growth demands.

