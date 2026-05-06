# GitHub CI Secrets Checklist

The CI workflow intentionally uses placeholder secret names. Add these in GitHub before making the launch-safety workflow a required check.

## Required for build and smoke tests
- `VITE_BUILDER_SUPABASE_URL`
- `VITE_BUILDER_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CORS_ORIGIN` if CI builds against a deploy preview instead of local defaults

## Required for staging smoke execution
- `STAGING_BASE_URL`
- `STAGING_USER_EMAIL`
- `STAGING_USER_PASSWORD`
- `STAGING_SECOND_USER_EMAIL`
- `STAGING_SECOND_USER_PASSWORD`
- `STAGING_ADMIN_EMAIL`
- `STAGING_ADMIN_PASSWORD`

## Optional for backup execution
- `SUPABASE_DB_URL`
- `SUPABASE_STORAGE_RCLONE_REMOTE`
- `SUPABASE_STORAGE_BACKUP_BUCKETS`

## Controls
- Store production and staging secrets separately.
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever copied outside a secret manager.
- Do not expose service role keys as `VITE_*` variables.
- Keep Stripe webhook secrets environment-specific; staging and production should not share the same endpoint secret.
