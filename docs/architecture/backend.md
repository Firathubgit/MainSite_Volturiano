---
title: Backend (Supabase) Architecture
description: Schema, policies, and edge functions.
status: draft
---

Schema (essentials)
- vehicles(id, name, base_price, description, performance_specs jsonb)
- option_groups(id, name, display_order)
- options(id, group_id -> option_groups, name, ui_control_type)
- option_values(id, option_id -> options, name, price_delta, image_url, material_id)
- materials(id, name, properties jsonb)
- compatibility_rules(id, rule_type enum('requires','incompatible'), primary_option_value_id, secondary_option_value_id)
- user_configurations(id, user_id, vehicle_id, name, selected_options jsonb, config_code unique)
- orders(id, user_id, configuration_id, status, stripe_session_id)

Policies
- Enable RLS; user_configurations: user_id = auth.uid(); admin bypass via role.
- Orders readable by owner; writes only via webhook.

Context
- JSONB selected_options offers flexibility as option catalog evolves; relational tables hold constraints and allow fast queries.

Edge Functions
- create-checkout-session: fetch config, compute total, create Stripe session, return id.
- stripe-webhook: verify signature, upsert order status, emit notification.

Storage
- Buckets: images/, models/, hdri/. Public read for images/; models/ signed URLs as needed.

