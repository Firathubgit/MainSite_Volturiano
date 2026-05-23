-- Legacy server-migration mirror of supabase/migrations/20260523_0001_drop_ai_selection_events.sql.
-- New schema work should live under supabase/migrations; this file remains so
-- older server-migration workflows do not recreate the retired telemetry table.
DROP TABLE IF EXISTS public.ai_selection_events CASCADE;
