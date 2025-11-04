---
title: Environment Variables
description: Minimal set to boot the stack across environments.
status: active
---

Client (public)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_ENABLE_R3F_MODE (see feature flags)
- VITE_ENABLE_AI_HELPER, VITE_ENABLE_WORLD, VITE_ENABLE_INVEST, VITE_ENABLE_AR

Edge Functions (server-only)
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

Notes
- Prefix client vars with VITE_ to be exposed to the app. Never expose service role keys client-side.

