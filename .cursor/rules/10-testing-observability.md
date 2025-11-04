---
title: Testing & Observability
description: Minimum quality bar and telemetry practices.
status: active
apply_to: repo
labels: [testing, observability]
---

Testing
- Unit tests for pure utilities; component tests for critical UI (viewer shell, pricing).
- Visual regression for key pages (future). Manual cross-browser matrix maintained in /docs/quality/testing.md.

Observability
- Frontend error tracking (e.g., Sentry) optional toggle. Edge Functions log to Supabase.
- Performance budgets enforced via CI (Lighthouse). FPS sampling for 3D actions in dev.

Context
- We alert on regressions that harm experience (LCP/CLS, viewer FPS) rather than micro metrics. Logs from webhooks are retained to audit payment flow reliability.

