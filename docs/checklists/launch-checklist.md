## Launch Checklist

### Pre-Launch
- [ ] Lint (`npm run lint`)
- [ ] Build (`npm run build`)
- [ ] Supabase migrations applied (`supabase db push`)
- [ ] Seeds run (if required) and verified
- [ ] i18n audit (new strings translated)
- [ ] Feature flags configured (2D/3D, AI, World, Investor)
- [ ] Accessibility spot check (axe, keyboard navigation)
- [ ] Performance smoke test (Lighthouse summary)

### Deployment
- [ ] Merge to `develop` (staging deploy)
- [ ] QA on staging (core routes, login, configurator)
- [ ] Merge to `main` (production deploy)
- [ ] Tag release (optional SemVer)

### Post-Launch
- [ ] `/health` endpoint responds 200
- [ ] Monitoring dashboards show no new errors
- [ ] AI assistant prompt library updated (if changed)
- [ ] Document runbook updates if process adjusted

### Sign-off
- Owner signature:
- Date:
- Notes:


