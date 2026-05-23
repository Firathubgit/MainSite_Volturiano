# Deep Research Prompt 3 - AI Website Builder Schema, API Surface, Verification, And Cleanup Confidence

Use this prompt with the repository attached or available as repo context.

## Prompt

You are performing a deep reliability and cleanup-confidence research audit for the Volturiano AI Website Builder.

This research run exists because a repository can look cleaner after deletions and still be less safe.
The owner wants to remove technical debt, unused files, stale scripts, stale endpoints, generated artifacts, and old prompt/history material from the AI website builder area.
Before larger cleanup, the owner wants a much better answer to:

- what database surfaces are actually live
- what API surfaces are live, dormant, transitional, debug-only, public, or externally uncertain
- what tests and harnesses currently protect the agent builder
- what tests are missing before deleting older fallback/staged code
- what checks should gate cleanup PRs
- what tiny refactors or comments increase confidence without changing behavior

Do not implement a broad refactor.
Do not give general testing advice.
Return evidence-based research that connects repository code, Supabase schema context, migrations, API routes, frontend entry points, tests, scripts, generated output, and operational uncertainty.

## Primary Goal

Design a confidence system for cleaning the AI website builder.

The output should let a coding agent answer:

1. What can I safely clean now?
2. What must I test before I clean it?
3. What database and API contracts prove the feature is still real?
4. What old route or old table is present only because history has not been cleaned yet?
5. What cannot be proven from the repository alone?

## Required Research Posture

Use the repository context directly.
Use the owner-supplied Supabase schema context below.
Do not assume database table existence means product reachability.
Do not assume no frontend caller means an endpoint is unused.
Do not assume a passing unit harness covers UI entry-point behavior.
Do not assume old docs describe current runtime.

For each conclusion:

- name the code path
- name the database path if there is one
- name the route/API surface if there is one
- name the test or verification evidence if there is one
- name the missing proof if there is one

## Current Builder State Already Observed By Codex

Codex previously audited the builder slice and found:

- the default builder route is agent-first
- the agent route and tools are current code
- durable agent session and memory code is present
- an older staged generation pipeline still has live edges from the same generation screen
- registry and sandbox infrastructure is shared
- builder cleanup confidence is high for archive/generated/orphan material and lower for staged pipeline/runtime infrastructure

Codex ran:

- `npm.cmd run test:agent-harness` from `web`

Observed result:

- agent harness regression passed with 29 scenarios

Scenario labels included contract coverage for:

- response normalization
- chunked SSE edit turn behavior
- SSE initial build behavior
- agent progress events
- hydration dedupe
- turn memory derivation
- context envelope shape
- image attachment multimodal behavior
- tool runtime adapter shape
- tool runtime source safety
- large bundle source safety
- component bundle install behavior
- debug timeline behavior
- tool policy exposure
- mutation behavior
- error behavior
- delete guard
- package install guard
- reset guard
- catalog fetch parity
- component turn policy catalog gate
- manual initial component ids
- build check behavior
- component intent for dashboard-like prompts
- component fit ranking
- unsuitable component penalty
- staged verification pass and fail contracts

Codex also attempted:

- `npm.cmd run test:server` from `web`

Observed result:

- it did not start because `vitest` was not recognized in the local checkout environment

Research requirement:

- Independently inspect `web/package.json`, `web/tests`, `web/e2e`, and server scripts.
- Do not treat the passing agent harness as full cleanup coverage.
- Design the missing confidence checks.

## Owner-Supplied Supabase Schema Context

Treat this as the current schema copy for context.
You do not need to execute it.
You do need to use it to reason about code and migration ownership.

### Agent tables

#### `agent_sessions`

Key schema facts:

- UUID primary key
- unique `session_key`
- links to `profiles` through `user_id`
- links to `projects` through `project_id`
- stores `sandbox_id`
- stores `model`
- status values include `active`, `completed`, `failed`, `reset`, and `archived`
- metadata and last activity timestamps

#### `agent_turns`

Key schema facts:

