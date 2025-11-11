---
title: Extensibility & Long-Term Scalability
description: Principles for appendable, future-proof source organization.
status: active
apply_to: repo
labels: [extensibility, scalability, plugins]
---

Principles
- Feature-sliced architecture under src/features with clear boundaries and public APIs.
- Data-driven viewers using manifest JSON (no hardcoded asset paths).
- Capability flags via env + feature flags (e.g., ENABLE_R3F_MODE, ENABLE_AR).
- Keep business rules in DB (compatibility_rules) not in UI when possible.
- Reference: `docs/architecture/folder-structure.md` for current vs target layout.

Pluggable Modules
- viewers: two-d and three-d are swappable implementations behind a common interface.
- ai-helper: isolated feature with its own data, prompts, and rate limits.
- world, investor: optional routes that can be mounted/unmounted by config.

Monorepo Option (future)
- If scale increases, promote to packages/: web, shared-ui, shared-config, edge-fns. Keep same contracts.

Context
- Manifest- and flag-driven behavior allows the admin to add models/options without code changes and lets us toggle premium experiences per environment or device capability.

