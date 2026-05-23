# Deep Research Prompt 2 - AI Website Builder Agent-First Architecture, Technical Debt, And Agent Guidance

Use this prompt with the repository attached or available as repo context.

## Prompt

You are performing a deep architecture and maintainability research audit for the Volturiano AI Website Builder codebase.

This is a repository-contexted research assignment.
Do not answer with generic clean-code principles.
Read the actual builder files, routes, tests, docs, migrations, scripts, and data-facing code.

The owner wants to remove old rotten builder code and keep a high-class, future-friendly repository for an AI website builder that is increasingly agent-based.
The owner is open to architecture improvements and folder organization changes when they preserve product behavior and reduce future technical debt.
The owner does not want a giant risky rewrite disguised as cleanup.

Your job in this research run is to propose the best target architecture and debt-reduction strategy for the AI website builder after the first safe scrap cleanup.

## Core Question

How should this AI website builder be organized so that:

1. The active agent-based runtime is obvious.
2. Transitional staged/fallback generation code is visible as transitional rather than mistaken for active primary architecture.
3. Shared sandbox, registry, publish, billing, community, admin, and database code have clear ownership.
4. Database migrations and schema truth are not scattered beside frontend components.
5. Historical prompt dumps, temporary repair scripts, generated output, and debug-only surfaces do not pollute runtime folders.
6. Future human and AI coding agents can make safe changes quickly because the repository teaches them what matters.
7. Comments and docs explain non-obvious contracts, invariants, compatibility bridges, and deletion triggers without narrating trivial code.

## Required Research Posture

You must work from repository evidence.
Use the facts and file list in this prompt as starting context, but re-check everything.

Do not propose architecture because it is fashionable.
Propose architecture because it fits the code that already exists, the current transition state, and the product's likely next steps.

You may recommend incremental folder moves, documentation maps, contract tests, public APIs, private modules, and annotation conventions.
You may recommend later refactors.
You may not recommend a broad rewrite unless you explicitly explain why no incremental path exists.

## Current Product State Already Observed By Codex

Codex previously audited the AI website builder slice in the current working tree.
Important observed facts:

- Agent mode is the default builder path today.
- Agent mode is not the only path today.
- `Generation.jsx` is still a large convergence point containing current agent flow plus staged generation flow plus initialization/fallback logic.
- Current agent backend logic lives across route, loop, context assembly, session persistence, memory persistence, tool runtime, sandbox file tools, registry tools, and frontend SSE parsing.
- Staged generation code still calls many route-level AI pipeline steps.
- Shared registry and sandbox behavior is used by both active and transitional flows.
- Builder UI, builder admin/community areas, billing, publishing, and GitHub integration are adjacent surfaces and can be easy to break with over-broad cleanup.
- The repository currently contains builder prompt-history text files, old SQL near frontend code, generated publish output, local registry reference material, one-off scripts, and debug UI mixed near runtime code.

## Reference Repositories The Owner Asked To Learn From

Use the principles from these local reference repos if they fit the builder.
Do not copy them mechanically.

### Reference 1 - Claw Code

Codex inspected local files in:

- `C:/Users/Firat/Desktop/claw-code-main/claw-code-main/README.md`
- `C:/Users/Firat/Desktop/claw-code-main/claw-code-main/CLAUDE.md`
- `C:/Users/Firat/Desktop/claw-code-main/claw-code-main/PHILOSOPHY.md`
- `C:/Users/Firat/Desktop/claw-code-main/claw-code-main/rust/README.md`

Observed maintainability ideas worth evaluating:

- The repo explicitly names the canonical runtime surface.
- It explicitly names companion/reference surfaces that are not the primary runtime.
- It provides a documentation map instead of leaving readers to infer what is authoritative.
- The Rust README includes a responsibility map for runtime crates.
- Verification and parity harnesses are described as product confidence tools.
- Agent-facing guidance is short and concrete rather than hidden inside scattered prompt dumps.

### Reference 2 - LangGraph

Codex inspected local files in:

