# Staging Smoke

This is the real-environment launch rehearsal. Run it after migrations and before production deploy.

## Accounts
- User A: normal customer account.
- User B: separate normal customer account.
- Admin: account with `profiles.admin_role = true`.

## Required checks
- User A can sign up or sign in with password and consent is logged.
- OAuth and magic-link paths require Terms/Privacy acceptance before entering the builder.
- User A cannot read, update, snapshot or publish User B's project.
- User A can submit a community component and it remains `pending_review`.
- Admin can approve, reject and flag submissions and the action creates audit evidence.
- Component catalog and AI selection never expose pending, flagged or rejected content.
- Stripe duplicate webhook replay does not double-grant credits.
- Refund request creates a trackable request row.
- Account export contains only User A data.
- Account delete creates `gdpr_requests` and audit evidence while retaining/anonymizing protected financial ledger rows.
- Published site upload and preview storage objects are included in backup manifests.

## Evidence to keep
- CI run link.
- Migration version list.
- Stripe test event ids.
- Admin moderation audit row ids.
- Export/delete request ids.
- Restore drill timestamp and target environment.
