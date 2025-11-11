---
title: Workflow & Automation
description: How we work, branch, deploy, and manage data.
status: active
apply_to: repo
labels: [workflow, ci-cd, migrations]
---

Branches
- main (production), develop (staging), feature/*.

CI/CD
- Lint/build on PR. Ship to staging on develop, to prod on main. 
- Future: run Lighthouse CI for key routes and report regressions.

Supabase
- Use Supabase CLI locally. Keep declarative SQL migrations under /supabase/migrations. Never edit schema by hand in prod.
- Enable RLS by default; write policies before exposing tables to clients.
- Edge Functions: keep secrets server-side; Stripe, admin tasks, and auth merges (guest->user configs) run here.
- Update Auth settings via dashboard (email templates, redirect URLs) and version changes in `/docs/architecture/auth.md`.
- Reference: `docs/architecture/backend.md` for schema/policy details.

Context
- Branch strategy favors safe releases and preview environments. Declarative migrations keep schema in version control, enabling reproducible environments and easy rollbacks.

Releases
- Tag SemVer releases. Record notable changes in CHANGELOG.md.

Assets
- Store heavy 2D/3D assets in Supabase Storage with public read where safe; use cache-busting filenames and long-lived caching.
- Update docs/data manifests when assets change; run asset validation script before deploy (see roadmap Phase 3).

Quality Gates
- Accessibility checks (axe), bundle size budgets, frame-rate sanity during 3D interactions.
- Auth QA: test sign-up, verification, reset password, merge guest configs, and route guards on every release.