- `C:/Users/Firat/Desktop/langgraph-main/langgraph-main/AGENTS.md`
- `C:/Users/Firat/Desktop/langgraph-main/langgraph-main/CLAUDE.md`
- `C:/Users/Firat/Desktop/langgraph-main/langgraph-main/README.md`
- `C:/Users/Firat/Desktop/langgraph-main/langgraph-main/Makefile`
- `C:/Users/Firat/Desktop/langgraph-main/langgraph-main/libs/langgraph/README.md`

Observed maintainability ideas worth evaluating:

- The repo states that it is a monorepo and gives package ownership boundaries.
- It provides a dependency map so changes have visible blast radius.
- Verification is scoped to library boundaries with standard format/lint/test commands.
- Core library code, SDKs, CLI, examples, docs, and tests have distinct homes.
- Agent instructions explicitly tell coding agents what to run and what style rules matter.

## What To Learn From The References

Research whether the builder should gain analogous artifacts such as:

- an authoritative AI builder architecture map
- an authoritative AI builder runtime surface map
- an AI builder `README` or docs index
- an agent-facing instruction file for the builder slice
- a dependency map for builder frontend/backend/database/publish surfaces
- a target folder structure that separates active agent runtime, staged legacy pipeline, shared services, scripts, migrations, generated artifacts, and docs
- a verification map that says which test harness protects which behavior

Do not assume the builder needs a separate monorepo package.
Do not assume folder movement is always worth it.
Explain the incremental path.

## Existing Volturiano Docs To Inspect

Inspect and evaluate how builder docs should fit the existing documentation tree:

- `docs/architecture/folder-structure.md`
- `docs/architecture/backend.md`
- `docs/architecture/frontend.md`
- `docs/architecture/overview.md`
- `docs/ai/assistant.md`
- `docs/ai/testing.md`
- `docs/ai/handoff.md`
- `docs/README.md`
- any existing builder-specific docs already in the repo

Questions:

- Do the current docs already provide a good home for AI builder architecture?
- Are current docs too generic or stale for the builder?
- Should builder docs live under `docs/ai/website-builder/`, `docs/architecture/ai-builder/`, or another path?
- Which current builder `.txt` files should be replaced by concise authoritative docs?

## Builder Files And Areas To Inspect Deeply

### Frontend entry and UI surfaces

Inspect at least:

- `web/src/app/App.jsx`
- `web/src/pages/Agency/pages/Builder/Builder.jsx`
- `web/src/pages/Agency/pages/Builder/Builder.module.css`
- `web/src/pages/Agency/pages/Builder/Generation/Generation.jsx`
- `web/src/pages/Agency/pages/Builder/Generation/Generation.module.css`
- `web/src/pages/Agency/pages/Builder/Generation/useAgentMode.js`
- `web/src/pages/Agency/pages/Builder/Generation/AgentChatCards.jsx`
- `web/src/pages/Agency/pages/Builder/Generation/SSEEventHandler.jsx`
- `web/src/pages/Agency/pages/Builder/Generation/AgentModeChatInputs.jsx`
- `web/src/pages/Agency/pages/Builder/Generation/AgentModeChatInputsPreview.jsx`
- `web/src/pages/Agency/pages/Builder/components/`
- `web/src/pages/Agency/pages/Builder/Dashboard/ProfileSettings.jsx`
- `web/src/pages/Agency/pages/Builder/Dashboard/panels/`
- `web/src/pages/Agency/pages/Builder/Billing/BuilderBillingPage.jsx`
- `web/src/pages/Agency/pages/Builder/Community/`
- `web/src/pages/Agency/pages/Builder/Admin/`

Research questions:

- Where are active builder responsibilities too concentrated?
- What responsibilities in `Generation.jsx` should eventually split without changing logic?
- Which split would be mechanical and low-risk?
- Which split should wait until staged generation retirement?
- Which UI components are builder domain components versus shared application components?

### Agent backend runtime

Inspect at least:

- `web/server/routes/agent.js`
- `web/server/shared/agent-loop.js`
- `web/server/lib/agent/context-assembler.js`
- `web/server/lib/agent/component-turn-policy.js`
- `web/server/lib/agent/debug-timeline.js`
- `web/server/lib/agent/memory-manager.js`
- `web/server/lib/agent/session-store.js`
- `web/server/lib/agent/tool-runtime.js`
- `web/server/shared/sandbox-fs.js`
- `web/server/shared/model-registry.js` if present in the current tree

