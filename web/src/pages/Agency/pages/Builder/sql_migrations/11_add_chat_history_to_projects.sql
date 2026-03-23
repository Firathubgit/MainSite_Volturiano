-- =====================================================
-- SCRIPT 11: ADD CHAT HISTORY TO PROJECTS
-- =====================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS chat_history JSONB;
