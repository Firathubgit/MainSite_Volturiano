---
title: How to Enable 3D for a Model
description: Turn on the optional R3F path for a specific vehicle.
status: reference
---

Checklist
- Set VITE_ENABLE_R3F_MODE=true in the environment (or per-route flag).
- Upload GLB + textures; add entries in the 3D section of the model manifest.
- Define paint material parameters and optional LODs.
- Add environment HDRIs.
- Smoke test: frame rate, memory, visual parity with 2D.