- links to session, user, project, and sandbox
- stores model
- turn types include `edit`, `initial_build`, `undo`, and `system`
- stores user prompt, response short text, summary JSON, changed files JSON, component ids JSON, build status
- stores tool call count, mutation count, rounds, duration, status, error, completion time

#### `agent_messages`

Key schema facts:

- links to session and turn
- role values include `user`, `assistant`, `system`, and `tool`
- stores text content, blocks JSON, token usage JSON, retention timestamp

#### `agent_tool_events`

Key schema facts:

- links to session and turn
- stores tool name, event type, args JSON, result JSON, success flag, duration, retention timestamp

#### `agent_memory`

Key schema facts:

- links to project and user
- memory types include design preference, project fact, component choice, error pattern, user instruction, recent change, and build status
- stores content, metadata JSON, importance, retention timestamp

Research questions:

- Which code writes each table?
- Which code reads each table?
- Which export/delete/compliance paths use them?
- Which frontend behavior depends on persisted agent data versus in-memory route state?
- Which tests cover those assumptions?

### Project and publish tables

#### `projects`

Key schema facts:

- owner link through `user_id`
- name and prompts
- enhanced prompt
- industry
- design system JSON
- component plan JSON
- selected components JSON
- generated files JSON
- sandbox id
- build status values
- build mode values
- published URL, slug, timestamps
- GitHub metadata
- thumbnail and counts
- chat history JSON
- commit visibility fields such as `is_committed` and `committed_at`

#### `published_sites`

Key schema facts:

- links to project and user
- unique slug
- storage bucket and storage path
- site metadata, design system, status, route manifest, thumbnail and SEO-like fields

#### `snapshots`

Key schema facts:

- links to project and user
- chat message index and text
- files JSON
- packages JSON
- design system and component plan JSON
- build status and build logs
- retention field

Research questions:

- What is the live source of publish behavior?
- Which project fields are used by current agent path?
- Which project fields are used only by staged pipeline or dashboard/admin code?
- Is `chat_history` still canonical for any builder flow or is durable agent persistence now canonical for agent turns?
- Where are snapshots still used versus in-memory agent undo stacks?

### Catalog and template tables

#### `components`

Key schema facts:

- unique string `component_id`
- bundle code JSON is required
- category and component metadata are extensive
- community provenance and versioning fields exist
- status fields include active, pending, review, flagged, rejected, deprecated, archived
- previews, quality, usage, rating, featured fields exist

#### `templates`

Key schema facts:

- unique string `template_id`
- `template_code` JSON is required
- component ids JSON exists
- Supabase stores source mode, rating fields, featured fields, `agent_prompt`, priority, and visit URL

#### `template_sections`

Key schema facts:

- relational links from template to component
- component version and order fields exist

#### `template_versions`

Key schema facts:

- version snapshots and author link

Research questions:

- Which registry paths use `components` and `templates` today?
- Which old local templates are superseded by Supabase-backed templates?
- Which code uses relational `template_sections` versus JSON `template_code`?
- Which code assumes weighted template views or category metadata not named in the schema copy?

### Taxonomy, blueprint, and selection tables

#### `component_categories`

- hierarchical category tree

#### `component_compatibility`

- compatibility relation between component ids

#### `industry_verticals`

- vertical hints for categories, color modes, accessibility, regulation flags

#### `color_themes`

- palette, mode, warmth, intensity, accessibility metadata

#### `website_type_blueprints`

- website type prompt matching, required and optional categories, recommended counts, AI-generated fields

#### `ai_selection_events`

- build id, component row link, selected and kept flags

Research questions:

- Which of these are still part of reachable staged selection behavior?
- Which are queried only by mounted APIs with no current frontend callers?
- Which are used by community/admin flows?
- Which are safe to treat as staged-pipeline dependencies rather than current agent path dependencies?

### User, billing, community, and compliance tables

Schema copy includes:

- `profiles`
- `credit_transactions`
- `refund_requests`
- `stripe_webhook_events`
- `audit_logs`
- `consent_events`
- `gdpr_requests`
- `community_submissions`
- `submission_jobs`
- `component_likes`
- `component_ratings`
- `component_reports`
- `copyright_takedown_requests`
- `platform_feedback`
- `platform_issues`
- `github_connections`
- `guest_rate_limits`
- `llm_cost_log`

