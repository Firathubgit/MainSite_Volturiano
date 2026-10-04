# Contributing

Thanks for taking a look. Bug reports, fixes, registry components and docs are all welcome.

## Setup

You need Node.js 20 or newer.

```bash
git clone https://github.com/Firathubgit/volturiano-agent.git
cd volturiano-agent
cp .env.example .env
npm install
npm run dev
```

Add one model provider key and an E2B key to `.env` if you want to run real builds. The tests need no keys.

- UI: http://localhost:5173
- API: http://localhost:3001

To skip the Chromium download during install (the tests do not need it):

```bash
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

## Before you open a pull request

```bash
npm run lint
npm run build
npm test
```

All three must pass. CI runs the same commands.

- `npm test` runs the unit tests in `apps/server/tests` and then the agent harness regression in `apps/server/scripts/agent-harness-regression.js`.
- If you change the agent loop, a tool, or the build check, add or update a harness scenario.
- If you change stored data, add a test in `apps/server/tests`.

## Branches and commits

- Branch from `main`. Use a short descriptive name, for example `fix/edit-file-whitespace` or `feat/docker-sandbox`.
- Keep a pull request to one topic.
- Write commit messages as `type(scope): summary` in the imperative. Types in use: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.

```
fix(server): reject edits that match more than one location
```

- Say what changed and why. Avoid messages like "update" or "fix stuff".

## Code style

- Match the file you are editing. There is no formatter config, and the linter only flags real mistakes.
- Comments explain why, not what.
- No new dependency without a reason in the pull request.

## Adding registry components

See [packages/registry/README.md](packages/registry/README.md). The short version: only code you wrote, or code under MIT, Apache-2.0, BSD or a similar license, with `license` and `source` filled in. Third-party code also goes in `THIRD_PARTY_NOTICES.md`.

## Secrets and private data

Never commit keys, tokens, real emails or customer data, including in tests and fixtures. Use obviously fake values.

## Reporting security problems

Please do not open a public issue. See [SECURITY.md](SECURITY.md).
