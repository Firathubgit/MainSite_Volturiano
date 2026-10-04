# Tools

The agent changes a project only through tools. Each tool is defined in `apps/server/lib/agent/tool-runtime.js` with a schema, a policy and a `run` function. The policy rules are in `apps/server/lib/agent/tool-policy.js`.

## Permission levels

| Level | Meaning |
|---|---|
| `read-only` | Reads project state. Cannot change anything. |
| `workspace-write` | Creates, edits or deletes files inside the project folder in the sandbox. |
| `package-install` | Runs `npm install` in the sandbox. |
| `sandbox-admin` | Resets the whole sandbox app. |

A turn runs with a maximum level. Tools above it are not shown to the model. Some tools also need a feature to be enabled for the turn (`catalog`, `package`, `sandbox-admin`), and the riskier ones require the model to pass an exact confirmation string.

## File tools

| Tool | Level | Notes |
|---|---|---|
| `list_files` | read-only | Paths, extensions and whether a file is protected. |
| `read_file` | read-only | Optional `start_line` and `end_line`. Large files are clipped, so the model reads in windows. |
| `search_files` | read-only | Text or regex search with an optional file filter. |
| `create_file` | workspace-write | Fails if the file exists. |
| `edit_file` | workspace-write | Replaces `old_string` with `new_string`. If `old_string` matches more than one place the edit is rejected, unless `replace_all` is set. Small whitespace differences are tolerated. |
| `replace_file` | workspace-write | Rewrites the whole file. Meant for large rewrites. |
| `delete_file` | workspace-write | Needs `confirmation: "DELETE_FILE"`. Core build files cannot be deleted. |

All file tools go through `apps/server/shared/sandbox-fs.js`:

- Paths are resolved inside `/home/user/app` in the sandbox. Anything outside is refused.
- Text operations are refused on binary files.
- `package.json`, `vite.config.js`, `postcss.config.js`, `tsconfig.json` and `main.jsx` cannot be edited. `App.jsx` and `index.html` can be edited but not deleted.
- Every change returns a structured patch (lines added and removed), which the chat shows and undo uses.

## Build tool

| Tool | Level | Notes |
|---|---|---|
| `get_build_errors` | read-only | Opens the live preview in headless Chromium and reports compile errors from the Vite overlay, console and page errors, failed requests and whether the page rendered anything. |

The model is told to call this after finishing its edits. If it does not, the harness calls it. See "How auto-repair works" in [ARCHITECTURE.md](ARCHITECTURE.md).

## Planning tool

| Tool | Level | Notes |
|---|---|---|
| `plan_pages` | read-only | For sites that need several routes. Returns a page graph (routes, purpose, sections) and a shared navigation plan. The agent then builds it with `react-router-dom`. |

## Registry tools

Only available when the registry has components (feature `catalog`).

| Tool | Level | Notes |
|---|---|---|
| `browse_components` | read-only | Ranks registry components for some keywords and returns metadata. Preview images of the top matches are attached when components have a thumbnail. |
| `fetch_component_bundle` | read-only | Returns a component's source. Very large files are summarized instead of returned. |
| `install_component_bundle` | workspace-write | Writes a component's files into the sandbox without sending the source through the model, and installs its allow-listed npm packages. |

## Package tool

| Tool | Level | Notes |
|---|---|---|
| `install_packages` | package-install | Needs `confirmation: "INSTALL_PACKAGES"`. Only packages on the allow-list in `tool-runtime.js` can be installed. |

## Sandbox tool

| Tool | Level | Notes |
|---|---|---|
| `reset_sandbox_app` | sandbox-admin | Needs `confirmation: "RESET_SANDBOX_APP"`. Restores the starter app. Not exposed in normal turns. |

## Adding a tool

1. Add a definition in `createAgentToolRuntime` in `tool-runtime.js`: `name`, `policy`, `description`, a zod `parameters` schema, a matching `jsonSchema`, and `run`.
2. Return `mutation` or `mutations` from `run` if the tool changes files, so the harness knows a build check is needed.
3. Add a scenario to `apps/server/scripts/agent-harness-regression.js`.
4. Add a row to this file.