Research questions:

- Which of these are builder-core versus builder-adjacent?
- Which code must not be touched in a builder cleanup because it is cross-cutting legal/billing/compliance behavior?
- Which route tests or regression scripts protect those areas today?

## Code Areas To Inspect For Schema Mapping

Inspect at least:

- `web/server/lib/agent/session-store.js`
- `web/server/lib/agent/memory-manager.js`
- `web/server/lib/agent/context-assembler.js`
- `web/server/routes/agent.js`
- `web/server/routes/settings.js`
- `web/server/lib/launch-readiness.js`
- `web/server/lib/db/projects.js`
- `web/server/routes/dashboard.js`
- `web/server/routes/publish.js`
- `web/server/lib/auto-republish.js`
- `web/server/routes/integrations/github.js`
- `web/server/lib/registry/registry.js`
- `web/server/lib/select-components-v2.js`
- `web/server/lib/blueprint-resolver.js`
- `web/server/lib/category-filter.js`
- `web/server/lib/retention-tracker.js`
- `web/server/routes/taxonomy-api.js`
- `web/server/routes/resolve-blueprint.js`
- `web/server/routes/component-catalog.js`
- `web/server/routes/component-bundle.js`
- `web/server/routes/build-template.js`
- `web/server/routes/build-from-selection.js`
- `web/server/routes/admin.js`
- `web/server/routes/community/`
- `web/server/routes/billing.js`

Build a code-to-table map from real queries.

## API Surface Questions

Inspect `web/server/index.js` and route modules.

### Current agent API

Trace:

- `/api/agent/message`
- `/api/agent/undo`
- `/api/agent/session`
- `/api/agent/reset`
- `/api/agent/initial-build`

Required answers:

- What auth, restriction, limiter, and sandbox assumptions apply?
- What frontend calls each endpoint?
- What data does each endpoint persist?
- What state is in-memory only?
- What test/harness scenario covers it?

### Staged generation API

Trace routes that may still be called by `Generation.jsx`:

- `/api/create-ai-sandbox-v2`
- `/api/build-template`
- `/api/enhance-prompt`
- `/api/classify-intent`
- `/api/derive-design-system`
- `/api/build-from-selection`
- `/api/select-components`
- `/api/plan-website-components`
- `/api/install-packages`
- `/api/component-bundle`
- `/api/hydrate-premium-copy`
- `/api/generate-single-component`
- `/api/render-app`
- `/api/validate-imports`
- `/api/generate-ai-code-stream`
- `/api/apply-ai-code-stream`

Required answers:

- Which frontend paths enter them today?
- Which routes are reachable only through fallback or template/manual initialization?
- Which tests protect the behavior?
- What needs to be rerouted before removal?

### Candidate dormant or externally uncertain API surface

Investigate:

- `/api/analyze-edit-intent`
- `/api/verify-build`
- `/api/lovable-replay-status`
- `/api/finalize-codebase`
- `/api/taxonomy/*`
- `/api/resolve-blueprint`
- `/api/track-retention`

Required answers:

- Is there any repo caller?
- Is there any docs-only mention?
- Is there any test-only mention?
- Is there any script/admin/community caller?
- Does the API mutate data or call expensive AI work?
- Is the route protected appropriately today?
- What external evidence would be needed before deleting it?
- Would hardening it now be safer than deleting it immediately?

Special attention:

- `resolve-blueprint` may call AI and persist generated blueprint data when confidence is high.
- Distinguish a route wrapper from an internal library function that is still actively used.

## Migration And Schema Source-Of-Truth Questions

Inspect:

- `supabase/migrations/`
- `web/server/migrations/`
- `web/src/pages/Agency/pages/Builder/sql_migrations/`
- `web/src/pages/Agency/pages/Builder/fix_missing_columns.sql`
- `web/src/pages/Agency/pages/Builder/phase7_auth_gate_migration.sql`
- `web/src/pages/Agency/pages/Builder/Dashboard/add_congrats_popup_flag.sql`
- seeds and maintenance scripts under `web/server/seeds/` and `web/server/scripts/`

