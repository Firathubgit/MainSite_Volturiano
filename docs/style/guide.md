---
title: Style Guide (CSS Modules)
description: Structure, tokens, theming, and naming without Tailwind.
status: active
---

Tokens & Themes
- Define design tokens in styles/variables.css. Theme variants using data-theme on <html> (e.g., base, sport, luxury).

Files
- styles/reset.css, base.css, variables.css, utilities.css
- Component.module.css colocated with components

Naming
- Use BEM-like patterns within modules (e.g., card, card__title, card--highlight).

Internationalization & RTL
- Use logical CSS properties; set [dir] selectors for RTL adjustments when needed.

