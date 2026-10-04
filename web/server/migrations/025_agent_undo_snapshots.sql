-- ═══════════════════════════════════════════════════════════════
-- 025: Durable agent undo snapshots
--
-- Pre-mutation file snapshots per agent turn used by POST /api/agent/undo.
-- Previously these lived in a server-process Map and died on restart; now
-- the in-memory stack is a cache in front of this table.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_undo_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  sandbox_id TEXT,
  project_id UUID,
  user_id UUID,
  prompt TEXT,
  files JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_undo_snapshots_sandbox
  ON agent_undo_snapshots (sandbox_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_undo_snapshots_session
  ON agent_undo_snapshots (session_id, created_at DESC);
