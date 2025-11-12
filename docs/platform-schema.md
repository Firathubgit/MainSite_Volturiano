## Supabase Platform Schema

This schema supports the configurator, garage integration, and orders pipeline. It complements `garage_items` by providing normalized tables for vehicles, options, saved configurations, and downstream orders.

### Entities

| Table | Purpose |
| --- | --- |
| `vehicles` | Canonical vehicle models with trims, pricing baselines, and media references. |
| `vehicle_options` | Options grouped by category (exterior, interior, performance); can be attached to multiple vehicles. |
| `configurations` | Saved configuration records tied to users and optionally garage items. |
| `configuration_options` | Join table enumerating selected options per configuration. |
| `orders` | Purchase intent or completed orders referencing a configuration. |
| `order_items` | Line items capturing option pricing, taxes, incentives. |

### Relationships

- `configurations.owner_id` references `account_profiles.id`.
- `configurations.garage_item_id` is optional, allowing sync with garage snapshots.
- `orders.configuration_id` ties orders to a source configuration.
- `vehicle_options.vehicle_id` can be `null` for universal options.

### Pricing & JSON

- `configurations.pricing_summary` stores totals returned by RPC for quick display.
- `order_items.metadata` captures additional info (campaign, dealership, financing).

### Row-Level Security

All tables are owner-scoped with `auth.uid()`, with service role bypass for internal automations. See `supabase/sql/platform_schema.sql` for inline policies.

### Seeds

Sample data lives in `supabase/seeds/platform_seed.sql` and includes:

- Two demo vehicles (GT Launch, SUV Prototype).
- Option catalog for each vehicle.
- Sample configurations and associated orders.

### RPC: `get_configuration_totals`

Exposed function consolidates base price + option prices + taxes/incentives, returning:

```sql
(
  base_cents bigint,
  options_cents bigint,
  taxes_cents bigint,
  incentives_cents bigint,
  total_cents bigint,
  currency char(3)
)
```

### Storage

- Bucket `renders` stores generated configuration renders.
- Signed URLs (CORS-safe) are issued via helper util (Edge function) with 5-minute expiry.


