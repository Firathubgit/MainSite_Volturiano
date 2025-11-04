---
title: Architecture Overview
description: High-level system design for the Volturiano site & configurator.
status: draft
---

Layers
- Client (React + Vite): SPA with route-level code-splitting, i18n, Framer Motion.
- Visualization: Dual engine — 2D layered images (primary) and optional R3F 3D.
- Backend: Supabase (Postgres, Auth, Storage, Edge). Stripe via Edge Functions.
- CDN: Supabase Storage public buckets for heavy assets with immutable caching.

Key Data Entities
- vehicles, option_groups, options, option_values, materials, compatibility_rules, user_configurations, orders.

Security
- RLS on user tables; service operations only on the edge; Stripe webhooks verified.

Performance
- Lazy-load heavy features; prefetch image variants; demand-driven 3D rendering.

Context
- Jamstack + serverless reduces server maintenance and improves global performance. Using SQL for compatibility keeps the UI thin and makes future admin tooling simpler.

