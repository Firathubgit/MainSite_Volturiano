# Volturiano Guarded Public MVP Release Gate

This checklist is the final launch gate for the AI website builder. It assumes the release is a guarded public MVP, not enterprise compliance certification.

## Code and migrations
- [ ] Canonical Supabase migrations `20260503_0001` through `20260503_0005` exist in `supabase/migrations`.
- [ ] Production and staging migration history matches `docs/ops/migration-ledger.md`.
- [ ] No community submission can become `active` without admin review.
- [ ] Admin route `/builder/Atalmoretti` is frontend guarded and backend guarded.
- [ ] Cookie consent, auth consent, export, delete, moderation, publish and billing actions create durable logs.

## Security
- [ ] Cross-user project, snapshot, publish and settings isolation is tested.
- [ ] Query-token auth is opt-in only where SSE/EventSource requires it.
- [ ] Backend security headers and request ids are live.
- [ ] Production CORS fails closed if `CORS_ORIGIN` is missing or wrong.
- [ ] Route body limits and risk-based rate limits are active.
- [ ] Community media uploads validate type and size before storage.
- [ ] Community screenshot rendering is disabled unless explicitly enabled with hardened sandbox settings.

## Privacy and legal drafts
- [ ] Terms v2 is live and references billing, refunds, credits, AI output, user content, takedowns and suspension.
- [ ] Privacy v2 is live and does not claim provider zero-retention unless contractually true.
- [ ] Acceptable Use Policy is live.
- [ ] Data Processing Addendum draft is live for customers who process end-customer data.
- [ ] Subprocessor page is live and reviewed against current vendors.
- [ ] Takedown/security contact page is live and sends reports into the moderation workflow.
- [ ] Customer responsibility guide is live.
- [ ] Manual accountant/lawyer review packet has been reviewed or explicitly accepted as pending risk.

## Billing and bookkeeping
- [ ] Stripe webhook event ledger receives duplicate event deliveries safely.
- [ ] Refund and dispute reversal rows are traceable.
- [ ] Refund policy matches the live Stripe/refund request behavior.
- [ ] Finance export helper can produce period evidence.
- [ ] Stripe balance transaction report, payout export, credit ledger, refund rows and Revolut statement are reconciled for a test period.

## Operations
- [ ] DB backup plan script runs.
- [ ] Storage manifest script runs.
- [ ] Storage object copy plan script runs.
- [ ] Restore drill has been completed against staging/local dev for DB and storage.
- [ ] Production env audit is complete.
- [ ] Vendor evidence folder has DPA/subprocessor/retention notes for every live vendor.
- [ ] Incident response owner and 72h privacy incident process are known.

## Quality
- [ ] `npm run test:ci` passes.
- [ ] Playwright launch smoke passes.
- [ ] Server syntax check passes.
- [ ] Frontend build passes in CI/Ubuntu.
- [ ] Windows/esbuild local build issue, if present, is documented and not blocking CI.
- [ ] Real staging smoke passes: signup via password/OAuth/magic link, component submission, admin approve/reject, publish, refund request, export/delete.

## Sign-off
- Owner:
- Date:
- Release commit:
- Known accepted risks:
