## Monitoring & Error Reporting

### Tooling
- Primary tool: Sentry (alternative providers similar).
- Separate DSNs/environments for `staging` and `production`.
- Respect `.cursor/rules/04-security.md` (avoid PII).

### Client Integration
- Create helper `web/src/lib/monitoring.js`.
- Initialize Sentry only when DSN present.
- Capture:
  - Uncaught exceptions.
  - Manual `captureException` with context (request ID, user id if consented).
- Tag events with environment (`import.meta.env.MODE`) and feature flags.

### Edge Functions
- Wrap handlers to capture exceptions (Sentry Node SDK or HTTP API).
- Include request ID and endpoint name.
- Forward structured logs (via `console.error`) for Supabase log dashboard.

### Privacy
- Strip PII from error metadata.
- Provide opt-out toggle for users in profile preferences (future).

### Rollout Steps
1. Add `VITE_SENTRY_DSN`, `SENTRY_ENVIRONMENT` env vars.
2. Update deployment scripts to inject DSNs per environment.
3. Document verification (Sentry test event).

### Dashboards & Alerts
- Configure alert thresholds (error rate spikes).
- Create dashboards grouping by feature (configurator, account, ai).
- Ensure staging alerts route to dev-only channel.

