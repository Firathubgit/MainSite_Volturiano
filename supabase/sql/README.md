# Supabase SQL Scripts

This directory contains SQL scripts for setting up and maintaining the Supabase database schema.

## Setup Scripts

### 1. `garage_schema.sql`
**Purpose:** Main garage feature schema  
**When to run:** Initial setup or when creating new garage tables  
**Contains:**
- `garage_items` table
- `garage_versions` table
- `garage_item_tags` table
- `garage_milestones` table (basic structure)
- `garage_activity` table
- RLS policies for all tables
- Indexes for performance

### 2. `garage_milestones_timeline_setup.sql`
**Purpose:** Phase 2.9 Timeline feature setup  
**When to run:** After `garage_schema.sql` if columns are missing  
**Contains:**
- Adds `from_state`, `to_state`, `metadata` columns to `garage_milestones`
- Creates index `garage_milestones_item_idx`
- Verifies RLS policies
- Includes verification queries

**Status:** ✅ Required for Phase 2.9 Timeline feature

### 3. `garage_milestones_schema_update.sql`
**Purpose:** Legacy schema update (same as above, kept for reference)  
**When to run:** If `garage_milestones_timeline_setup.sql` hasn't been run  
**Note:** `garage_milestones_timeline_setup.sql` is the preferred script

## Running Scripts

### In Supabase Dashboard

1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the script contents
5. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
6. Verify results in the output panel

### Verification

After running `garage_milestones_timeline_setup.sql`, verify:

```sql
-- Check columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'garage_milestones'
  AND column_name IN ('from_state', 'to_state', 'metadata');

-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'garage_milestones'
  AND indexname = 'garage_milestones_item_idx';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'garage_milestones';
```

Expected results:
- ✅ 3 columns: `from_state`, `to_state`, `metadata`
- ✅ 1 index: `garage_milestones_item_idx`
- ✅ RLS enabled: `rowsecurity = true`

## Script Execution Order

1. **First time setup:**
   ```
   1. garage_schema.sql (creates all tables)
   2. garage_milestones_timeline_setup.sql (adds Phase 2.9 columns)
   ```

2. **If tables already exist:**
   ```
   1. garage_milestones_timeline_setup.sql (adds missing columns)
   ```

## Notes

- All scripts use `IF NOT EXISTS` clauses to prevent errors if run multiple times
- Scripts are idempotent (safe to run multiple times)
- RLS policies are created/verified automatically
- Indexes are created with `IF NOT EXISTS` to prevent duplicates

## Related Documentation

- [Timeline Feature Documentation](../../docs/garage/timeline-feature.md)
- [Database Schema Documentation](../../docs/garage/feature-documentation.md)
- [Supabase Setup Guide](../../docs/garage/supabase-setup.md)

