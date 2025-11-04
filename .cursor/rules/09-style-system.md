---
title: Style System (CSS)
description: How styles are organized without Tailwind.
status: active
apply_to: repo
labels: [css, styles]
---

Tokens
- Define tokens in styles/variables.css under :root (colors, spacing, radius, shadows, motion, breakpoints).
- Support themes by overriding :root[data-theme="dark"|"light"|"sport"|"luxury"].

Structure
- Global resets: styles/reset.css; base typography/layout: styles/base.css.
- Component styles: Component.module.css colocated with component.
- Utility classes (rare) live in styles/utilities.css for common patterns.

Practices
- Prefer composition over deep nesting. Use logical properties (inline-start) for RTL support.
- Respect prefers-reduced-motion and color-scheme.

Context
- Themes align with sub-brands (base/sport/luxury) and allow seasonal or campaign skins without refactoring components.

