-- =====================================================
-- SCRIPT 4: SNAPSHOTS TABLE & RLS POLICIES
-- =====================================================

-- 1. Create the snapshots table
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Snapshot Data
  chat_message_index INTEGER NOT NULL,
  chat_message_text TEXT,
  files JSONB NOT NULL,           -- { "src/App.jsx": "...", "src/Hero.jsx": "..." }
  packages JSONB,                 -- ["framer-motion", "lucide-react"]
  design_system JSONB,
  component_plan JSONB,

  -- Build State
  build_status TEXT,
  build_logs TEXT,

  -- Metadata
  snapshot_size_bytes INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_project_id ON snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at);

-- 3. Enable RLS
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can manage own snapshots"
  ON snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
