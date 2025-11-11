---
title: Frontend Architecture
description: React/Vite app structure and visualization engine.
status: active
---

App Shell
- React Router drives routes (Start, Home, Models, Configurator, Investor, World).
- Providers mount in `app/App.jsx`: i18n, Zustand stores, feature flags, suspenseful data loaders, and global error boundary.
- Route modules lazy-load feature bundles; fallbacks show branded loading states.

State & Data Flow
- Zustand stores:
  - configStore: selected vehicle/options, pricing breakdown, compatibility status.
  - userStore: Supabase session, account profile, auth guards, feature entitlements.
  - uiStore: viewer mode, audio toggles, environment presets, reduced-motion flag.
- Supabase client lives in `web/src/lib/supabaseClient.js`; data hooks fetch catalogs and user configs with caching and optimistic updates.
- Feature slices (planned under `web/src/features`) expose hooks/components so pages remain thin.

Account Feature Slice
- Location: `src/features/account/` (planned). Exports routes (`Login`, `Signup`, `ForgotPassword`, `Garage`) and hooks (`useSession`, `useRequireAuth`).
- Forms: built with controlled inputs, shared validation helpers, i18n copy. Utilise Supabase `auth` methods for sign-in/up, magic link, password reset.
- Session Handling: upon app bootstrap, `supabase.auth.getSession()` hydrates `userStore`. Subscribe to `onAuthStateChange` to update session/profile and clean up listeners on unmount.
- Profile Fetch: after authentication, call RPC/view to fetch profile row plus saved configurations count; store in `userStore`.
- Local Merge Flow: when guest saves configuration, persist to local storage. On first authenticated session, run merge mutation (Edge Function) to upsert local configs into `user_configurations`.

Route Guards & Navigation
- Protected routes (e.g., `/configurator`, `/garage`, `/checkout`) wrap components in `RequireAuth` HOC that checks `userStore.session`. Redirect to login with intended path stored in state.
- `NavBar` displays auth-aware CTAs (e.g., "Sign in", "My Garage", avatar dropdown). Dropdown includes sign-out, language preference, profile.
- Investor/admin routes hidden unless `session.user.app_metadata.role === 'admin'`.

Visualization Engine
- 2D (default): `viewer2d` stacks transparent layers per angle/part, prefetches on hover, fades between states, and keeps a low-memory cache per device profile.
- 3D (flagged): `viewer3d` built with React Three Fiber + Drei, HDRI environment loader, custom car-paint shader, contact shadows, LOD swap via `<Detailed>`, frameloop="demand".
- Both viewers consume the same manifest-driven API, allowing seamless toggling and hybrid use (e.g., 2D exterior + 3D interior).

Styling & Theming
- CSS Modules + PostCSS pipeline; globals in `/web/src/styles/{reset,base,variables,utilities}.css`.
- Theme tokens under `:root` support base/sport/luxury palettes; data-theme attribute toggles.
- Motion choreographed with Framer Motion; long-form scroll scenes may opt into GSAP with isolation.

Internationalization & Content
- i18next with per-feature namespaces stored in `/web/src/i18n/<locale>/*.json`.
- Copy never hardcoded; components request namespaces via suspense to enable lazy translations.
- Locale detection respects browser preference and stored profile choice; fallback to English.

Accessibility & Quality
- Keyboard-first navigation, semantic regions, focus outlines, skip links.
- Prefers-reduced-motion short-circuits most animations and swaps to lightweight transitions.
- Audio feedback opt-in; volumes persist per session; ARIA labels on mode toggles and swatches.
- Auth forms follow WCAG: labelled inputs, error messaging tied to fields, password strength indicators, MFA prompts accessible via screen readers.
- Notify users of session expiry; provide toast + modal with countdown and extend option.

