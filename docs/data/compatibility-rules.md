---
title: Compatibility Rules
description: How option dependencies/conflicts are represented in SQL.
status: active
---

Table
- compatibility_rules(id, rule_type enum('requires','incompatible'), primary_option_value_id, secondary_option_value_id)

Semantics
- requires: choosing primary implies secondary must also be active (auto-select or enable-only).
- incompatible: choosing primary disables secondary (UI should gray out and explain).

UI Behavior
- On selection, fetch applicable rules for changed option_value_id and update availability/auto-select accordingly. Always show user-facing reason text from i18n (e.g., configurator.rules.sport_seats_require_perf_pack).

