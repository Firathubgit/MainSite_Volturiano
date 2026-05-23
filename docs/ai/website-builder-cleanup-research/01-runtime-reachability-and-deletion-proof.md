# Deep Research Prompt 1 - AI Website Builder Runtime Reachability And Deletion Proof

Use this prompt with the repository attached or available as repo context.

## Prompt

You are performing a deep, evidence-driven repository research audit for the Volturiano AI Website Builder codebase.

Your job in this research run is not to implement a large refactor.
Your job is to identify what can be deleted, archived, moved out of runtime folders, or left in place with very high confidence while preserving the currently working AI website builder product behavior.

Treat this as a deletion-proof audit.
Do not give generic cleanup advice.
Do not infer that code is dead because it looks old.
Do not infer that code is current because a database table still exists.
Do not infer that a route is safe to delete only because no frontend caller is found.
Prove each cleanup claim from repository evidence and explicitly name uncertainty.

The product scope for this audit is only the AI website builder platform.
Other parts of the wider Volturiano website may stay untouched unless they are direct builder dependencies.

## Primary Goal

Produce the most trustworthy possible classification of builder-related code and artifacts into:

1. Delete now with very high confidence.
2. Remove after one small verification step.
3. Move/archive/document because it is history, migration input, generated output, or non-runtime reference material.
4. Keep because it is part of the current agent-based builder.
5. Keep because it is still reachable through transitional or fallback builder flows.
6. Keep until an explicit product decision retires a feature.
7. Investigate before touching because external callers, database state, operations scripts, or security concerns may exist.

## Required Research Posture

Work from the repository, not from the summary alone.
Use the facts below as a starting map and re-check them yourself.

For every major deletion or keep recommendation:

- Provide file paths.
- Provide line-level evidence where possible.
- State the reachability chain.
- State what proves the code is runtime, debug-only, generated, migration-only, documentation-only, unreferenced, or externally uncertain.
- State whether your evidence is static-only or also supported by a test/harness/route flow.
- State the expected breakage if the recommendation is wrong.
- State the confidence level.

Prefer a small number of very well-proven cleanup batches over a giant speculative trash list.

## Product Context

The AI website builder is in a transition period:

- The current default path is agent-first.
- The current default path is not yet agent-only.
- Some older staged generation code still has live edges from the main Generation screen.
- Shared registry and sandbox infrastructure is used by both current and transitional paths.
- The repository contains prompt-history text files, builder-local old SQL copies, migration/fix scripts, generated publish output, and old frontend islands mixed near runtime files.

The owner wants to reduce technical debt and old rotten code without changing builder behavior except where a tiny, obvious cleanup fixes stale or broken duplicate code.

## Facts Already Verified By Codex - Re-check Them

Codex already performed a builder-focused audit in the current working tree.
Use this as an initial trail, not as unquestioned truth.

### Current agent-first builder path

These files were inspected and route-traced:

- `web/src/pages/Agency/pages/Builder/Builder.jsx`
- `web/src/pages/Agency/pages/Builder/Generation/Generation.jsx`
- `web/src/pages/Agency/pages/Builder/Generation/useAgentMode.js`
- `web/server/index.js`
- `web/server/routes/agent.js`
- `web/server/shared/agent-loop.js`
- `web/server/lib/agent/context-assembler.js`
- `web/server/lib/agent/session-store.js`
- `web/server/lib/agent/memory-manager.js`
- `web/server/lib/agent/tool-runtime.js`
- `web/server/shared/sandbox-fs.js`
- `web/server/lib/sandbox/sandbox-manager.js`

Codex observed:

- `Builder.jsx` defaults `useAgentBuild` to true and passes it into generation navigation.
- `Generation.jsx` defaults `isAgentMode` and `useAgentBuild` to true.
- `useAgentMode.js` calls `/api/agent/message`, `/api/agent/undo`, `/api/agent/session`, and `/api/agent/initial-build`.
- `web/server/index.js` mounts `/api/agent`.
- `web/server/routes/agent.js` implements `/message`, `/undo`, `/session`, `/reset`, and `/initial-build`.
- The agent route keeps an in-memory undo/session structure while also writing durable session, turn, message, tool event, and memory data through agent persistence helpers.

