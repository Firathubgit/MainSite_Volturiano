## Garage Configuration Schema

### Overview
Each garage entry represents a saved configuration snapshot with optional version history. Payloads are stored as JSONB in `garage_items.config_payload` and validated against this schema.

```
{
  "schemaVersion": 1,
  "vehicle": {
    "model": "Tornado GT",
    "trim": "Launch Edition",
    "year": 2025,
    "vin": null
  },
  "options": {
    "exterior": [{ "id": "paint_orange_fury", "label": "Orange Fury", "price": 1800 }],
    "interior": [{ "id": "seat_carbon", "label": "Carbon Bucket Seats" }],
    "performance": [{ "id": "brakes_ceramic", "label": "Carbon Ceramic", "price": 6500 }]
  },
  "pricing": {
    "basePriceCents": 18000000,
    "optionsTotalCents": 830000,
    "discountCents": 0,
    "currency": "EUR"
  },
  "media": {
    "heroImage": "https://cdn.volturiano.com/configs/123/hero.png",
    "gallery": [
      { "type": "image", "url": ".../front.png" },
      { "type": "video", "url": ".../walkaround.mp4" }
    ]
  },
  "history": {
    "createdAt": "2025-11-11T12:34:56.000Z",
    "updatedAt": "2025-11-11T12:34:56.000Z",
    "source": "configurator",
    "configuratorType": "2d",
    "configuratorVersion": "1.0",
    "manifestId": "tornado-gt-launch",
    "notes": "Configured during Geneva teaser stream."
  },
  "metadata": {
    "goalTags": ["track", "concept"],
    "locale": "sv",
    "isPrototype": false,
    "relatedShowcaseId": null,
    "configurator": {
      "type": "2d",
      "manifestId": "tornado-gt-launch",
      "cameraAngle": "front-3q",
      "materialSettings": null,
      "environment": null,
      "renderSettings": {
        "quality": "high",
        "resolution": "1920x1080"
      }
    }
  }
}
```

### Key Requirements

- `schemaVersion`: incremented whenever structure evolves; used to run migrations client-side.
- `vehicle`: basic identity for the selected car; VIN remains `null` until ownership is confirmed.
- `options`: grouped arrays enabling diff-friendly comparisons and UI grouping.
- `pricing`: canonical cost data; totals are recomputed server-side via RPC when configurations change.
- `media`: optional assets to highlight saved states or user uploads.
- `history`: provenance and timestamps used to populate milestone timelines.
  - `history.configuratorType`: "2d" | "3d" | "hybrid" | null - Type of configurator used
  - `history.configuratorVersion`: Version of configurator system (e.g., "1.0")
  - `history.manifestId`: Manifest ID for 2D configurator (optional)
- `metadata.goalTags`: maps to entries in `garage_item_tags`.
- `metadata.configurator`: Configurator-specific metadata (optional):
  - `type`: "2d" | "3d" | "hybrid" - Configurator type
  - `manifestId`: String - Manifest ID for 2D configurator
  - `cameraAngle`: String - Camera angle for 2D ("front-3q", "side", "rear-3q", "rim")
  - `materialSettings`: Object - Material properties for 3D (metalness, roughness, envMapIntensity)
  - `environment`: String - HDRI environment name for 3D
  - `renderSettings`: Object - Render quality and resolution settings

### Version History

- `garage_versions.snapshot` stores the full payload.
- `garage_versions.diff_summary` captures array of `{ "path": "options.performance[0]", "from": null, "to": "brakes_ceramic" }` for quick UI diffing.
- Version numbers start at `1` when the item is created and increment sequentially.

### Validation

- Implement Zod schema in `web/src/lib/schema/garageConfigSchema.ts` mirroring this structure.
- Validation runs before save; invalid payloads should provide actionable error messages.

### References

- `garage_items.vehicle_model` duplicates the primary model string for indexed filtering.
- `garage_item_tags` aligns with `metadata.goalTags` to avoid desync.
- Milestones reference `garage_items.id` and can store pointers into `history`.


