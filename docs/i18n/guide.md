---
title: Internationalization Guide
description: How to add languages and manage translations.
status: active
---

Libraries
- i18next + react-i18next with dynamic import of namespaces.

Namespaces (minimum)
- common, nav, models, configurator, account, world, investor.

Add a Language
1) Create folder /web/src/i18n/<locale> with JSON files per namespace.
2) Register locale in i18n init; add to language switcher.
3) Verify RTL needs (if ar/he in future) and set dir attribute accordingly.

Keys
- Use kebab-case keys grouped by feature: "configurator.paint.nero-noctis".

QA
- Run through app with new locale; screenshots in PR; avoid text overflow by using responsive containers and line-clamp where needed.

