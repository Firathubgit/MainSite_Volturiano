---
title: Environment Variables
description: Minimal set to boot the stack across environments.
status: active
---

Client (public)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_BUILDER_SUPABASE_URL
- VITE_BUILDER_SUPABASE_ANON_KEY
- VITE_ENABLE_R3F_MODE (see feature flags)
- VITE_ENABLE_AI_HELPER, VITE_ENABLE_WORLD, VITE_ENABLE_INVEST, VITE_ENABLE_AR

Server-only
- NODE_ENV
- PORT
- CORS_ORIGIN
- JSON_BODY_LIMIT
- LARGE_JSON_BODY_LIMIT
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- ENABLE_COMMUNITY_AUTO_SCREENSHOTS
- CHROMIUM_NO_SANDBOX
- SCREENSHOT_ALLOWED_HOSTS

Backup and restore
- SUPABASE_DB_URL
- LOCAL_RESTORE_DB_URL
- SUPABASE_STORAGE_RCLONE_REMOTE
- SUPABASE_STORAGE_BACKUP_BUCKETS

Notes
- Prefix client vars with VITE_ to be exposed to the app.
- Never expose service role keys client-side.
- Production must set `CORS_ORIGIN`; the backend fails closed when it is missing.
- Keep staging and production Stripe webhook secrets separate.
- See `docs/env/ci-secrets.md` for GitHub Actions placeholders.

