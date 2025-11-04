---
title: Feature Flags
description: Runtime flags to toggle premium features safely.
status: active
apply_to: repo
labels: [flags, env]
---

Flags (env)
- ENABLE_R3F_MODE=true|false — enable 3D viewer routes and UI toggles.
- ENABLE_AR=true|false — show AR entry points (mobile QR handoff).
- ENABLE_WORLD=true|false — mount Volturiano World subsection.
- ENABLE_INVEST=true|false — show investor link and routes.
- ENABLE_AI_HELPER=true|false — mount AI concierge widget.

Context
- Flags let staging exercise premium flows without exposing them to production users before assets or performance are ready.

