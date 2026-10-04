# 0002: Keep the component registry as files in the repo

Status: accepted

## Context

The agent builds faster and more consistently when it can install ready-made sections instead of writing every one. A registry needs a home, a search method and a clear rule about what may go in it.

## Decision

The registry is a folder, `packages/registry`. A component is a folder with a `component.json` and its source files. A template is a JSON file listing component ids. The server reads the folder at startup. Ranking is keyword and intent matching, with no embeddings.

Only code written for this project, or code under a permissive license with a recorded source, may be added. Every component carries `license` and `source` fields, and a test checks them.

## Why

- Components are real `.jsx` files that can be read, reviewed and diffed.
- No service is needed to browse or install components.
- License status is visible per component, and enforced in CI.

## Trade-offs

- Keyword ranking is weaker than semantic search on a large catalog. It is fine at the current size.
- The registry is read once at startup. Restart the server after changing it.
- The seed set is small and plain on purpose. The agent is expected to restyle what it installs.
