---
title: Security & Environment Policies
description: Minimum security baseline for auth, data, secrets, and compliance.
status: active
apply_to: repo
labels: [security, env, privacy]
---

Secrets & Env
- Never commit secrets. Use .env (local) and platform env vars (staging/prod).
- Client only uses Supabase anon key; service role keys live in Edge Functions.

Auth & Authorization
- Supabase Auth for accounts; one admin (role claim) with guarded UI and RPC.
- RLS enabled on all user data tables (e.g., user_configurations). Policies whitelist owner access; admin via role.

Payments
- Stripe interactions only in Edge Functions. Webhook verifies signature and updates orders atomically.

Storage & CDN
- Public assets: read-only buckets. Private assets: signed URLs with short TTL.

Headers & App Hardening
- Use HTTPS only. Add CSP, Referrer-Policy, Permissions-Policy. Sanitize user inputs.

Context
- RLS keeps user data access enforced at the database layer, not just in UI. CSP reduces XSS risk in a rich, animated UI that loads heavy media and 3D assets.

Compliance & Data
- Respect user locale and privacy; optional analytics must be anonymized and documented.

