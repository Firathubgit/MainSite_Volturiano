# Supabase Database Setup

This directory contains SQL migrations, seeds, and database setup scripts for the VOLTURIANO project.

---

## 🚀 Quick Start

### Initial Setup (First Time)

1. **Run Core Schema:**
   ```sql
   -- In Supabase Dashboard → SQL Editor
   -- Run: supabase/sql/platform_schema.sql
   ```

2. **Prepare Configurator Support:**
   ```sql
   -- ⭐ IMPORTANT: Run this after platform_schema.sql
   -- Run: supabase/sql/prepare_configurator_support.sql
   ```
   This prepares the database for Phase 3 configurator editing.

3. **Create Storage Buckets:**
   - Go to Supabase Dashboard → Storage
   - Create buckets: `renders`, `garage-thumbnails` (see `docs/development/create-buckets-guide.md`)

4. **Add Storage Policies:**
   ```sql
   -- Run: supabase/sql/storage_policies.sql
   ```

5. **Load Seed Data:**
   ```sql
   -- Run: supabase/seeds/platform_seed.sql
   ```

---

## 📁 File Structure

### SQL Migrations (`sql/`)

- **`platform_schema.sql`** - Core platform schema (vehicles, options, configurations, orders)
- **`prepare_configurator_support.sql`** ⭐ - **Configurator preparation** (run after platform_schema)
- **`garage_schema.sql`** - Garage feature schema
- **`storage_policies.sql`** - Storage bucket RLS policies
- **`add_check_compatibility_rpc.sql`** - Compatibility check RPC function

### Seed Data (`seeds/`)

- **`platform_seed.sql`** - Demo vehicles, options, configurations, orders

---

## ⚠️ Important Notes

### Configurator Support is Already Prepared!

**Before building Phase 3 (Configurator 2D Pipeline):**

✅ Database is ready - Configurator support has been added  
✅ Helper functions exist - Ready to use in Phase 3  
✅ Schema is enhanced - All tables have configurator fields

**See:** `docs/development/configurator-preparation.md` for complete details.

**Key Functions:**
- `get_configurator_options(vehicle_id)` - Load options for configurator UI
- `configuration_to_configurator_payload(config_id)` - Load config for editing
- `update_configuration_from_payload(config_id, payload)` - Save configurator edits

---

## 🔄 Migration Order

1. `platform_schema.sql` - Core tables and RLS
2. `prepare_configurator_support.sql` ⭐ - **Configurator preparation**
3. `garage_schema.sql` - Garage tables
4. `storage_policies.sql` - Storage RLS
5. `add_check_compatibility_rpc.sql` - Compatibility function
6. `seeds/platform_seed.sql` - Demo data

---

## 📊 Current Status

**Phase 1:** ✅ 100% Complete  
**Configurator Prep:** ✅ Complete  
**Status:** Production-ready

See `docs/garage/supabase-current-status.md` for detailed status.

---

## 🔍 Verification

Run diagnostic script in browser console:
```javascript
import('./src/debug/checkPhase1Status.js').then(m => m.checkPhase1Status());
```

---

## 📚 Documentation

- **Setup Status:** `docs/garage/supabase-current-status.md`
- **Configurator Prep:** `docs/development/configurator-preparation.md`
- **Bucket Guide:** `docs/development/create-buckets-guide.md`
- **Roadmap:** `docs/ULTIMATE_ROADMAP.md`

