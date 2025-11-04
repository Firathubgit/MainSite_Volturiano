---
title: Planned Folder Layout
description: Target layout to keep code modular and scalable.
status: draft
---

Top-level (planned)
- web/               # React + Vite app
  - public/
  - src/
    - app/           # shell, routing, providers, i18n init
    - components/    # shared UI
    - features/      # vertical slices (configurator, models, account, world, ai)
    - pages/         # route components (if using file-based router, map accordingly)
    - stores/        # Zustand stores (config, user, ui)
    - viewers/
      - two-d/       # layered image viewer
      - three-d/     # R3F scene, materials, shaders
    - i18n/          # locale files (namespaces per feature)
    - lib/           # api clients, util helpers
    - styles/
- supabase/
  - migrations/      # SQL migrations
  - functions/       # Edge Functions (stripe, admin tasks)
- docs/              # you are here
- assets/            # small dev assets; production assets -> Supabase Storage

Notes
- Keep feature-first structure. Configurator logic and UI live under features/configurator.
- Large binaries live in Storage; reference via URLs/manifests committed to the repo.

Context
- Feature-first layout mirrors how users experience the product and simplifies code ownership. Storing only manifests in git keeps the repo small while enabling atomic asset updates via CDN.

