# AI Builder Runtime Surface

The builder is currently agent-first and is moving to agent-only. This file describes the live runtime surface that must remain working while cleanup happens.

## Frontend entry points

- `/builder` gathers prompt, images, template choice, selected components, model, and mode.
- `/builder/generation` creates or restores the project, prepares a sandbox, streams the agent, and shows preview/chat/code UI.
- Existing screens, inputs, preview behavior, credits UI, and project restore behavior must stay the same during cleanup.

## Canonical agent routes

- `POST /api/agent/initial-build` for first builds from normal prompts, images, templates, selected components, and community imports.
- `POST /api/agent/message` for follow-up edits.
- `GET /api/agent/session?hydrate=1` for durable agent history after reload.
- `POST /api/agent/undo` for live in-memory undo state.

## Agent data contract

The agent runtime persists durable history through `agent_sessions`, `agent_turns`, `agent_messages`, `agent_tool_events`, and `agent_memory`.

Do not confuse this with `projects.chat_history`. `chat_history` is legacy/compatibility state and cannot be removed until reload/hydration tests prove the replacement.

## Sandbox contract

The agent writes website files through sandbox tools. The preview is the sandbox URL. Sandbox manager and compatibility state are shared by agent, legacy generation, download, and publish surfaces.

Sandbox file/status routes expose generated source and preview state, so they must stay authenticated and scoped to the requested sandbox id. Do not remove sandbox compatibility helpers until all readers are manager-only and tests cover build, edit, preview, download, and GitHub/Vercel publish.

## Staged compatibility warning

Legacy staged routes are not the desired architecture, but deletion must be by replacement. A route is safe to delete only when no frontend call sites remain, no agent/publish/community/internal library uses it, and focused smoke tests prove the relevant UI path still works through `/api/agent/*`.