Research questions:

- Are route, orchestration, persistence, policy, tools, and transport boundaries clear?
- What should be considered public builder runtime API versus internal implementation?
- Which files need contract comments or docs because future agent edits are likely to break hidden assumptions?
- Which functions are doing too many stateful jobs?
- What is the smallest architecture improvement that would make active agent flow much easier to trace?

### Transitional staged pipeline

Inspect at least:

- `web/server/routes/enhance-prompt.js`
- `web/server/routes/classify-intent.js`
- `web/server/routes/derive-design-system.js`
- `web/server/routes/select-components.js`
- `web/server/routes/plan-website-components.js`
- `web/server/routes/generate-single-component.js`
- `web/server/routes/generate-ai-code-stream.js`
- `web/server/routes/apply-ai-code-stream.js`
- `web/server/routes/render-app.js`
- `web/server/routes/validate-imports.js`
- `web/server/routes/hydrate-premium-copy.js`
- `web/server/routes/build-from-selection.js`
- `web/server/routes/build-template.js`
- `web/server/lib/select-components-v2.js`
- `web/server/lib/render-app-template.js`
- `web/server/lib/provider-helpers.js`
- `web/server/lib/auto-repair.js`
- `web/server/lib/polish-refinement.js`
- `web/server/lib/polish-filler.js`
- `web/server/lib/mini-polish-refinement.js`

Research questions:

- Should this live in a visible `legacy` or `staged-pipeline` boundary while it remains reachable?
- What names would make its status honest without breaking imports immediately?
- Which parts are still genuinely shared with agent runtime?
- Which parts are future deletion candidates after specific entry points are removed?
- Can a dependency map or boundary doc prevent accidental deletion and accidental new coupling?

### Shared infrastructure

Inspect:

- `web/server/lib/registry/registry.js`
- `web/server/lib/registry/templates/`
- `web/server/lib/registry/CodeDumpTextsFromRedyWebsites/`
- `web/server/lib/sandbox/`
- `web/server/routes/create-ai-sandbox-v2.js`
- `web/server/routes/get-sandbox-files.js`
- `web/server/routes/install-packages.js`
- `web/server/routes/publish.js`
- `web/server/lib/auto-republish.js`
- `web/server/routes/integrations/github.js`
- `web/server/routes/billing.js`
- `web/server/routes/dashboard.js`
- `web/server/routes/settings.js`
- `web/server/routes/admin.js`
- `web/server/routes/community/`

Research questions:

- Which shared areas should stay shared?
- Which "shared" areas are really builder-specific and should be named that way?
- Which infrastructure needs a compatibility note because old globals and new managers coexist?
- Which routes deserve a "builder domain map" doc before any folder move?

### Tests, scripts, migrations, docs, and generated artifacts

Inspect:

- `web/package.json`
- `web/tests/`
- `web/e2e/`
- `web/server/scripts/agent-harness-regression.js`
- other builder-related regression scripts
- builder-related server scripts and seeds
- `supabase/migrations/`
- `web/server/migrations/`
- builder-local SQL under frontend folders
- builder `.txt` prompt/history files
- `web/server/pub_sites/`
- `web/server/temp_extract/`

Research questions:

- What is the verification shape today?
- What should become the verification shape after cleanup?
- Which artifacts should never live beside runtime source?
- Which migration folder is authoritative?
- Which scripts need names that say `regression`, `maintenance`, `migration`, `seed`, or `archive`?

## Database Context Supplied By The Owner

The current Supabase schema copy includes these builder-relevant table groups.

### Durable agent state

- `agent_sessions`
- `agent_turns`
- `agent_messages`
- `agent_tool_events`
- `agent_memory`

Important ideas visible in the schema:

- durable session keys
- user, project, and sandbox links
- turn types such as `edit`, `initial_build`, `undo`, and `system`
- turn summaries, changed files, component ids, build status, rounds, mutation counts
- message blocks and token usage
- tool event payloads and duration
- memory types such as design preference, project fact, component choice, error pattern, user instruction, recent change, and build status
- retention fields on some agent data

