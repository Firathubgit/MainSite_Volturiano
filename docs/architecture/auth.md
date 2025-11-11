---
title: Authentication & Account Architecture
description: Supabase-based identity, roles, and session lifecycle for Volturiano.
status: active
---

Objectives
- Provide a secure, future-ready account system that supports guest exploration, saved configurations, commerce, and admin operations.
- Leverage Supabase Auth for identity, enforce Row Level Security, and expose a consistent API to the React front end.
- Keep the experience premium: frictionless onboarding, localized copy, and data portability for customers.

Identity Model
- `auth.users`: Supabase-managed accounts (email/password, OAuth, magic link). `app_metadata.role` distinguishes `user` vs `admin`.
- `profiles` (custom table): stores display name, locale, avatar URL, marketing opt-in, notification preferences, created_at/updated_at. One-to-one with `auth.users`.
- Roles:
  - Guest: anonymous visitor using local storage for temporary configs. Prompt to create account when saving or booking.
  - User: verified account with access to personal garage, checkout, World portal personalization, and AI session history.
  - Admin: brand operator with elevated tooling (asset uploads, option management, order dashboards) gated via role claim.

Session Lifecycle
1. **Bootstrap**: `supabase.auth.getSession()` called on app load; hydrate `userStore`. If session exists, fetch profile and default garage data.
2. **State changes**: subscribe to `supabase.auth.onAuthStateChange` to react to sign-in/out, token refresh. Remove listener on unmount.
3. **Token refresh**: Supabase auto-refreshes JWT; use `supabase.auth.onAuthStateChange` event `TOKEN_REFRESHED` to update `userStore`.
4. **Sign-out**: call `supabase.auth.signOut({ scope: 'global' })`, clear local caches, return to public page.
5. **Expiration**: if session becomes invalid, show toast + modal; route guard redirects to `/login` retaining `redirectTo`.

Data Surfaces
- Personal Garage (`/garage`): lists `user_configurations` (name, updated_at, price). Actions: load in configurator, duplicate, rename, delete, share link.
- Saved Assets: optional interface to bookmark inspirational media stored in `saved_assets`.
- Orders: future section showing deposits, statuses, Stripe receipts.
- Preferences: manage locale, notification opt-in, marketing consent, two-factor enrollment (future).

RLS & Policies (summary)
- `profiles`: owner can `select` and `update`; admin can manage all. Public read optional via view exposing display name and locale for social features.
- `user_configurations`: owner full CRUD; admin access via `admin_get_configuration(uuid)` SECURITY DEFINER function.
- `saved_assets`: owner full CRUD. Optional sharing handled through share tokens rather than direct table access.
- `orders`: owner read; insert/update via Edge Functions (Stripe webhooks). Admin can query all for dashboards.
- `audit_logs`: insert via Edge Functions, select by admin only.

Edge Functions & RPC
- `create-session-link` (future): generates magic link or deep link for showroom events.
- `merge-configurations`: accepts local config payload, merges into authenticated user’s catalog, logs actions.
- `admin-get-configurations`: SECURITY DEFINER RPC to fetch user configs for support.
- All Edge Functions require service role keys and validate `session.user` before performing writes.

Frontend Implementation Roadmap
1. Build account feature slice with sign-in/up, forgot password, verification states, and error handling.
2. Implement `RequireAuth` wrapper and `useSession` hook to guard routes and components.
3. Persist guest configurations (localStorage) and merge post-auth via Supabase RPC.
4. Create Garage UI with optimistic updates and Supabase subscriptions (optional) for multi-device sync.
5. Layer analytics + security signals: track sign-in failures, prompt for stronger passwords, add MFA when Supabase enables passkeys.

Future Enhancements
- Social logins (Google, Apple) to streamline onboarding.
- Passkeys / WebAuthn when stable in Supabase Auth.
- Organization/team mode (multiple users per vehicle account) via additional tables and role claims.
- CRM integration: on account creation or configuration save, send lead to HubSpot/Salesforce with consent metadata.

