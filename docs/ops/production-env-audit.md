# Production Environment Audit

Use this before every public launch or major billing/community release.

## Railway / hosting
- Confirm production service uses production environment variables only.
- Confirm `NODE_ENV=production`.
- Confirm `CORS_ORIGIN` is set to the exact public app origin.
- Confirm deploy health checks point to the backend health endpoint.
- Confirm log retention is long enough for incidents but not used as permanent customer-data storage.

## Supabase
- Confirm latest canonical migrations are applied.
- Confirm RLS is enabled on profiles, projects, snapshots, published sites, community submissions, components, billing tables and GDPR tables.
- Confirm broad public profile select is removed.
- Confirm public buckets are intentionally public and private buckets are private.
- Confirm backups, PITR tier or scheduled dumps are enabled for the chosen plan.
- Confirm storage object backup process covers published sites, previews and community media.

## Stripe
- Confirm live webhook URL points to production backend.
- Confirm webhook signing secret matches production only.
- Confirm handled events include checkout, subscription renewal, refund and dispute events.
- Confirm Stripe customer portal, invoices/receipts, tax settings and refund policy match current launch scope.

## AI and sandbox providers
- Confirm each provider has a recorded DPA/terms link in `docs/vendors/evidence-index.md`.
- Confirm data retention assumptions in `docs/ai/governance-light.md`.
- Confirm community auto-render is disabled unless hardened sandbox execution is explicitly approved.

## Domains and public pages
- Confirm Terms, Privacy, AUP, DPA, Subprocessors, Refunds, Takedown, Security Contact and Customer Responsibilities pages are reachable.
- Confirm cookie banner links to `/builder/privacy`.
- Confirm public security/abuse contact is monitored.
