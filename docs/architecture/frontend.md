---
title: Frontend Architecture
description: React/Vite app structure and visualization engine.
status: draft
---

App Shell
- React Router, Suspense boundaries, providers (i18n, stores), error boundary.

State
- Zustand global stores: configStore (selected options, price), userStore (session), uiStore (toggles, sound, reduced-motion).

Context
- Zustand chosen for minimal boilerplate and fine-grained subscriptions which is important when many independent UI parts react to configuration changes.

Visualization
- 2D layered image viewer (default): stacks transparent images per angle/part; prefetch on-hover; fade transitions.
- 3D viewer (optional): R3F scene with HDRI, soft/contact shadows, car-paint material, LOD. Demand frameloop.

Styling
- CSS Modules + PostCSS; global styles in /web/src/styles (reset.css, variables.css, base.css, utilities.css). Component styles colocated via *.module.css.

Rationale
- CSS Modules preserve plain CSS ergonomics while preventing global leakage and supporting sub-brand themes via variables.

Animation & Sound
- Framer Motion for UI; respectful audio cues gated behind user interaction and mute toggle.

Accessibility
- Keyboardable controls; reduced-motion; alt text from i18n; ARIA on tabs/accordions.

