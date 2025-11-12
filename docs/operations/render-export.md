## Hero Render Export Workflow

Exports high-resolution hero shots from the 3D configurator for marketing and customer downloads.

### Goals

- Support multi-resolution output (4K+, portrait, square).
- Provide watermark integration (see `docs/operations/render-watermarking.md`).
- Offload heavy rendering to server when client performance insufficient.

### Pipeline

1. **Client request**
   - User opens export dialog.
   - Selects resolution preset (4K landscape, social square, poster portrait).
   - Chooses background (HDRI) and watermark toggle.
   - Client gathers current configuration state and scenario.
2. **Job submission**
   - POST to Supabase Edge function `functions/render-export/index.ts`.
   - Payload includes configuration JSON, camera settings, lighting preset, watermark preference.
3. **Server render**
   - Headless renderer (Three.js + headless-gl) or Puppeteer hitting internal render page.
   - Uses multi-pass tiling for resolutions >8K.
   - Generates PNG (and optional WebP) stored in `renders` bucket under `/exports/{jobId}.png`.
4. **Notification**
   - Edge function inserts job metadata into `render_export_jobs` table with status `processing -> completed`.
   - Client polls job status or subscribes to realtime updates.
5. **Delivery**
   - Client presents download link (signed URL with short expiry).
   - Analytics event logged for export usage.

### Client Fallback

- If Edge function unavailable, allow local render using `renderer.domElement.toDataURL` with supersampling (render at 2× requested resolution then downscale).
- Warn users about GPU load.

### Supabase Schema

- `render_export_jobs`
  - `id uuid`
  - `owner_id uuid`
  - `config_payload jsonb`
  - `resolution text`
  - `status text`
  - `output_url text`
  - `created_at timestamptz`
  - `completed_at timestamptz`

### Security

- Verify ownership via `auth.uid()` before allowing download.
- Signed URLs expire after 24 hours.
- Optionally add rate limiting (max 5 exports per hour per user).

### TODO

- Evaluate GPU cloud rendering service for faster turnaround.
- Provide queue UI showing estimated completion time.
- Add batch export capability for marketing team (service role only).


