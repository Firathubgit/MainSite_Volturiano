# Verification Matrix

Use this matrix to choose checks before and after builder cleanup.

## Early cleanup

Use for docs, old prompt dumps, frontend SQL notes, orphan UI, duplicate modal cleanup, and generated artifact cleanup.

- build the web app
- run billing regression if billing imports changed
- static search for deleted component/file names

## Agent-only routing

Use before deleting staged generation routes.

- focused Generation init smoke for prompt, image, template, selected component, and community import starts
- focused edit smoke for text, image, and selected/community component edits
- assert the paths hit `/api/agent/initial-build` or `/api/agent/message`
- run `test:agent-harness`

## Publishing retirement

Use before removing local/Supabase Storage publish.

- GitHub connect
- first `push-project`
- update `push-project`
- `refresh-vercel-url`
- UI displays an openable Vercel URL
- static search confirms builder UI does not call `/api/publish-site`
- existing `/sites/:slug` links are either preserved read-only or migrated

## Data and compliance

Use if touching project, snapshot, billing, settings, GDPR, community, admin, or migration code.

- settings/GDPR regression
- credit/billing regression
- community/admin regression if relevant
- static audit of affected tables

## Review rule

Every deletion needs one of these proofs: non-runtime artifact in a runtime folder, zero static callers and no public/external contract, replacement path proven by test, or explicit product retirement decision.
