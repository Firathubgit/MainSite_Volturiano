-- =====================================================
-- Agent Harness Persistence
-- Durable sessions, turns, messages, tool events, memory
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  sandbox_id TEXT,
  model TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'reset', 'archived')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  sandbox_id TEXT,
  model TEXT,
  turn_type TEXT DEFAULT 'edit' CHECK (turn_type IN ('edit', 'initial_build', 'undo', 'system')),
  user_prompt TEXT,
  response_short TEXT,
  summary JSONB DEFAULT '{}'::jsonb,
  changed_files JSONB DEFAULT '[]'::jsonb,
  component_ids JSONB DEFAULT '[]'::jsonb,
  build_status TEXT,
  tool_call_count INTEGER DEFAULT 0,
  mutation_count INTEGER DEFAULT 0,
  rounds INTEGER,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  turn_id UUID REFERENCES agent_turns(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  blocks JSONB DEFAULT '[]'::jsonb,
  token_usage JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_tool_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  turn_id UUID REFERENCES agent_turns(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  event_type TEXT DEFAULT 'result' CHECK (event_type IN ('start', 'result', 'error')),
  args JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  success BOOLEAN,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'design_preference',
    'project_fact',
    'component_choice',
    'error_pattern',
    'user_instruction',
    'recent_change',
    'build_status'
  )),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  importance INTEGER DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_project_id ON agent_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_sandbox_id ON agent_sessions(sandbox_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_last_activity ON agent_sessions(last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_agent_turns_session_id ON agent_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_turns_project_id ON agent_turns(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_turns_created_at ON agent_turns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_turn_id ON agent_messages(turn_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_tool_events_session_id ON agent_tool_events(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_events_turn_id ON agent_tool_events(turn_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_events_tool_name ON agent_tool_events(tool_name);
CREATE INDEX IF NOT EXISTS idx_agent_tool_events_created_at ON agent_tool_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_project_id ON agent_memory(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_importance ON agent_memory(importance DESC);

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own agent sessions" ON agent_sessions;
CREATE POLICY "Users can manage own agent sessions"
  ON agent_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own agent turns" ON agent_turns;
CREATE POLICY "Users can manage own agent turns"
  ON agent_turns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own agent messages" ON agent_messages;
CREATE POLICY "Users can manage own agent messages"
  ON agent_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agent_sessions s
      WHERE s.id = agent_messages.session_id
      AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_sessions s
      WHERE s.id = agent_messages.session_id
      AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own agent tool events" ON agent_tool_events;
CREATE POLICY "Users can manage own agent tool events"
  ON agent_tool_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agent_sessions s
      WHERE s.id = agent_tool_events.session_id
      AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_sessions s
      WHERE s.id = agent_tool_events.session_id
      AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own agent memory" ON agent_memory;
CREATE POLICY "Users can manage own agent memory"
  ON agent_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
