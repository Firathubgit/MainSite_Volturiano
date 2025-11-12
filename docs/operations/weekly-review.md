## Weekly Review Process

### Schedule
- Every Monday 09:00 CET.
- Participants: product + engineering (Firat).

### Data Sources
1. **Signups**
   - Supabase query: `select count(*), date(created_at) from auth.users where created_at > now() - interval '7 days' group by 2;`
2. **Saved Configurations**
   - `select count(*), date(created_at) from user_configurations where created_at > now() - interval '7 days' group by 2;`
3. **Key Errors**
   - Export Sentry issues (week) or Supabase Edge logs filtered by severity.

### Agenda
1. Review metrics (signups, configs, errors).
2. Highlight anomalies (traffic spike, failure rate).
3. Assign follow-up tasks (fix bug, adjust copy, contact user).
4. Document summary in meeting notes (include request IDs for incidents).

### Templates
- Meeting notes stored in `/docs/operations/weekly-notes/<yyyy-mm-dd>.md` (future).
- Include action item checklist, owner, due date.

### Follow-up
- Update backlog or TODO items based on outcomes.
- Share summary in ops channel / email.


