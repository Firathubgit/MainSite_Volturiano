---
title: Architecture Overview
description: High-level system design for the Volturiano site & configurator.
status: active
---

Layers
- Experience (React + Vite): Single-page app with route-level code splitting, Framer Motion choreography, i18next, and feature-flagged mounts (World, Investor, AI).
- Visualization: Dual engine — 2D layered imagery as the default, optional real-time R3F scene with HDRI lighting, custom car-paint shader, and demand-driven render loop.
- Data & Services: Supabase (Postgres, Auth, Storage, Edge Functions) as the system of record; Stripe for deposits/payments invoked exclusively from Edge Functions.
- Delivery: Supabase Storage CDN for images, models, and HDRIs; future-ready to swap to a DAM without changing clients.

Data Backbone
- Core tables: vehicles, option_groups, options, option_values, materials, compatibility_rules, user_configurations, orders.
- Compatibility rules and pricing deltas live in SQL so UI stays declarative and admin updates do not require redeploys.
- Asset manifests (docs/data/asset-manifest.md) reference Storage keys and drive both viewers.

Integration Flows
- Configure → Save: Client reads catalog via Supabase, enforces compatibility in UI, and persists selections through user_configurations with RLS.
- Configure → Pay Deposit: Edge Function loads configuration, calculates totals, creates Stripe checkout session, and persists orders on webhook confirmation.
- Assets: Build references Storage URLs; editors upload via Supabase dashboard or CLI and update manifests in git.

Environment & Deployment
- Local via Supabase CLI; staging and production projects mirror schema using migrations in supabase/migrations (to be added alongside backend setup).
- Edge Functions deployed with code; secrets injected per environment. CDN caching managed with hashed filenames and cache invalidation scripts.

Non-Negotiables
- RLS enforced on every user-owned table; service role keys never leave Edge Functions.
- Instant feedback culture: prefetch swatches, optimistic UI, 60fps animation budget, graceful degrade to 2D on low capability devices.
- Docs, rules, and checklists in /docs and .cursor/rules keep this context evergreen for Cursor and contributors.
