---
title: Asset Manifest Schema
description: JSON contracts to drive 2D and 3D viewers.
status: active
---

2D Layers (per model)
{
  "modelId": "temerario",
  "angles": ["front-3q", "side", "rear-3q"],
  "layers": [
    { "id": "body", "variants": { "nero": ".../body/nero/front-3q.webp" } },
    { "id": "wheels", "variants": { "forged-21": ".../wheels/forged-21/front-3q.webp" } },
    { "id": "calipers", "variants": { "red": ".../calipers/red/front-3q.webp" } }
  ]
}

3D Assets (per model)
{
  "modelId": "temerario",
  "glb": ".../models/temerario.glb",
  "materials": {
    "paint": { "nero": { "baseColor": "#111", "clearcoat": 1.0 } }
  },
  "env": ["studio.hdr", "city.hdr"]
}

Notes
- Use immutable URLs with content hashes; store manifests in repo; assets in Storage.
- Client prefetches currently hovered variants using entries from the manifest only.

