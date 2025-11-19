-- ============================================
-- Phase 2.9: Timeline & Milestones Setup
-- ============================================
-- This script sets up the garage_milestones table for the Timeline feature
-- Run this in Supabase SQL Editor if columns are missing

-- Step 1: Add columns for state transition tracking (if not exists)
ALTER TABLE garage_milestones
  ADD COLUMN IF NOT EXISTS from_state text,
  ADD COLUMN IF NOT EXISTS to_state text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Step 2: Create index for efficient milestone queries per item
-- This index allows fast queries ordered by date for timeline display
CREATE INDEX IF NOT EXISTS garage_milestones_item_idx 
  ON garage_milestones (garage_item_id, occurred_at DESC);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN garage_milestones.from_state IS 'Previous state before transition (null for initial milestones)';
COMMENT ON COLUMN garage_milestones.to_state IS 'New state after transition';
COMMENT ON COLUMN garage_milestones.metadata IS 'Additional data (Stripe order_id, payment_intent_id, amount, etc.)';

-- Step 4: Verify RLS policies exist
-- Check if policy exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'garage_milestones' 
    AND policyname = 'garage_milestones_owner'
  ) THEN
    CREATE POLICY "garage_milestones_owner" ON garage_milestones
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM garage_items gi
          WHERE gi.id = garage_milestones.garage_item_id
          AND gi.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Step 5: Verify table structure
-- This query will show you the current structure of garage_milestones
-- Uncomment to run:
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'garage_milestones'
-- ORDER BY ordinal_position;

-- ============================================
-- Verification Queries
-- ============================================

-- Verify columns exist
-- SELECT 
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE table_name = 'garage_milestones'
--   AND column_name IN ('from_state', 'to_state', 'metadata');

-- Verify index exists
-- SELECT 
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'garage_milestones'
--   AND indexname = 'garage_milestones_item_idx';

-- Verify RLS is enabled
-- SELECT 
--   tablename,
--   rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename = 'garage_milestones';

-- ============================================
-- Expected Result After Running
-- ============================================
-- After running this script, you should see:
-- ✅ 3 columns: from_state, to_state, metadata
-- ✅ 1 index: garage_milestones_item_idx
-- ✅ RLS enabled: rowsecurity = true
-- ✅ RLS policy: garage_milestones_owner exists

