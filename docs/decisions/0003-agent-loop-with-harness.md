# 0003: One agent loop, with a harness that owns "done"

Status: accepted

## Context

An earlier version built sites with a staged pipeline: plan, select components, generate all code in one response, apply it, then polish. It was hard to repair. One bad file meant regenerating a large response, and edits went through a different path than the first build.

## Decision

Building and editing both go through one tool-calling loop (`apps/server/shared/agent-loop.js`). The model reads and writes files through tools. A harness around the loop decides when a turn is finished:

- If files changed and the build was not checked after the last change, the harness checks it.
- If the check fails, the model gets the failure and a few extra steps. This can happen twice.
- If the check passes on a larger change, the model gets a screenshot for one visual review pass.

## Why

- Errors are fixed with small edits to the file that broke, not by regenerating everything.
- First builds and later edits share the same code path, tools and tests.
- The model cannot end a turn by claiming success. The check is run by the harness, not left to the model.
- The loop can be tested without a real model or sandbox. `scripts/agent-harness-regression.js` does this with fakes.

## Trade-offs

- A first build takes many model calls, so it is slower and costs more than a single large generation.
- The step budget is fixed (20 for an edit, 35 for a first build, plus repair and review steps). Very large sites can run out.
- The build check depends on headless Chromium reading the live preview.

## What was removed

The staged planner, selector and one-shot code generation routes are gone. `apply-ai-code-stream` remains because it restores a saved project's files into a new sandbox.