Required answers:

1. Which migration folder is authoritative today?
2. Why do multiple migration folders exist?
3. Which builder-local SQL files are pure history or copied prompts?
4. Which schema items in the owner copy have migrations in the repo?
5. Which schema items may exist only in the remote Supabase database or in old ad hoc SQL?
6. Which migration cleanup would improve clarity without losing recovery knowledge?
7. What should be documented before old SQL leaves the frontend tree?

## Verification Surface To Inspect

Inspect:

- `web/package.json`
- `web/tests/server/`
- `web/e2e/`
- `web/server/scripts/agent-harness-regression.js`
- `web/server/scripts/core-access-regression.js`
- `web/server/scripts/audit-retention-regression.js`
- `web/server/scripts/stripe-billing-regression.js`
- `web/server/scripts/community-moderation-regression.js`
- `web/server/scripts/admin-review-queue-regression.js`
- `web/server/scripts/gdpr-settings-regression.js`
- `web/server/scripts/backup-ops-regression.js`
- `web/server/scripts/launch-testnet-regression.js`
- any builder-related unit tests and smoke tests

Research questions:

- Which tests prove active agent SSE contracts?
- Which tests prove agent tool safety?
- Which tests prove registry/catalog behavior?
- Which tests prove database access policy or auth boundaries?
- Which tests prove UI routing into agent mode?
- Which tests prove template/manual/community initialization paths?
- Which tests prove publish behavior?
- Which tests prove billing modal endpoint compatibility?
- Which tests prove old staged routes can be retired?

## Required Confidence Matrix

Create a verification matrix with rows for at least:

- agent text edit turn
- agent initial build
- agent session hydration
- agent undo
- agent memory/context persistence
- agent component catalog browsing
- component bundle install
- sandbox build verification
- template start path
- manual selected component start path
- community selected component start path
- non-agent fallback path
- publish path
- GitHub integration path
- billing credits purchase/subscription modal path
- dashboard/profile projects path
- admin catalog path
- community submission/extraction path
- no-caller mounted route removal
- prompt-history/doc deletion
- builder-local SQL cleanup
- generated publish artifact cleanup

Columns should include:

- behavior
- current code path
- current route/API path
- data tables
- current test or harness
- missing test
- cleanup affected
- minimum verification before cleanup
- risk if omitted

## Required Cleanup Safety Gates

Design safety gates for future cleanup PRs.

At minimum evaluate gates such as:

### Gate 1 - Static reachability proof

- import/reference search
- route mount search
- frontend API caller search
- script/test/docs/migration mention search
- generated artifact distinction

### Gate 2 - Runtime contract verification

- active agent harness
- server tests
- focused UI route smoke
- manual or Playwright smoke for agent initial build and edit turn if possible

### Gate 3 - Data contract verification

- schema/migration check
- query map check
- route auth and destructive side effect check
- storage/publish path check

### Gate 4 - Deletion sequence discipline

- delete archive/generated material first
- delete proven private orphan islands next
- consolidate stale duplicates next
- harden/deprecate uncertain APIs next
- only then retire reachable staged pipeline after replacement tests exist

Return the exact gates you recommend.

## Agent-Friendly Comments And Contracts

Research which comments or docs increase verification confidence.

The owner values comments that help future agentic software development.
Design comments that tell future coding agents:

- this is a current runtime contract
- this is a compatibility bridge
- this is staged debt with a removal condition
- this route mutates durable data
- this endpoint has an external/public uncertainty
- this SQL folder is not authoritative

Evaluate using tags such as:

- `BUILDER-CONTRACT`
- `BUILDER-INVARIANT`
- `BUILDER-COMPAT`
- `BUILDER-DEBT`
- `BUILDER-SECURITY`
- `BUILDER-AGENT-NOTE`

Required answers:

- Which comments would measurably reduce cleanup mistakes?
- Which comments would only duplicate tests or obvious code?
- Which modules should get module headers before cleanup?
- Which route mounts should get debt/security comments if they remain?
- Which docs should hold tables and maps instead of comments?

## Known Candidate Findings To Re-check

These were observed during an earlier Codex pass and must be verified, corrected, or rejected.