Research requirement:

- Confirm this path and list its exact frontend-to-backend reachability chain.
- Identify all files that are clearly part of the active agent runtime.
- Identify shared helpers that look old but are still used by the active agent runtime.

### Older staged generation pipeline that still appears reachable

Codex inspected `startGeneration` in `web/src/pages/Agency/pages/Builder/Generation/Generation.jsx`.

The staged flow still appeared to call or depend on these endpoints:

- `/api/projects/init`
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

Codex found remaining live edges into the staged path around:

- non-agent fallback chat generation
- community/manual component selection initialization
- template initialization
- direct component selector confirmation

Relevant files inspected:

- `web/server/routes/plan-website-components.js`
- `web/server/routes/apply-ai-code-stream.js`
- `web/server/routes/generate-ai-code-stream.js`
- `web/server/routes/select-components.js`
- `web/server/routes/build-template.js`
- `web/server/routes/build-from-selection.js`
- `web/server/lib/select-components-v2.js`
- `web/server/lib/auto-repair.js`
- `web/server/lib/polish-refinement.js`
- `web/server/lib/polish-filler.js`
- `web/server/lib/mini-polish-refinement.js`
- `web/server/lib/render-app-template.js`
- `web/server/shared/sse-events.js`

Research requirement:

- Prove which staged routes are still reachable today.
- Prove which staged routes are transitively required by a reachable staged route.
- Separate "ugly but live" from "mounted but not product-reachable".
- Do not recommend deleting this pipeline unless your repo evidence proves the product no longer enters it.

### Shared registry and sandbox evidence

Codex observed:

- Agent tool runtime imports registry APIs from `web/server/lib/registry/registry.js`.
- Staged routes also use registry APIs.
- Registry async paths fetch components and templates from Supabase.
- Local registry helpers named `getLocalCatalogSync`, `getLocalTemplatesSync`, and `getLocalTemplateSync` log that local JSON is disabled.
- The local registry templates and code dump text material may be migration/history material rather than current runtime, but must be classified carefully.
- Sandbox manager and older global sandbox compatibility state are both still referenced.

Relevant inspected paths:

- `web/server/lib/registry/registry.js`
- `web/server/lib/registry/templates/`
- `web/server/lib/registry/CodeDumpTextsFromRedyWebsites/`
- `web/server/routes/create-ai-sandbox-v2.js`
- `web/server/routes/get-sandbox-files.js`
- `web/server/routes/install-packages.js`
- `web/server/routes/publish.js`
- `web/server/lib/auto-republish.js`
- `web/server/routes/create-zip.js`
- `web/server/routes/sandbox-status.js`
- `web/server/routes/sandbox-keepalive.js`
- `web/server/routes/integrations/github.js`

Research requirement:

- Identify which registry files are runtime, migration input, test fixture, or stale reference material.
- Identify which sandbox globals remain live compatibility bridges and which are truly redundant, if any.
- Do not recommend removing sandbox or registry compatibility code just because its style is old.

## Database Context Supplied By The Owner

Treat the following as a current Supabase schema copy for context.
Use it to avoid deleting code that has a real durable data surface, and to avoid preserving dead code only because schema remains.

### Agent persistence tables exist

- `agent_sessions`
- `agent_turns`
- `agent_messages`
- `agent_tool_events`
- `agent_memory`

Their fields show durable session keys, project/user/sandbox links, model and status fields, turn summaries, changed files, component ids, memory types, retention fields, and tool events.

Codex also saw code references from:

- `web/server/lib/agent/session-store.js`
- `web/server/lib/agent/memory-manager.js`
- `web/server/routes/settings.js`
- `web/server/lib/launch-readiness.js`

### Builder project, publish, and snapshot tables exist

- `projects`
- `published_sites`
- `snapshots`
- `profiles`
- `guest_rate_limits`
- `github_connections`

### Catalog, template, taxonomy, and selection tables exist

