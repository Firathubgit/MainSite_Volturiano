-- =====================================================
-- SCRIPT 3: PUBLISHED SITES TABLE & RLS POLICIES
-- =====================================================

-- 1. Create the published_sites table
CREATE TABLE IF NOT EXISTS published_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Site Identity
  slug TEXT UNIQUE NOT NULL,
  site_name TEXT NOT NULL,
  description TEXT,
  industry TEXT,

  -- Storage
  storage_bucket TEXT DEFAULT 'published-sites',
  storage_path TEXT NOT NULL,    -- e.g., 'published-sites/my-dog-site/'
  file_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,

  -- Metadata
  design_system JSONB,
  has_stamp BOOLEAN DEFAULT TRUE,   -- Volturiano branding stamp
  custom_domain TEXT,               -- Future: custom domains

  -- Analytics
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),

  -- Timestamps
  published_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_published_sites_slug ON published_sites(slug);
CREATE INDEX IF NOT EXISTS idx_published_sites_user_id ON published_sites(user_id);

-- 3. Enable RLS
ALTER TABLE published_sites ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Anyone can view published sites (they're public!)
CREATE POLICY "Published sites are publicly readable"
  ON published_sites FOR SELECT
  USING (status = 'active');

-- Only owner can insert/update/delete
CREATE POLICY "Users can manage own published sites"
  ON published_sites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
