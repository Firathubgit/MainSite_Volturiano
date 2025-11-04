---
title: How to Add a Vehicle
description: Minimal, repeatable steps to onboard a new model.
status: reference
---

1) Database
- Insert into vehicles(name, base_price, description, performance_specs jsonb, segment, drivetrain, subbrand).
- Create option_groups and options for the model if new groups are needed (paint, wheels, calipers...).
- Add option_values with price_delta and link to assets via image_url or material_id.
- Define compatibility_rules for any requires/incompatible pairs.

2) Assets
- Upload 2D layers and (optional) GLB + textures to Supabase Storage.
- Create/update the asset manifest JSON for the model (see ../data/asset-manifest.md) and commit it to the repo.

3) i18n
- Add user-facing strings (model name, option labels, rule reasons) in /web/src/i18n/<locale>/models.json and configurator.json.

4) App wiring
- Add the model entry to the models carousel data used by features/models.
- Ensure feature flag visibility if this is a soft launch (see feature flags).

5) QA checklist
- 2D angles render correctly; hover prefetch is instant.
- Price totals match DB deltas; compatibility rules behave with clear messages.
- Saved configuration round-trips and generates a config code.

