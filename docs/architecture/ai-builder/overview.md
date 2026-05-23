# AI Builder Overview

This directory is the current source of truth for the Volturiano AI Website Builder. It replaces the old prompt dumps, phase notes, and checklist files that used to sit beside runtime React components.

## Non-negotiable rule

Current user-visible behavior is more important than cleanup. Every cleanup step must preserve the working builder experience unless a replacement path is already proven.

## Target direction

- Website building and editing should be agent-only.
- The Claw-style agent loop is the canonical architecture: user intent -> agent route -> tool loop -> sandbox filesystem -> preview.
- Legacy staged generation is technical debt. It can be removed only after every reachable UI entry point is routed through `/api/agent/*`.
- New publishing should be GitHub/Vercel only.
- Existing local/Supabase Storage published links must stay readable until a safe retirement/migration is complete.

## Runtime layers

1. Frontend builder shell: `Builder.jsx`, `Generation.jsx`, and `useAgentMode.js`.
2. Active agent runtime: `/api/agent/*`, `shared/agent-loop.js`, `lib/agent/*`, sandbox filesystem helpers, and registry tools used by the agent.
3. Transitional staged compatibility: old `startGeneration` flow and staged routes that must stay until no UI call sites remain.
4. Publishing: GitHub/Vercel is canonical for new publishing; `POST /api/publish-site` is a retired tombstone, while `/sites/:slug` remains read-only compatibility until old links are retired.
5. Adjacent live surfaces: billing, credits, profile/settings/GDPR, dashboard projects, community/admin, GitHub integration, snapshots, and registry catalog.

## Cleanup order

1. Remove non-runtime source pollution: prompt dumps, old checklists, frontend SQL notes, and generated output.
2. Remove proven duplicate/orphan UI.
3. Route all build/edit entry points through the agent.
4. Delete staged generation code only after call sites and tests prove it is unused.
5. Make GitHub/Vercel the only UI publish path.
6. Retire `/sites/:slug` and `published_sites` only after existing links are handled.
