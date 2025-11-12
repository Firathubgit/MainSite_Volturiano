## Deployment Runbook

### Contacts
- Owner: Firat (primary dev)
- Support: ops@volturiano.com (placeholder)

### Environments
- `develop` → staging
- `main` → production

### Pre-Deploy Checklist
1. Ensure `TODO` items scoped to release are complete.
2. Run `npm run lint` and `npm run build`.
3. Apply Supabase migrations (`supabase db push`).
4. Update `CHANGELOG.md` if release noteworthy.
5. Confirm feature flags set appropriately (.env, Supabase config).

### Deployment Steps
1. Merge feature branch into `develop` (staging).
2. Verify staging build via preview link.
3. Run smoke tests (core pages, login, configurator).
4. Promote to production by merging `develop` → `main`.
5. Trigger production deploy (Vercel/Netlify pipeline).

### Post-Deploy Verification
- Hit `/health` endpoint.
- Check Sentry dashboard for new errors.
- Validate analytics (optional) receiving events.

### Rollback
1. Revert commit on `main` (Git revert or redeploy previous version).
2. If Supabase migration problematic, run down migration or restore backup.
3. Communicate rollback in ops channel, update runbook notes.

### Incident Handling
- Log incident in `docs/operations/incidents.md` (future).
- Capture timeline, mitigation steps, follow-up actions.