- `components`
- `templates`
- `template_sections`
- `template_versions`
- `component_categories`
- `component_compatibility`
- `color_themes`
- `industry_verticals`
- `website_type_blueprints`
- `ai_selection_events`

### Community, billing, legal, and operations tables also exist

- `community_submissions`
- `submission_jobs`
- `component_likes`
- `component_ratings`
- `component_reports`
- `copyright_takedown_requests`
- `credit_transactions`
- `refund_requests`
- `stripe_webhook_events`
- `audit_logs`
- `consent_events`
- `gdpr_requests`
- `llm_cost_log`
- `platform_feedback`
- `platform_issues`

Research requirement:

- Use table existence as one signal only.
- Trace code usage, migration ownership, UI entry points, route entry points, scripts, tests, and operations value.
- Explicitly flag tables that are used only by staged pipeline, used only by admin/community surface, used by current agent runtime, or not clearly used in the builder slice.

## Specific Suspect Areas To Prove Or Disprove

### 1. Builder prompt/history text files mixed with runtime frontend code

Inspect files such as:

- `web/src/pages/Agency/pages/Builder/PipelineDocs.txt`
- `web/src/pages/Agency/pages/Builder/SupabaseFixSolutionForBuilderIntegration.txt`
- `web/src/pages/Agency/pages/Builder/UltimateWebsiteBuilderGuidence.txt`
- `web/src/pages/Agency/pages/Builder/BeforeProdNeedsToBeDone.txt`
- `web/src/pages/Agency/pages/Builder/Phase2PromptsProdFile.txt`
- `web/src/pages/Agency/pages/Builder/Phase3PromptsProdFile.txt`
- `web/src/pages/Agency/pages/Builder/Phase4PromptsProdFile.txt`
- `web/src/pages/Agency/pages/Builder/Phase5PromptsProdFile.txt`
- `web/src/pages/Agency/pages/Builder/Phase10Prompts.txt`
- `web/src/pages/Agency/pages/Builder/Phase11Prompts.txt`
- `web/src/pages/Agency/pages/Builder/Phase12prompts.txt`
- `web/src/pages/Agency/pages/Builder/Phase13Prompts.txt`
- `web/src/pages/Agency/pages/Builder/Phase14Prompts.txt`
- `web/src/pages/Agency/pages/Builder/PhaseS25Prompts.txt`
- other builder `.txt` prompt/checklist/history files

Questions:

- Are any imported, served, loaded, or operationally required?
- Should they be deleted, archived under docs/history, kept as current specs, or replaced by a concise authoritative builder README?
- Which files are actively misleading because they document routes or workflows that are no longer canonical?

### 2. Builder-local SQL copies

Inspect:

- `web/src/pages/Agency/pages/Builder/sql_migrations/`
- `web/src/pages/Agency/pages/Builder/fix_missing_columns.sql`
- `web/src/pages/Agency/pages/Builder/phase7_auth_gate_migration.sql`
- `web/src/pages/Agency/pages/Builder/Dashboard/add_congrats_popup_flag.sql`
- canonical-looking SQL under `supabase/migrations/`
- server migration files under `web/server/migrations/`

Questions:

- Which folder is the actual migration source of truth today?
- Which SQL files are historical duplicates near frontend code?
- Which builder-local SQL files still contain one-off repair knowledge not represented elsewhere?
- What is the least risky cleanup batch for SQL files?

### 3. Old dashboard frontend island

Inspect:

- `web/src/app/App.jsx`
- `web/src/pages/Agency/pages/Builder/Dashboard/BuilderDashboard.jsx`
- `web/src/pages/Agency/pages/Builder/Dashboard/BuilderDashboard.module.css`
- `web/src/pages/Agency/pages/Builder/Dashboard/components/ProjectGrid.jsx`
- `web/src/pages/Agency/pages/Builder/Dashboard/components/ProjectCard.jsx`
- current profile/dashboard panels under `web/src/pages/Agency/pages/Builder/Dashboard/`

Codex observed current routes redirect `/builder/dashboard` and `/builder/settings` into `/builder/profile` tabs.

Questions:

