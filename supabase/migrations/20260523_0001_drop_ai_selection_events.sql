-- Retire the old staged-pipeline component-selection feedback table.
-- The agent-only builder no longer writes or reads this telemetry; reusable
-- component/template flows should depend on explicit project metadata instead.
DROP TABLE IF EXISTS public.ai_selection_events CASCADE;