### Candidate finding A - current agent persistence is real

`session-store.js`, `memory-manager.js`, settings export/delete code, and launch readiness checks reference agent tables.

### Candidate finding B - staged taxonomy and blueprint code remains in codebase

`select-components-v2.js`, `blueprint-resolver.js`, taxonomy API routes, category filters, and selection retention code query taxonomy and selection tables.

### Candidate finding C - route reachability and schema existence differ

Some taxonomy/blueprint routes may be mounted without current frontend callers, while staged selection code may still use the same taxonomy libraries or tables internally.

### Candidate finding D - route wrappers and libraries must be separated

Deleting `/api/verify-build` would not automatically mean deleting the internal sandbox build verification library if agent/staged code still uses it.

### Candidate finding E - published site source and tracked output differ

Published-site serving is now described by code as Supabase Storage based, while tracked `pub_sites` and `temp_extract` contents look like generated or historical output.

### Candidate finding F - billing duplicate mismatch

Shared billing modal appears aligned to active billing router, while builder-local modal appears to call a no-longer-exposed checkout-session route.

### Candidate finding G - current server test invocation is not fully healthy locally

Agent harness passed.
Vitest server test command did not start in the local environment used during the audit.

## Required Deliverables

Return a report with all sections below.

### A. One-Page Confidence Answer

Answer:

- What do we know now?
- What is still unproven?
- What can be cleaned safely before adding more tests?
- What should wait for more tests or production evidence?

### B. Code-To-Database Map

Produce a table:

- database table or view
- feature area
- writing code
- reading code
- frontend route or API entry
- current/fallback/admin/community/ops classification
- migration source evidence
- cleanup consequence

Use the owner schema groups above.

### C. API Surface Map

Produce a table:

- route
- mount location
- auth/limiter/restriction posture
- frontend callers
- backend/script/test callers
- data side effects
- expensive AI/sandbox side effects
- classification
- action recommendation

### D. Verification Matrix

Return the confidence matrix requested earlier.

### E. Missing Coverage List

Prioritize missing tests or smoke checks.

For each:

- what it proves
- why cleanup needs it
- whether it can be static, harness, unit, integration, or E2E
- whether it is prerequisite for first cleanup or only later pipeline retirement

### F. Migration And Schema Truth Report

Explain:

- authoritative migration path
- duplicate or historical SQL path
- mismatch between schema copy and repo migration evidence
- cleanup plan for SQL source-of-truth clarity

### G. Route Hardening And Deprecation Report

Recommend:

- which uncertain mounted APIs should get auth/limiter/deprecation attention now
- which can be deleted after repo-only proof
- which require production/external evidence
- which should remain because internal code still depends on their libraries

### H. Cleanup PR Gate Checklist

Write a checklist a coding agent can follow before deleting builder code.

The checklist should be practical and short enough to use.
It should still force route, DB, test, docs, generated output, and external uncertainty checks.

### I. First Three Confidence-Raising Changes

Recommend three tiny or small changes that improve future cleanup confidence without changing product behavior.

Possible categories:

- add an authoritative builder runtime map doc
- add missing tests around a fragile path
- comment a compatibility bridge with a removal condition
- move old SQL out of frontend runtime folders after documenting canonical migrations
- remove generated tracked output and add ignore rules
- fix stale duplicate billing modal use

Do not choose three giant refactors.

### J. Final Confidence Ladder

End with:

- safe now
- safe after a focused static check
- safe after a small test
- safe after logs/product decision
- unsafe now

## Rules

- Preserve current AI builder behavior.
- Focus on the AI website builder platform slice.
- Separate current agent runtime from staged compatibility logic.
- Separate route wrapper from internal library use.
- Separate database existence from feature reachability.
- Separate generated artifact cleanup from runtime temp-directory behavior.
- Separate full product tests from harness contract tests.
- Do not hide missing evidence.
- Do not recommend a large deletion batch whose confidence depends on unstated assumptions.

## Final Output Style

Write the report so that a human owner and a coding agent can use it together.
Use strong evidence and explicit uncertainty.
The best answer will make later cleanup smaller, calmer, and more reversible.