- Is the old BuilderDashboard tree unrouted and private to itself?
- Is any code shared with current profile/dashboard panels?
- Can it be deleted in one focused batch?

### 4. Old icons, preview-only components, assets, and media

Inspect:

- `web/src/pages/Agency/pages/Builder/BuilderIcons.jsx`
- `web/src/pages/Agency/pages/Builder/BuilderIcons2.jsx`
- `web/src/pages/Agency/pages/Builder/Generation/AgentModeChatInputs.jsx`
- `web/src/pages/Agency/pages/Builder/Generation/AgentModeChatInputsPreview.jsx`
- builder images and videos with no runtime references

Codex observed:

- Active imports use `BuilderIcons2`.
- The agent input preview is wired to a development-only route under `/debug/agent-inputs`, so it is not production-unreferenced.
- Some builder assets looked unreferenced in an initial scan, including names similar to `AnotherTopRight`, `CornerToprightcard`, `HighQualityVidOneOpenScreen`, `MediumQualityVidOpenScreen`, `TopRightSmallSmal`, and `Coin`.

Questions:

- Which assets are truly unreferenced?
- Which debug-only components should stay?
- Which files are dead only if a debug route is intentionally removed?

### 5. Stale duplicate billing modal

Inspect:

- `web/src/components/Modals/CreditLimitModal.jsx`
- `web/src/components/Modals/CreditLimitModal.module.css`
- `web/src/pages/Agency/pages/Builder/components/CreditLimitModal.jsx`
- `web/src/pages/Agency/pages/Builder/Dashboard/ProfileSettings.jsx`
- `web/src/pages/Agency/pages/Builder/Dashboard/panels/CreditsPanel.jsx`
- `web/src/pages/Agency/pages/Builder/Billing/BuilderBillingPage.jsx`
- `web/server/routes/billing.js`

Codex observed:

- The shared modal calls active billing endpoints such as `/api/billing/subscribe`, `/api/billing/buy-credits`, and `/api/billing/manage`.
- The builder-local modal calls `/api/billing/create-checkout-session`.
- The active billing router did not expose `/api/billing/create-checkout-session`.
- `ProfileSettings.jsx` still imports the builder-local modal and listens for an `open-credit-purchase-modal` event with no dispatcher found in a builder search.

Questions:

- Is the builder-local modal dead, broken, dormant, or externally triggered?
- What tiny cleanup change would preserve visible behavior while removing stale duplication?
- Which event listener or commented branch is also cleanup debt?

### 6. Mounted endpoints with no obvious current frontend caller

Inspect route mounts and repository callers for:

- `/api/analyze-edit-intent`
- `/api/verify-build`
- `/api/lovable-replay-status`
- `/api/finalize-codebase`
- `/api/taxonomy/*`
- `/api/resolve-blueprint`
- `/api/track-retention`

Relevant files include:

- `web/server/index.js`
- `web/server/routes/analyze-edit-intent.js`
- `web/server/routes/verify-build.js`
- `web/server/routes/lovable-replay-status.js`
- `web/server/routes/finalize-codebase.js`
- `web/server/routes/taxonomy-api.js`
- `web/server/routes/resolve-blueprint.js`
- `web/server/routes/track-retention.js`

Codex observed that `/api/resolve-blueprint` looked mounted without auth and can trigger blueprint resolution plus high-confidence blueprint persistence.

Questions:

- Which endpoints are reachable by current frontend code, tests, scripts, external clients, or admin/community workflows?
- Which endpoints are historical staged surfaces?
- Which should be protected before deletion decisions?
- Which can be removed only after checking logs or product integrations outside the repo?

### 7. Server scripts, fix scripts, seeds, migrations, and generated output

Inspect builder-related or registry-related scripts such as:

