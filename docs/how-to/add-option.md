---
title: How to Add an Option or Variant
description: Add a new color, wheel, or package to an existing model.
status: reference
---

1) DB
- Insert into option_values(option_id, name, price_delta, image_url/material_id).
- If option affects others, insert compatibility_rules rows.

2) Assets
- Upload corresponding 2D layer(s) for every supported angle; update manifest paths.
- For 3D, add material definition in model manifest (paint params, texture refs).

3) i18n
- Add label and any rule reason strings.

4) Verify
- Visual swap is instant (hover prefetch), price updates, rules apply.

