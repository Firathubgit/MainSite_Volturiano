# Configurator Preparation - Database Schema Enhancements

**Purpose:** Prepare database schema for Phase 3 Configurator without building Phase 3  
**Status:** Ready to Deploy  
**File:** `supabase/sql/prepare_configurator_support.sql`

---

## Overview

This script enhances the existing database schema to fully support configurator editing, adding new vehicles, and managing configurations via JSON payloads. It prepares the foundation for Phase 3 without requiring Phase 3 to be built first.

---

## What Gets Enhanced

### 1. **Vehicles Table** - Configurator Support Fields

**New Columns:**
- `configurator_enabled` (boolean) - Enable/disable configurator for this vehicle
- `configurator_manifest_id` (uuid) - Reference to configurator manifest (Phase 3)
- `configurator_preview_url` (text) - Preview image for configurator
- `configurator_metadata` (jsonb) - Flexible metadata for configurator settings

**New Index:**
- Fast queries for configurator-enabled vehicles

**Use Cases:**
- Mark vehicles as configurable
- Store manifest references (when Phase 3 is built)
- Store preview images
- Store configurator-specific settings

---

### 2. **Vehicle Options Table** - Configurator UI Support

**New Columns:**
- `configurator_group` (text) - UI group (exterior, interior, performance)
- `configurator_order` (integer) - Display order within group
- `configurator_visible` (boolean) - Show/hide in configurator
- `configurator_metadata` (jsonb) - Layer IDs, material IDs, etc.
- `configurator_image_url` (text) - Swatch/preview image
- `configurator_3d_material_id` (uuid) - Reference to 3D material (Phase 4)

**New Index:**
- Fast queries for configurator-visible options, ordered by group

**Use Cases:**
- Control which options appear in configurator
- Order options within groups
- Store layer/material references for 2D/3D rendering
- Store swatch images

---

### 3. **Configurations Table** - Configurator Payload Support

**New Columns:**
- `configurator_payload` (jsonb) - Full configurator state JSON (matches `garage_items.config_payload`)
- `configurator_schema_version` (integer) - Schema version for migrations
- `configurator_manifest_id` (uuid) - Which manifest was used
- `configurator_render_url` (text) - Generated render URL
- `configurator_last_edited_at` (timestamptz) - Track when configurator was last opened

**New Indexes:**
- GIN index on `configurator_payload` for fast JSONB queries
- Index on `configurator_manifest_id` for manifest-based queries

**Use Cases:**
- Store full configurator state for editing
- Track which manifest version was used
- Store generated renders
- Track edit history

---

## Helper Functions Created

### 1. `validate_configurator_payload(payload jsonb)` → boolean

**Purpose:** Validates configurator payload structure

**Checks:**
- Required top-level keys: `schemaVersion`, `vehicle`, `options`, `pricing`

**Usage:**
```sql
SELECT validate_configurator_payload('{"schemaVersion": 1, "vehicle": {...}, ...}');
```

---

### 2. `extract_vehicle_model_from_payload(payload jsonb)` → text

**Purpose:** Extracts vehicle model name from payload

**Usage:**
```sql
SELECT extract_vehicle_model_from_payload(configurator_payload) FROM configurations;
```

---

### 3. `get_configurator_options(p_vehicle_id uuid)` → table

**Purpose:** Returns all configurator-visible options for a vehicle, ordered by group

**Returns:**
- All options with configurator metadata
- Ordered by `configurator_group`, then `configurator_order`
- Only visible options (`configurator_visible = true`)

**Usage:**
```sql
SELECT * FROM get_configurator_options('vehicle-uuid-here');
```

---

### 4. `configuration_to_configurator_payload(p_config_id uuid, p_schema_version integer)` → jsonb

**Purpose:** Converts a configuration record to configurator payload JSON format

**What it does:**
- Reads configuration and related vehicle/options
- Builds JSON matching `garage_items.config_payload` structure
- Groups options by category (exterior, interior, performance)
- Includes pricing, media, history, metadata

**Usage:**
```sql
SELECT configuration_to_configurator_payload('config-uuid-here', 1);
```

**Use Case:**
- Load configuration into configurator for editing
- Convert existing configurations to configurator format

---

### 5. `update_configuration_from_payload(p_config_id uuid, p_payload jsonb)` → configurations

**Purpose:** Updates a configuration from configurator payload JSON

**What it does:**
- Validates payload structure
- Extracts vehicle_id from payload
- Updates configuration fields
- Rebuilds `configuration_options` from payload
- Updates timestamps

**Usage:**
```sql
SELECT * FROM update_configuration_from_payload(
  'config-uuid-here',
  '{"schemaVersion": 1, "vehicle": {...}, "options": {...}, ...}'::jsonb
);
```

**Use Case:**
- Save changes from configurator back to database
- Edit configuration via configurator UI

---

## How This Prepares for Phase 3

### ✅ **Ready for Configurator Editing**

