---
title: Ultimate Car Configurator Checklist
description: Condensed implementation checklist for a premium configurator.
status: active
---

Experience
- Cinematic landing + model carousel; 3-mode subbrand selector (base/sport/luxury).
- Dual viewer: 2D layered primary; 3D R3F optional; interior view later.
- Instant visual updates (hover prefetch), performance stats animations, detail zoom.
- Sound design toggled on interaction; respects reduced-motion.
- Save/share configs; configuration code; PDF/image export (future).

Features
- Extensive options: paint, wheels, calipers, interiors, packages.
- Price summary in real-time; compatibility rules enforcement.
- VOLTURIANO WORLD showcase; investor micro-link.

- React + Vite, Zustand, Framer Motion, R3F/Drei, i18next, CSS Modules + PostCSS.
- Supabase (DB/Auth/Storage/Edge), Stripe via Edge.

Performance
- Route/code splitting; viewer lazy; on-hover prefetch; LOD; KTX2/Draco.
- CDN caching; hashed filenames; Lighthouse budgets.

Security
- RLS policies; secrets in Edge; Stripe webhook verification; signed URLs for private assets.

