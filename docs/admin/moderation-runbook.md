# Moderation runbook

## Review queue

1. Open `/builder/Atalmoretti`.
2. Review pending submissions, flagged submissions, open component reports, and takedowns.
3. Check attestation fields:
   - IP/copyright attestation accepted.
   - License grant accepted.
   - Attestation version present.
4. Check code and preview:
   - no obvious copied brand/logo,
   - no suspicious network/storage/cookie behavior,
   - no disallowed imports,
   - no hate/harassment/illegal content,
   - no misleading company/person impersonation.
5. Approve, reject, flag, archive, or restore with a clear reason.
6. Confirm audit log and statement-of-reasons metadata were written.

## Reports

- Copyright, malicious, or safety reports should hide/flag active components while reviewed.
- Repeated reports against the same author should trigger account review.
- Reject reports only with a written reason.

## Takedowns

- Treat takedown requests as legal-sensitive.
- Preserve request, evidence, affected component/submission, action, reason, and handler.
- If accepted, archive the component/template and keep evidence for the legal retention period.

## Never do this

- Do not approve a community submission only because the quality score is high.
- Do not edit credit balances directly from the DB.
- Do not restore flagged content without reading the report/takedown history.
