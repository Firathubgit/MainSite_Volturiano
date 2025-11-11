title: Volturiano Roadmap
description: Phased plan to reach MVP and beyond.
status: active

Phase 0 — Foundations (in progress)
- Lock project conventions (.cursor/rules, docs) and env scaffolding.
- Harden React/Vite shell, CSS Modules, i18next bootstrapping, Zustand stores.
- Supabase project with migrations, RLS baseline, public Storage buckets.
- 2D viewer spike (single model, limited palette) with hover prefetch.

Phase 1 — Configurator MVP
- Full option taxonomy UI, compatibility feedback, price calculator.
- Auth foundation: email/password sign-up, sign-in, verification flow, Supabase session wiring.
- Garage MVP: save/load configs, generate config_code links, merge guest configs on first login.
- Investor microsite entry + breadcrumb navigation baseline.
- Accessibility + performance budgets enforced (axe + Lighthouse CI).

Phase 2 — Immersion Layer
- Enable optional R3F mode with HDRI presets, camera choreography, LOD.
- VOLTURIANO WORLD subsection showcasing connectivity & ownership UI.
- Sound design system (clicks, engine start) gated by user opt-in.
- Profile enhancements: user preferences (locale, sound, theme) stored in `profiles`; garage bulk actions; email notifications for saved configs.

Phase 3 — Commerce & Admin
- Stripe deposit flow (Edge Function, webhook reconciliation, orders table).
- Admin console: asset manifest tooling, option CRUD scripts, role management.
- MFA/Passkey rollout (as supported), social login option toggles, audit trail dashboards.
- Observability pass (Sentry, Supabase logs dashboards, perf sampling).

Phase 4 — Extended Experience (exploratory)
- Interior panorama / interactive cockpit, multi-angle detail shots.
- AR handoff (WebXR/QR), collaboration & share enhancements.
- Advanced analytics/personalization loops and CRM integration hooks.

