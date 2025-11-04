---
title: Git & GitHub Conventions
description: Minimal rules for solo dev today, scalable for future collaborators.
status: active
apply_to: repo
labels: [git, github, workflow]
---

Branches
- main: production. develop: staging. feature/*: work branches.

Commits & PRs
- Conventional Commits (feat, fix, docs, chore, refactor, perf, ci).
- Small PRs; attach screenshots for UI changes and note perf impact for viewers.
- PR checklist: builds on CI, no secrets, passes budgets, includes docs update if behavior changes.

Releases
- Tag SemVer on main. Keep CHANGELOG at release time (optional until 1.0).

Large Assets
- Do not commit heavy 2D/3D; store in Supabase Storage and reference via manifest URLs.

Solo mode
- Direct commits to develop allowed; use PRs to main to keep history clean.

