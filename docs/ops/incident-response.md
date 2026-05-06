# Incident response

## Severity

- Sev 1: confirmed or likely personal data exposure, cross-user access, payment corruption, destructive data loss, or active abuse of infrastructure.
- Sev 2: failed moderation/takedown, broken billing fulfillment, admin access issue, or major publish outage without confirmed data exposure.
- Sev 3: degraded feature, isolated failed job, non-sensitive broken workflow.

## First 30 minutes

1. Freeze deploys.
2. Capture affected time window, routes, request IDs, user IDs, project IDs, and Stripe event IDs.
3. Preserve logs, `audit_logs`, `stripe_webhook_events`, `gdpr_requests`, and relevant storage manifests.
4. Disable the risky route or feature flag if containment is needed.
5. Take a fresh DB backup and storage manifest before destructive repair.

## Privacy incident trigger

If personal data may be exposed, altered, lost, or accessed by the wrong user, start a privacy incident review immediately. Record:

- when Volturiano became aware,
- what categories of data are involved,
- approximate affected users,
- likely consequences,
- containment steps,
- whether notification to authority/users is needed.

## Recovery

- Prefer restore-to-new/staging verification before touching production.
- Replay Stripe events only through idempotent webhook logic.
- Do not manually edit credit balances without audit evidence.
- Patch tests to reproduce the root cause before closing Sev 1 or Sev 2.

## Communications

- Internal owner: Firat Kaya / Volturiano.
- Support/security contact: contact@volturiano.com.
- Customer message should state what happened, affected scope, what was fixed, and what the user should do.