- `web/server/scripts/agent-harness-regression.js`
- `web/server/scripts/core-access-regression.js`
- `web/server/scripts/audit-retention-regression.js`
- `web/server/scripts/stripe-billing-regression.js`
- `web/server/scripts/community-moderation-regression.js`
- `web/server/scripts/admin-review-queue-regression.js`
- `web/server/scripts/gdpr-settings-regression.js`
- `web/server/scripts/test-db.js`
- `web/server/scripts/test-columns.js`
- `web/server/scripts/test-others.js`
- `web/server/scripts/migrate-catalog-to-supabase.js`
- `web/server/scripts/fix_registry_runtime_errors.js`
- `web/server/scripts/fix_registry_runtime_errors_v2.js`
- `web/server/scripts/fix_registry_bundles.js`
- builder seeds under `web/server/seeds/`

Also inspect generated-looking folders:

- `web/server/pub_sites/`
- `web/server/temp_extract/`

Questions:

- Which scripts are part of current verification or operations?
- Which are migration/repair one-offs?
- Which should be kept but moved to a maintenance/archive folder?
- Which are safe to remove because they are stale and superseded?
- Which generated folders should be ignored by git or cleaned from the repository while keeping the runtime temp directory behavior?

## Required Deliverables

Return a research report with the following sections.

### A. Executive Answer

Answer these directly:

- How much builder cleanup is safe now?
- What are the top five safest cleanup batches?
- What are the top five areas that must not be cleaned as scrap yet?
- What is the confidence score for a deletion pass today?

### B. Runtime Surface Map

Provide a map of:

- current agent-first frontend entry points
- current agent backend routes
- current agent persistence and tool runtime
- shared sandbox and registry dependencies
- transitional staged generation entry points
- profile, billing, community, admin, publish, and GitHub surfaces that are builder-adjacent and still live

### C. File Classification Table

Create a table with columns like:

- Path or folder
- Classification
- Why
- Evidence
- Reachability
- Deletion risk
- Recommended action
- Confidence

Classify at least:

- builder prompt text files
- builder-local SQL files
- old dashboard island
- icon files
- debug preview files
- builder-local billing modal
- registry local templates/code dumps
- publish/generated folders
- candidate no-caller endpoints
- registry repair/test scripts
- staged generation route family

### D. Delete-Now Batch Proposal

Propose the first cleanup patch or patches that should be extremely low risk.

For each batch:

- list exact files/folders
- list any replacement docs or `.gitignore` changes needed
- list verification commands or checks
- list what not to include in that batch

### E. Archive-Or-Move Batch Proposal

Propose where historical material should go if it should not stay inside runtime folders.

Possible categories to evaluate:

- `docs/archive/ai-website-builder/`
- `docs/ai/website-builder/`
- `supabase/migrations/` as migration source of truth
- `web/server/migrations/` if that folder has a still-required role
- `scripts/archive/` or deletion for one-off fix scripts

Do not propose archive folders thoughtlessly.
Explain whether archive material is worth keeping in git at all.

### F. Keep-And-Do-Not-Touch List

List the code that may look old but is still part of:

- current agent runtime
- staged fallback path
- shared sandbox/registry/publish behavior
- admin/community/billing support path

### G. Uncertainty And External Checks

List what the repo cannot prove by itself.

Examples:

- external API consumers
- production access logs
- Supabase data rows needed by current templates/catalog
- whether owners still use dev debug routes
- whether old scripts are used manually outside package scripts

### H. Final Recommendation

End with a sequence:

1. First deletion cleanup.
2. First archive cleanup.
3. First tiny stale-code refactor.
4. First API hardening/deprecation action.
5. Later staged-pipeline retirement research.

## Rules For Recommendations

- Preserve AI website builder behavior by default.
- Do not recommend deleting agent runtime code.
- Do not recommend deleting reachable staged generation code until entry points are retired.
- Do not preserve misleading prompt dumps in runtime folders just because they are long.
- Do not delete migration history if it is the only source of truth.
- Do not confuse generated publish output with the runtime code that creates it.
- Do not overvalue commented-out code.
- Do not treat tests that mention a route as proof the route is product-required.
- Do not hide uncertainty.

## Optional Extra

If you can support it from evidence, include a final "cleanup confidence ladder" with:

- 95 percent confidence removals
- 85 percent confidence removals
- 70 percent confidence removals
- requires logs/product decision
- must keep now

