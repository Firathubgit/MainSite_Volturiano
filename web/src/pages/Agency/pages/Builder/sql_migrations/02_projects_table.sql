-- =====================================================
-- SCRIPT 2: PROJECTS TABLE & RLS POLICIES
-- =====================================================

-- 1. Create the projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Project Info
  name TEXT NOT NULL,
  prompt TEXT,
  enhanced_prompt TEXT,
  industry TEXT,

  -- AI Pipeline State
  design_system JSONB,
  component_plan JSONB,
  selected_components JSONB,
  generated_files JSONB,

  -- Build State
  sandbox_id TEXT,
  build_status TEXT DEFAULT 'draft' CHECK (build_status IN (
    'draft', 'generating', 'building', 'preview', 'published', 'failed', 'archived'
  )),
  build_mode TEXT DEFAULT 'premium' CHECK (build_mode IN ('free', 'hybrid', 'premium')),

  -- Publishing
  published_url TEXT,
  published_slug TEXT,
  published_at TIMESTAMPTZ,

  -- GitHub
  github_repo_url TEXT,
  github_pushed_at TIMESTAMPTZ,

  -- Metadata
  thumbnail_url TEXT,
  total_components INTEGER DEFAULT 0,
  total_files INTEGER DEFAULT 0,
  build_duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_build_status ON projects(build_status);
CREATE INDEX IF NOT EXISTS idx_projects_published_slug ON projects(published_slug);

-- 3. Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
