---
title: Coding & Design Conventions
description: Minimal rules to keep code readable, accessible, and consistent.
status: active
apply_to: repo
labels: [conventions, style, accessibility]
---

JavaScript & React
- Use ES modules, functional components, hooks; avoid classes.
- Prefer small, composable components; colocate styles and tests per component.
- State: keep global config state in Zustand; derive UI state locally.
- Naming: components PascalCase, hooks use prefix, files-kebab-case.js.
- Comments: only for non-obvious rationale and invariants.
- JSDoc for public utilities and shared helpers.

Styling & Animation
- CSS Modules + PostCSS. Avoid global CSS leakage. Use :root CSS variables for tokens (colors, spacing, typography, z-index, motion).
- Directory: /web/src/styles for globals (reset.css, variables.css, themes.css); module.css colocated with components.
- Framer Motion for UI transitions; GSAP allowed for scroll-scenes if needed.
- Aim for 60fps; prefer transform/opacity animations; avoid layout thrash.

Context
- CSS Modules chosen to keep the stack pure React + CSS, while preventing global collisions and enabling theme tokens. JSDoc is preferred for editor hints without introducing TypeScript.

3D (R3F)
- Keep scene declarative; isolate materials/shaders; use Suspense and drei loaders.
- frameloop="demand" by default; lift heavy work off main thread when possible.

Accessibility (WCAG 2.1 AA)
- Semantic HTML; labeled controls; focus-visible; keyboard navigation.
- Alt text on images; color contrast >= 4.5:1; motion-reduce media query respected.

Internationalization
- i18next with JSON namespaces per feature. Never hardcode copy in components.
- Keys: feature.section.item (e.g., configurator.paint.rosso_corsa).

Git & Commits
- Conventional Commits (feat, fix, docs, chore, refactor, perf, ci).
- Small PRs; include screenshots for UI; record perf notes for 3D changes.

