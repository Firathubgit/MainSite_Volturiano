# Migration ledger

This file tracks launch-hardening SQL that must exist in the canonical Supabase migration chain before production release.

## Canonical Supabase migrations

| Order | File | Purpose |
|---|---|---|
| 0001 | `supabase/migrations/20260503_0001_core_security_rls.sql` | Core RLS, ownership policies, public profile view |
| 0002 | `supabase/migrations/20260503_0002_agent_audit_retention.sql` | Audit logs and retention columns |
| 0003 | `supabase/migrations/20260503_0003_stripe_event_ledger_refunds.sql` | Stripe webhook ledger and refund requests |
| 0004 | `supabase/migrations/20260503_0004_community_review_and_takedowns.sql` | Community review, reports, takedowns |
| 0005 | `supabase/migrations/20260503_0005_gdpr_requests_and_consents.sql` | Consent events and GDPR requests |

## Release rule

Do not deploy a backend that depends on any table, column, function, or policy above until the corresponding migration has been applied in staging and production.

## Verification

- Confirm the migration file exists in `supabase/migrations`.
- Confirm the same SQL has been applied in the Supabase dashboard or via CLI.
- Run staging smoke checks for auth isolation, Stripe idempotency, pending community review, and account export/delete.
- Store the migration date, Supabase project, operator, and result in the deployment note.
