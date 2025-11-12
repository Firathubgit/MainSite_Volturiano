## /health Endpoint

### Purpose
- Provide lightweight status check for uptime monitoring.
- Return HTTP 200 when core dependencies are reachable.

### Response Format
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T22:00:00.000Z",
  "supabase": "ok",
  "version": "commit-sha",
  "environment": "production"
}
```

### Checks
- Supabase connectivity (simple `SELECT 1` via service or public anon key).
- Optional: feature flag state (3D mode on/off).
- Include request ID header for logging correlation.

### Implementation Options
1. Supabase Edge Function returning JSON.
2. Vite server endpoint (if running in Node in production).

### Monitoring
- Configure UptimeRobot or similar to hit `/health` every 5 minutes.
- Alert thresholds: failed checks >= 3 within 15 minutes.
- Route alerts to ops email/slack.

### Security
- No secrets in payload.
- Optionally add cache-control `no-store`.

### Future Enhancements
- Include build number, queue backlogs, error counts.
- Provide authenticated `/health/full` for detailed diagnostics.