### Projects and publish lifecycle

- `profiles`
- `projects`
- `published_sites`
- `snapshots`
- `github_connections`
- `guest_rate_limits`

Important ideas visible in the schema:

- project prompt, enhanced prompt, design system, component plan, selected components, generated files, sandbox id, build status, build mode
- publish status, slug, URL, GitHub metadata, thumbnail, commit visibility fields
- published site storage bucket/path and route manifest
- snapshots linked to project and user

### Catalog, templates, taxonomy, and selection

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

Important ideas visible in the schema:

- Supabase-backed component bundles
- template component composition
- taxonomy and blueprint selection data
- selection retention/tracking data

Research requirement:

- Your architecture should explain where data access for these groups belongs.
- Your architecture should avoid scattering schema/migration truth across frontend runtime folders.
- Your architecture should distinguish agent state from staged pipeline selection state.

## Comment And Documentation Strategy For Agentic Software Development

The owner wants comments that help coding agents work safely.
Do not interpret this as "add narration above every trivial function."

Research a comment and documentation system that is specifically useful to AI-assisted engineering in this builder.

Evaluate a convention like this or propose a better one:

### Candidate comment tags

- `BUILDER-INVARIANT:` a behavior future edits must preserve.
- `BUILDER-CONTRACT:` an interface assumption across frontend/backend/tool/database boundaries.
- `BUILDER-COMPAT:` a transitional compatibility bridge, with why it exists and the condition for removal.
- `BUILDER-DEBT:` a known debt item, with impact and removal trigger.
- `BUILDER-SECURITY:` a safety boundary around auth, billing, sandbox, publish, or destructive tool behavior.
- `BUILDER-AGENT-NOTE:` a concise note that helps a coding agent avoid a common wrong assumption.

Research questions:

- Are these tags good for this repo?
- Which should exist?
- Which are too noisy?
- Where should comments live: architecture docs, module headers, public route handlers, complex state machines, database adapters, tests, or individual functions?
- Which specific builder files deserve comments first?
- Which functions or modules are too obvious to comment?
- How should comments state removal conditions for transitional code?
- How should comments avoid becoming stale prompt text?

### Example annotation shape to evaluate

Evaluate whether a module-level comment like this is useful for high-risk files:

```js
/**
 * BUILDER-CONTRACT:
 * Active initial and edit turns enter the agent route from Generation/useAgentMode.
 * This route persists durable session/turn data and also keeps a short-lived undo stack.
 *
 * BUILDER-COMPAT:
 * Sandbox provider fallback exists while some builder routes still resolve the active
 * provider through older global state. Remove only after the staged pipeline and publish
 * paths are migrated to sandboxManager-only access.
 */
```

Evaluate whether a debt comment like this is useful for transitional flows:

```js
// BUILDER-DEBT: Staged generation fallback remains reachable from template and manual
// selection initialization. Delete this branch only after those entry points are rerouted
// to the agent initial-build path and contract tests cover the replacement.
```

Do not recommend comments that merely restate syntax.
Do recommend comments where a future coding agent is likely to make a damaging false assumption.

## Required Architecture Deliverables

Return a report with the following sections.

### A. Executive Architecture Recommendation

Answer:

- What should be the target mental model of the AI website builder?
- Is the target "agent-first with staged compatibility" or already "agent-only"?
- What is the smallest architecture improvement that should happen soon?
- What architecture changes should wait?

### B. Current Architecture Map

Produce a clear map of the current builder:

- frontend entry points
- generation UI and state orchestration
- agent transport and SSE UI
- agent backend route/loop/tools/persistence
- component registry and templates
- sandbox lifecycle
- staged generation pipeline
- project persistence
- publish/GitHub
- billing/credits
- community/admin catalog workflows
- migrations/schema ownership
- tests/regression harnesses

Use paths and dependency arrows.

### C. Target Architecture Map

Propose a future map that is incremental.

For example, evaluate boundaries like:

