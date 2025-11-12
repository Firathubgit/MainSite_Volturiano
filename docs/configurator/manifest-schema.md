## Configurator 2D Manifest Schema

The manifest defines every asset, dependency, and variant rendered inside the 2D configurator. It extends the existing data references in `docs/data/asset-manifest.md` and aligns with style guidance in `.cursor/rules/09-style-system.md`.

### Top-Level Structure

```json
{
  "schemaVersion": 1,
  "id": "tornado-gt-launch",
  "vehicleModel": "tornado-gt",
  "localeBundle": "configurator.tornadoGT",
  "layers": [],
  "variants": [],
  "metadata": {}
}
```

| Field | Description |
| --- | --- |
| `schemaVersion` | Integer incremented whenever schema has a breaking change; used for client migrations. |
| `id` | Unique slug for the manifest. |
| `vehicleModel` | Matches `vehicles.slug` in Supabase (`supabase/sql/platform_schema.sql`). |
| `localeBundle` | Namespace for localized strings under `web/src/i18n`. |
| `layers` | Array describing ordered render layers. |
| `variants` | Array of variant definitions controlling available configurations. |
| `metadata` | Open container for presets (lighting, parallax weights, AR assets). |

### Layer Definition

```json
{
  "id": "body",
  "type": "image",
  "zIndex": 10,
  "dependencies": ["base"],
  "assets": {
    "default": "https://cdn.volturiano.com/configurator/tornado-gt/body.png",
    "winter-pack": "https://cdn.volturiano.com/configurator/tornado-gt/body_winter.png"
  },
  "parallaxDepth": 0.2,
  "dprSources": {
    "1x": "…/body@1x.png",
    "2x": "…/body@2x.png"
  }
}
```

- **`dependencies`** ensure ordering / exclusivity (used by dependency matrix in editor).
- **`assets`** map variant keys to URLs.
- **`parallaxDepth`** drives camera movement offset (see `docs/ux/motion.md`).
- **`dprSources`** supports adaptive image loading.

Layer `type` can be `image`, `video`, `mask`, or `overlay`. Additional metadata such as `blendMode`, `transformOrigin`, and `visibilityRules` allow advanced behaviors.

### Variant Definition

```json
{
  "key": "winter-pack",
  "label": "configurator.variants.winterPack",
  "category": "package",
  "dependencies": ["wheel_winter", "paint_ice_silver"],
  "incompatibilities": ["performance_pack"],
  "default": false
}
```

- `dependencies`: required options or layers.
- `incompatibilities`: mutually exclusive variants.
- `label`: localized copy key.
- `category`: used for filtering in UI.

### Localization

- All manifest-driven copy must reference translation keys.
- Add entries under `web/src/i18n/en/configurator.json`, `sv/configurator.json`, etc.

### Persistence & Versioning

- Manifests are stored in Supabase table `config_2d_manifests` (see `supabase/sql/configurator_2d_schema.sql`).
- Editor writes drafts; publishing toggles `status` to `published` and logs `version`.
- Clients cache manifests and run migrations when `schemaVersion` or `version` changes.

### Draft Workflow

1. Author manifest JSON in editor UI.
2. Validate against schema (Zod definition recommended).
3. Save as draft (`status = 'draft'`).
4. Publish, generating a new version entry and optionally notifying subscribers via `variant_inventory` feed.

### Related Docs

- `docs/data/compatibility-rules.md` — base rule system reused by manifests.
- `docs/performance/configurator-image-scaling.md` — describes DPR source usage.
- `docs/operations/render-watermarking.md` — references manifest metadata for watermark overlay placement.


