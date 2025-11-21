# Configurator Setup Instructions

## Prerequisites

Before running the configurator seed, ensure you have:

1. ✅ Core platform schema (`platform_schema.sql`) - Creates `profiles`, `vehicles`, `vehicle_options` tables
2. ✅ Configurator 2D schema (`configurator_2d_schema.sql`) - Creates `config_2d_manifests` table

## Step-by-Step Setup

### Step 1: Create the Schema (If Not Already Done)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run `supabase/sql/configurator_2d_schema.sql`
   - This creates the `config_2d_manifests`, `configurator_presets`, and `variant_inventory` tables
   - Verifies: `SELECT * FROM config_2d_manifests LIMIT 1;` (should return empty, not error)

### Step 2: Run the Manifest Seed

1. Still in **Supabase Dashboard** → **SQL Editor**
2. Run `supabase/seeds/configurator_manifests.sql`
   - This inserts the Tornado GT manifest with all paint/rim combinations
   - Verifies: `SELECT slug, version, status FROM config_2d_manifests WHERE slug = 'tornado-gt-launch';`

### Step 3: Verify Setup

Run these queries to verify everything is set up:

```sql
-- Check manifest exists
SELECT slug, version, status, 
       jsonb_pretty(data->'metadata') as metadata
FROM config_2d_manifests 
WHERE slug = 'tornado-gt-launch';

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'config_2d_manifests';

-- Check if you can read (should return 1 row)
SELECT COUNT(*) FROM config_2d_manifests WHERE status = 'published';
```

## Troubleshooting

### Error: "relation config_2d_manifests does not exist"
**Solution**: Run `configurator_2d_schema.sql` first (Step 1)

### Error: "relation profiles does not exist"
**Solution**: Run `platform_schema.sql` first to create the profiles table

### Error: "foreign key violation"
**Solution**: Ensure `profiles` table exists and has the correct structure

### Manifest loads but images don't display
**Solution**: 
- Check asset paths in manifest match your file structure
- Verify files exist in `web/src/assets/Configurator/volturiano/`
- Check browser console for 404 errors

## Quick Setup Script

If you want to run everything at once:

```sql
-- 1. Create schema (if not exists)
\i supabase/sql/configurator_2d_schema.sql

-- 2. Insert manifest
\i supabase/seeds/configurator_manifests.sql
```

Note: The `\i` command works in `psql` but not in Supabase Dashboard. Run files separately in the Dashboard.

