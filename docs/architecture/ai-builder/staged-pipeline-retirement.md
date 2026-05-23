# Staged Pipeline Retirement

The staged builder pipeline is technical debt. The target is agent-only building and editing, but removal must not break any current user flow.

## Current retirement rule

Do not delete staged backend routes before the frontend no longer calls them.

## Entry points that must stay working

Every one of these must route through `/api/agent/initial-build` or `/api/agent/message` before staged code is deleted:

- normal prompt start
- image prompt start
- template start
- selected component start
- community import start
- follow-up edit prompt
- follow-up edit with images
- follow-up edit with selected/community components

## Backend candidates after frontend replacement

Only after the entry points above are agent-routed and tested, inspect and remove staged-only routes/libs with no remaining internal callers:

- `build-template`
- `build-from-selection`
- `select-components`
- `plan-website-components`
- `generate-single-component`
- `render-app`
- `validate-imports`
- `generate-ai-code-stream`
- `apply-ai-code-stream`
- old polish/finalize helpers

Shared libraries must stay if agent tools, registry, publish, community, admin, or tests still use them.

## Required proof before deletion

- A focused Generation init smoke proves all first-build paths hit `/api/agent/initial-build`.
- A focused edit smoke proves follow-up edits hit `/api/agent/message`.
- `test:agent-harness` passes.
- Static search shows no remaining frontend `fetch`/`authFetch` call to the staged endpoint.
- Static search separates route wrappers from reusable internal libraries.