- `builder/frontend/entry`
- `builder/frontend/generation-agent`
- `builder/frontend/staged-pipeline-ui`
- `server/builder/agent`
- `server/builder/staged-pipeline`
- `server/builder/catalog`
- `server/builder/sandbox`
- `server/builder/publish`
- `server/builder/project-store`
- `server/builder/billing-adapter`

Do not force these exact names.
Choose names that fit this repo.
Explain which boundaries require only docs first, which require folder moves, and which require code refactors.

### D. Folder And Ownership Proposal

Recommend:

- what stays where now
- what should move later
- what should be archived or deleted
- where builder docs should live
- where builder schema docs should live
- where migrations belong
- where generated outputs should not live
- where one-off scripts belong if retained

Include at least two options:

1. Minimal cleanup structure with almost no file moves.
2. Better long-term structure with justified file moves and module boundaries.

### E. Documentation Proposal

Recommend a small set of authoritative docs.

Evaluate docs such as:

- AI Builder Overview
- AI Builder Runtime Surface Map
- AI Builder Agent Runtime Contract
- AI Builder Staged Pipeline Retirement Note
- AI Builder Database And Migration Map
- AI Builder Verification Matrix
- AI Builder AGENTS Instructions

For each recommended doc:

- state its purpose
- state who uses it
- state what should not go into it
- state which old `.txt` files it replaces or renders unnecessary

### F. Agent-Facing Guidance Proposal

Design the instructions a coding agent should read before editing the builder.

Include:

- active runtime path
- transitional path warning
- which tests/harnesses to run
- database/migration source-of-truth warning
- generated output warning
- route/security warning
- comments/debt tag convention
- "do not delete just because no frontend caller exists" warning for externally callable APIs

Return either:

- a draft builder-specific `AGENTS.md` section
- or a draft builder README section with agent instructions

### G. Comment And Annotation Plan

Return:

- the final recommended comment tag vocabulary
- examples
- exact first files/modules to annotate
- which comments should be module-level rather than function-level
- which files should not receive extra comments
- a stale-comment prevention rule

### H. Technical Debt Register

Create a prioritized technical debt register for the builder.

Include debt items such as:

- huge mixed-responsibility generation component
- staged pipeline still reachable beside agent flow
- sandbox manager plus global compatibility state
- local registry history near runtime
- old prompt docs in source folders
- old SQL in frontend folders
- mounted dormant endpoints
- stale duplicate billing modal
- generated publish output tracked in repo
- one-off scripts without lifecycle labels

For each debt item provide:

- problem
- current evidence
- product risk
- cleanup strategy
- prerequisite
- effort level
- confidence

### I. Incremental Roadmap

Give a phased plan:

1. Documentation and deletion-proof cleanup.
2. Low-risk stale duplication cleanup.
3. Safety comments and module contracts.
4. Test and verification improvements.
5. Boundary refactors.
6. Staged pipeline retirement or formal support decision.

The roadmap must preserve current product behavior in early phases.

## Specific Questions To Answer

Answer all of these explicitly:

1. Should the builder add an authoritative runtime map before deleting more code?
2. Should prompt-history `.txt` files be deleted, archived, or rewritten into docs?
3. Should builder-local SQL leave the frontend tree?
4. Should staged pipeline code be labeled and grouped before it is deleted?
5. Should `Generation.jsx` be split before or after staged-pipeline retirement?
6. What should be documented about the in-memory undo stack versus durable agent session tables?
7. What should be documented about registry Supabase runtime versus local registry history?
8. What should be documented about sandbox global compatibility state?
9. What comments are most valuable for future AI coding agents?
10. What comments would just add noise and technical debt?

## Constraints

- Preserve product behavior.
- Prefer evidence-backed incremental changes.
- Treat architecture changes as welcoming only when they reduce future confusion and have a safe sequence.
- Do not make runtime folders into document archives.
- Do not create an elaborate taxonomy that future work will not maintain.
- Do not overcomment trivial code.
- Do not mistake comments for tests.
- Do not mistake docs for runtime truth if code disagrees.

## Final Output Style

Write the result as if it will guide the next several cleanup PRs.
Be concrete enough that a coding agent could take the first phase and implement it safely.
Be cautious enough that the owner understands which nice-looking refactors are not yet deletion-safe.

