## Render Watermarking Workflow

Adds a Volturiano watermark to configurator renders while preserving high-fidelity assets for marketing use.

### Goals

- Protect renders shared outside the platform without degrading art director previews.
- Support both instant preview and high-res export pipelines.
- Maintain accessibility: watermark must not obscure critical design features.

### Pipeline Overview

1. **Client preview**  
   - Canvas overlay applies 60% opacity logo bottom-right.  
   - Triggered when user toggles “Watermark” inside configurator settings.  
   - Respects `prefers-reduced-motion` (no animation).
2. **Edge function (planned)**  
   - `functions/watermark-render/index.ts`  
   - Accepts render URL, watermark asset, position, padding.  
   - Outputs watermarked PNG stored in `renders` bucket with signed URL.
3. **Config**  
   - Manifest metadata optional field `watermark`: `{ "position": "bottom-right", "padding": 48 }`.
4. **Accessibility**  
   - Minimum contrast ratio 3:1 vs backdrop.  
   - Provide alt text description when sharing.

### Implementation Steps

1. Add settings toggle storing preference in Supabase profile (`profile.preferences.watermark`).
2. Implement canvas overlay helper `overlayWatermark(canvas, options)`.
3. Create Edge function skeleton (Cloudflare/Supabase Functions) with Sharp image processing.
4. Update storage rules to allow Edge function write access to `renders` bucket.
5. Document CLI usage for watermark function in README once implemented.

### Dependencies

- Supabase storage bucket `renders` (see `supabase/sql/platform_schema.sql`).
- Manifest schema `metadata.watermark` (see `docs/configurator/manifest-schema.md`).

### Open Questions

- Should marketing team have a bypass token for raw renders?  
- Do we need multiple watermark styles (light/dark) depending on render background?


