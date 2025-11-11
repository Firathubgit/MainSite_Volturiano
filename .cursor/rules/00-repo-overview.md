---
title: Volturiano Repository Overview
description: High-level purpose and persistent context for Cursor.
owners: [volturiano]
status: active
apply_to: repo
labels: [overview, context, cursor]
---

Purpose
- Build a premium, high-performance car brand website and configurator for VOLTURIANO using React + Vite, R3F (Three.js), Supabase (Auth/DB/Storage/Edge), and Stripe (payments/deposits). No TypeScript; JavaScript + JSDoc where useful.

Core Principles
- Commission-first UX; immersive visuals; dual visualization engine (2D layered images + optional real-time 3D).
- Modular, data-driven configuration via Supabase; strict RLS security; serverless functions for secrets.
- Internationalization from day one; animation-first UI; accessibility, performance, and responsiveness.
- Accounts & personalization: Supabase Auth (email/password + future OAuth), user profiles, garage, and admin role baked into schema.
- Reference: `docs/README.md` for entry points into deeper documentation.

Why this stack (context)
- React/Vite keeps the app lean and fast to iterate; R3F unlocks high-fidelity 3D without leaving React’s mental model; Supabase consolidates auth, DB, storage, and edge logic to reduce glue code and centralize security; Stripe provides enterprise-grade payments and webhooks.

Non-functional priorities
- Perceived performance (instant feedback), reliability (idempotent webhooks and DB rules), and maintainability (feature-sliced code, manifest-driven assets) take precedence over adding new dependencies.

Top-Level Work Areas (planned)
- Frontend app (React/Vite), 3D assets (glTF/HDRI), Supabase schema/migrations, Edge Functions (Stripe, utilities), Docs and checklists.

Use of This Ruleset
- Keep these rules concise. Link to deeper docs in /docs. Prefer conventions here over explanations.