When Phase 3 is built, you can:
1. **Load Configuration:**
   ```sql
   SELECT configuration_to_configurator_payload(config_id, 1) 
   FROM configurations WHERE id = '...';
   ```
   → Returns JSON ready for configurator UI

2. **Save Changes:**
   ```sql
   SELECT * FROM update_configuration_from_payload(config_id, payload_json);
   ```
   → Updates database from configurator JSON

3. **Get Options:**
   ```sql
   SELECT * FROM get_configurator_options(vehicle_id);
   ```
   → Returns options ready for configurator UI

---

### ✅ **Ready for Adding New Vehicles**

When adding new vehicles:
1. Set `configurator_enabled = true`
2. Set `configurator_manifest_id` (when manifest is created)
3. Add options with `configurator_group`, `configurator_order`, `configurator_visible`
4. Set `configurator_metadata` for layer/material references

---

### ✅ **Ready for JSON Payload Management**

- `configurator_payload` stores full state
- `configurator_schema_version` enables migrations
- Validation function ensures data integrity
- GIN index enables fast JSONB queries

---

## Deployment Instructions

### Step 1: Run the Preparation Script

1. Open Supabase Dashboard → SQL Editor
2. Open `supabase/sql/prepare_configurator_support.sql`
3. Copy entire file
4. Paste into SQL Editor
5. Click **Run**

### Step 2: Verify Changes

Check that new columns exist:
```sql
-- Check vehicles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehicles' 
AND column_name LIKE 'configurator%';

-- Check vehicle_options table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehicle_options' 
AND column_name LIKE 'configurator%';

-- Check configurations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'configurations' 
AND column_name LIKE 'configurator%';
```

Check that functions exist:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%configurator%';
```

---

## Example: Adding a New Vehicle (Future)

```sql
-- 1. Insert vehicle with configurator support
INSERT INTO vehicles (slug, name, trim, year, base_price_cents, currency, hero_image_url, configurator_enabled)
VALUES ('tornado-gt', 'Tornado GT', 'Launch Edition', 2025, 18000000, 'EUR', 'https://...', true);

-- 2. Add options with configurator metadata
INSERT INTO vehicle_options (vehicle_id, category, code, label, price_cents, configurator_group, configurator_order, configurator_visible, configurator_metadata)
VALUES 
  ('vehicle-uuid', 'exterior', 'paint_orange_fury', 'Orange Fury', 180000, 'exterior', 1, true, '{"layerId": "paint_layer", "materialId": "orange_fury_mat"}'::jsonb),
  ('vehicle-uuid', 'performance', 'brakes_ceramic', 'Carbon Ceramic Brakes', 650000, 'performance', 1, true, '{"layerId": "brakes_layer"}'::jsonb);
```

---

## Example: Editing Configuration via Configurator (Future)

```sql
-- 1. Load configuration into configurator
SELECT configuration_to_configurator_payload('config-uuid', 1) as payload;

-- 2. User edits in configurator UI (returns modified JSON)
-- 3. Save changes back
SELECT * FROM update_configuration_from_payload(
  'config-uuid',
  '{"schemaVersion": 1, "vehicle": {...}, "options": {...}, ...}'::jsonb
);
```

---

## Benefits

### ✅ **No Phase 3 Required**
- Schema is ready now
- Functions work immediately
- Can test payload conversion

### ✅ **Future-Proof**
- Supports schema versioning
- Flexible JSONB structure
- Easy to extend

### ✅ **Performance Optimized**
- Indexes for fast queries
- GIN index for JSONB searches
- Efficient option retrieval

### ✅ **Data Integrity**
- Validation functions
- Foreign key constraints
- RLS policies maintained

---

## Next Steps (When Phase 3 is Built)

1. **Create Configurator UI Components**
   - Use `get_configurator_options()` to load options
   - Use `configuration_to_configurator_payload()` to load configs
   - Use `update_configuration_from_payload()` to save changes

2. **Create Manifest System**
   - Store manifests in new table (Phase 3)
   - Link vehicles to manifests via `configurator_manifest_id`

3. **Add Render Export**
   - Use `configurator_render_url` to store renders
   - Generate renders from `configurator_payload`

---

## Summary

**What's Ready:**
- ✅ Database schema supports configurator editing
- ✅ Helper functions for payload conversion
- ✅ Validation and data integrity
- ✅ Performance indexes
- ✅ Future-proof structure

**What's NOT Built (Phase 3):**
- ❌ Configurator UI components
- ❌ Manifest authoring tool
- ❌ Layer composition engine
- ❌ Render export system

**You can now:**
- Add vehicles with configurator metadata
- Store configurator payloads in configurations
- Convert between database format and configurator JSON
- Validate payloads
- Query configurator-ready options

**When Phase 3 is built:**
- Everything will "just work" - no schema changes needed
- Functions are ready to use
- Data structure is already in place

---

**Run the script now to prepare your database for Phase 3!**

