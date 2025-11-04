---
title: System Architecture & Stack
description: Source-of-truth summary of the tech stack and module boundaries.
status: active
apply_to: repo
labels: [architecture, stack, boundaries]
---

Stack
- Frontend: React 18 + Vite, JavaScript (no TS), React Router, Zustand (state), Framer Motion (UI), React Three Fiber + Drei (3D), i18next (i18n), CSS Modules + PostCSS (no Tailwind).
- Visualization: Dual-mode — 2D layered images (primary) and optional real-time 3D (R3F) with HDRI lighting and compressed GLB assets.
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions). Stripe for payments/deposits via Edge Functions only.
- Content/Docs: /docs in-repo; assets in Supabase Storage (public read where safe).

Core Modules (planned)
- app-shell: routing, layout, error boundaries, i18n loader, theme.
- features/models: model range, carousel, 2D/3D viewers, performance stats animations.
- features/configurator: configuration state, price calc, compatibility rules client, save/share.
- features/account: auth flows, garage (saved builds), admin (single admin) gating.
- features/world: Volturiano World experiences (connectivity/ownership UI).
- features/ai: on-site AI helper (FAQ/preguided prompts) with guardrails.
- features/invest: discreet investor/pitch deck section.

Data Contract (Supabase)
- vehicles, option_groups, options, option_values, materials, compatibility_rules, user_configurations (JSONB), orders.
- RLS: user_configurations only accessible by owner; admin writes via role claims.

Context
- Dual engine rationale: 2D delivers photo-realism and universal device support; 3D is opt-in for immersion, AR/VR readiness, and cinematic moments.
- DB as source of truth: compatibility_rules in SQL avoids brittle client logic and allows business updates without redeploying the app.

Performance
- Code-split by route and heavy features. Lazy-load 3D; demand-driven frameloop. Image prefetch on-hover for swatches. CDN delivery from Supabase Storage.

Non-Goals (for now)
- TypeScript, server-rendering, multi-tenant brand support. Keep extensible but out-of-scope initially.

