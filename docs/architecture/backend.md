---
title: Backend (Supabase) Architecture
description: Schema, policies, and edge functions.
status: active
---

Schema (essentials)
- auth.users (Supabase managed) — stores account credentials, email verification, OAuth identities.
- profiles(id uuid pk -> auth.users, display_name, locale, avatar_url, preferences jsonb, created_at, updated_at).
- vehicles(id, name, base_price, description, performance_specs jsonb, default_angle_set, sort_order, hero_asset_key).
- option_groups(id, vehicle_id, slug, display_order, icon).
- options(id, group_id -> option_groups, name, ui_control_type, metadata jsonb).
- option_values(id, option_id -> options, name, price_delta, asset_key, material_id, is_default).
- materials(id, name, shader_preset, properties jsonb).
- compatibility_rules(id, rule_type enum('requires','incompatible'), primary_option_value_id, secondary_option_value_id, message).
- user_configurations(id, user_id -> auth.users, vehicle_id, name, selected_options jsonb, price_breakdown jsonb, config_code unique, thumbnail_asset_key, created_at, updated_at).
- saved_configs_view — optional public view exposing limited config metadata for share links.
- orders(id, user_id -> auth.users, configuration_id -> user_configurations, stripe_session_id, status, deposit_amount, metadata jsonb, created_at, updated_at).
- saved_assets(id, user_id -> auth.users, asset_key, label, metadata jsonb, created_at) — allows bookmarking media/moodboard items.
- audit_logs(id, actor_user_id -> auth.users, action, payload jsonb, created_at).

Policies & Roles
- Enable RLS immediately after table creation. Default deny.
- profiles: owner can select/update their row; admin can manage all; public can read limited fields via view if needed.
- user_configurations: `auth.uid() = user_id` for CRUD; admin bypass via SECURITY DEFINER RPC (`admin_get_configuration(uuid)`).
- saved_assets: read/write by owner; delete via owner/admin; used for interior moodboards or asset collections.
- orders readable by owner; insert/update only through signed Edge Functions; webhook uses service role.
- audit_logs selectable only by admin; inserts performed by Edge Functions or triggers.
- Service role credentials stay inside Edge Functions; never shipped to clients.

Edge Functions
- create-checkout-session: Validate ownership, compute totals, call Stripe, store pending order row, return `sessionId`.
- stripe-webhook: Verify signature, upsert order status (paid/cancelled), emit notifications (email/slack) via integration hook.
- session-sync (future): write account preference changes (locale, theme) server-side.
- admin-add-asset (future): Validate single admin, write manifests, trigger cache purge.
- All functions share typed payload contracts (JSDoc) and centralized error handler.

Storage & Assets
- Buckets: `images/` (public), `models/` (signed URL), `hdris/` (public, cached), `audio/` (public, with long cache).
- Upload via Supabase dashboard or CLI; record canonical path in docs/data/asset-manifest.md.
- Heavy assets versioned by filename hash to allow immutable caching.

Migrations & Tooling
- Manage schema with Supabase CLI (`supabase db push` / `migrations/`). Keep SQL checked into git.
- Seed scripts populate baseline catalog for local/staging (vehicles, option groups, defaults).
- Scripts run via package.json (e.g., `npm run db:seed`) to align frontend expectations.

Monitoring & Ops
- Enable Supabase logs for Edge Functions and DB slow queries.
- Stripe webhooks stored for replay; syncing script ensures we can rehydrate orders if webhook delivery fails.
- Scheduled task (Edge Function cron) can validate asset manifest vs Storage to catch missing files.
- Enable Auth log drain to monitor sign-in failures; set up alerts on excessive failed attempts per IP/user.

Auth Flow Summary
- Sign-up: user submits email/password; Supabase sends confirmation email. On verification, API creates profile row with defaults (locale from Accept-Language, marketing opt-in false).
- Sign-in: Supabase manages session JWT; frontend subscribes to `onAuthStateChange`. Session includes role claim (`app_metadata.role`) to differentiate admin vs user.
- Password reset: `supabase.auth.resetPasswordForEmail` triggers email; special route uses `updateUser` to set new password and optionally re-prompt MFA when enabled.
- Social login (Phase 3+): enable providers, capture `user_metadata` fields (name, avatar) to populate profile; ensure email verified before allowing deposits.

Data Residency & Compliance
- Users can request deletion: remove profile row, anonymize configurations/orders by replacing `user_id` with null and storing snapshot in audit log.
- Optional GDPR/CCPA automation: store consent timestamps in `profiles.preferences` and expose download via Edge Function.
