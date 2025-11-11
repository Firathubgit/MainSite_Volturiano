---
title: Planned Folder Layout
description: Target layout to keep code modular and scalable.
status: active
---

Current Layout (web/)
- app/ — top-level shell, providers, layout.
- components/ — shared presentation components (migrate toward feature slices).
- pages/ — route-level components (bridge while features are modularized).
- viewers/ — `two-d/` and `three-d/` implementations behind a shared contract.
- stores/ — Zustand stores (config, ui, user).
- i18n/ — locale JSON namespaces.
- lib/ — Supabase client, utilities.
- styles/ — reset, variables, base, utilities.

Target Layout (incremental refactor)
  - src/
  - app/ (router, providers, layout primitives)
  - features/
    - configurator/ (UI, hooks, manifests, tests)
    - models/
    - account/
    - world/
    - ai/
  - shared/
    - components/
    - hooks/
    - utils/
    - viewers/
    - two-d/
    - three-d/
    - styles/
  - i18n/
  - lib/

Backend & Ops
- supabase/
  - migrations/ — SQL files generated via Supabase CLI.
  - functions/ — Edge Functions (Stripe, admin, utilities).
- scripts/ — automation (asset validation, cache purge).

Notes
- Large binary assets stay out of git; track via docs/data manifests and store in Supabase Storage.
- Feature-first organization aligns code ownership with business domains and keeps optional modules (World, AI, Investor) pluggable.

