---
title: Security & Environment Policies
description: Practical guidance for secrets, auth, RLS, Stripe and storage.
status: active
---

Secrets
- .env.local for dev only; never commit. Edge Functions hold service keys.

Auth
- Supabase Auth; JWT in memory; refresh via SDK; strict logout clears stores.

RLS
- Enable by default. user_configurations limited to owner; admin actions via RPC with auth.role = 'admin'.

Payments
- Only through Edge: create-checkout-session and stripe-webhook. Verify signatures; update orders table; never trust client totals.

Storage
- Public read buckets for non-sensitive media. Signed URLs for private downloads.

Headers
- Enforce CSP, COOP/COEP when using advanced APIs; HSTS on prod.

