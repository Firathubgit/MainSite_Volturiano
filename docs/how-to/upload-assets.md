---
title: How to Upload Assets
description: Store and reference 2D/3D assets via Supabase Storage.
status: reference
---

Steps
- Prepare filenames with content hashes (e.g., wheels-forged21-front3q.ab12.webp).
- Upload to Storage buckets: images/, models/, hdri/.
- Set public read for images; restrict models if needed with signed URLs.
- Update manifest JSON with the exact URLs and commit the manifest.

Tips
- Prefer WebP/AVIF for 2D; GLB + Draco + KTX2 for 3D.
- Keep angle naming consistent across models.

