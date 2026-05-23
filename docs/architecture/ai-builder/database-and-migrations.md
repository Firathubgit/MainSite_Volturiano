# Database And Migrations

The database schema is live product infrastructure, not cleanup filler. Treat schema cleanup separately from source cleanup.

## Authoritative direction

New schema work should live in `supabase/migrations/`.

Legacy/manual SQL files should not live under frontend runtime folders. Old frontend SQL notes were removed from the builder source tree because they were not runtime code and were not the migration source of truth.

## Live builder tables

Agent runtime:

- `agent_sessions`
- `agent_turns`
- `agent_messages`
- `agent_tool_events`
- `agent_memory`

Project/runtime:

- `projects`
- `snapshots`
- `components`
- `templates`

Publishing transition:

- `published_sites` remains relevant while existing `/sites/:slug` links are preserved.
- GitHub/Vercel publish state lives on project/GitHub-related fields and `github_connections`.

Retired telemetry:

- `ai_selection_events` was removed from the active builder contract. The agent-only builder should not record hidden component-selection telemetry; template extraction should use explicit project metadata such as `component_plan` or `selected_components`.

Adjacent live surfaces:

- `profiles`
- `credit_transactions`
- `stripe_webhook_events`
- `refund_requests`
- community/admin/legal/compliance tables

## Cleanup rule

Do not remove or rewrite table usage because a feature looks old. First identify who writes it, who reads it, whether it supports active UI, whether it supports existing links or compliance, and whether a migration/retirement path exists.

## Forbidden placement

Do not add new SQL files under `web/src/`.
