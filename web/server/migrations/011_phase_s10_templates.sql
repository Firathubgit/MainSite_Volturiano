-- ═══════════════════════════════════════════════════════════════
-- PHASE S10: ULTRA COMMUNITY TEMPLATE BUILDER
-- MIGRATION 011: Templates Schema, RLS, and Versioning
-- ═══════════════════════════════════════════════════════════════

-- 1. Modify existing templates table
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS source_mode TEXT DEFAULT 'official' 
    CHECK (source_mode IN ('official', 'community-composed', 'community-extracted')),
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS quality_score FLOAT,
  ADD COLUMN IF NOT EXISTS rating_avg FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES templates(id), -- For versioning
  ADD COLUMN IF NOT EXISTS search_vector tsvector,
  ADD COLUMN IF NOT EXISTS suitable_for TEXT[], -- Industry tags
  ADD COLUMN IF NOT EXISTS color_mode_type TEXT CHECK (color_mode_type IN ('light', 'dark', 'mixed', 'adaptive'));

-- 2. New Table: template_sections (The "Junction" table with ordering)
CREATE TABLE IF NOT EXISTS template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  component_version INTEGER NOT NULL DEFAULT 1, -- Pinning to a version for stability
  section_order INTEGER NOT NULL,
  section_label TEXT, -- e.g. "Main Hero", "Pricing Grid"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, section_order)
);

-- Index for layout speed
CREATE INDEX IF NOT EXISTS idx_temp_sections_ordering ON template_sections(template_id, section_order);

-- 3. New Table: template_versions (Audit log/History)
CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changes_summary TEXT,
  author_id UUID REFERENCES profiles(id),
  snapshot_data JSONB, -- Backup of component IDs at time of publish
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES FOR TEMPLATES
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "templates_select_active" ON templates;
    DROP POLICY IF EXISTS "templates_select_visible" ON templates;
    DROP POLICY IF EXISTS "templates_insert_own" ON templates;
    DROP POLICY IF EXISTS "templates_update_own" ON templates;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "templates_select_visible"
  ON templates FOR SELECT
  USING (status = 'active' OR auth.uid()::text = author_id::text);

CREATE POLICY "templates_insert_own"
  ON templates FOR INSERT
  WITH CHECK (auth.uid()::text = author_id::text);

CREATE POLICY "templates_update_own"
  ON templates FOR UPDATE
  USING (auth.uid()::text = author_id::text AND status IN ('draft', 'pending_review', 'rejected'))
  WITH CHECK (auth.uid()::text = author_id::text);

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES FOR TEMPLATE_SECTIONS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "sections_select_visible" ON template_sections;
    DROP POLICY IF EXISTS "sections_insert_own" ON template_sections;
    DROP POLICY IF EXISTS "sections_update_own" ON template_sections;
    DROP POLICY IF EXISTS "sections_delete_own" ON template_sections;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "sections_select_visible"
  ON template_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM templates t WHERE t.id::text = template_sections.template_id::text
  ));

CREATE POLICY "sections_insert_own"
  ON template_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM templates t WHERE t.id::text = template_id::text AND t.author_id::text = auth.uid()::text
  ));

CREATE POLICY "sections_update_own"
  ON template_sections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM templates t WHERE t.id::text = template_id::text AND t.author_id::text = auth.uid()::text
  ));

CREATE POLICY "sections_delete_own"
  ON template_sections FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM templates t WHERE t.id::text = template_id::text AND t.author_id::text = auth.uid()::text
  ));

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES FOR TEMPLATE_VERSIONS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "versions_select_all" ON template_versions;
    DROP POLICY IF EXISTS "versions_insert_own" ON template_versions;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "versions_select_all"
  ON template_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM templates t WHERE t.id::text = template_id::text AND (t.status = 'active' OR t.author_id::text = auth.uid()::text)
  ));

CREATE POLICY "versions_insert_own"
  ON template_versions FOR INSERT
  WITH CHECK (auth.uid()::text = author_id::text AND EXISTS (
    SELECT 1 FROM templates t WHERE t.id::text = template_id::text AND t.author_id::text = auth.uid()::text
  ));

-- ═══════════════════════════════════════════════════════════════
-- SEARCH: tsvector column + GIN index for full-text search
-- ═══════════════════════════════════════════════════════════════

-- Create GIN index for fast full-text search on templates
CREATE INDEX IF NOT EXISTS idx_templates_search_vector
  ON templates USING GIN(search_vector);

-- Trigger to auto-update search_vector on insert/update for templates
CREATE OR REPLACE FUNCTION update_template_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- We'll combine: title (A), category (B), description (C), suitable_for (C), tags (C)
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.suitable_for, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.industry_tags::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_template_search_vector ON templates;
CREATE TRIGGER trg_update_template_search_vector
  BEFORE INSERT OR UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_template_search_vector();

-- Backfill existing rows (if any)
UPDATE templates SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(suitable_for, ' '), '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(industry_tags::text, '')), 'C');

-- ═══════════════════════════════════════════════════════════════
-- VIEW: weighted_templates (For AI Selection in plan-website-components)
-- Combines Quality, Usage, and Ratings
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW weighted_templates AS
SELECT 
  t.id,
  t.name,
  t.description,
  t.category,
  t.color_mode_type,
  t.suitable_for,
  t.industry_tags,
  t.quality_score,
  t.rating_avg,
  t.usage_count,
  t.created_at,
  -- Formula: 40% LLM Quality, 30% User Ratings, 20% Popularity (Log scale), 10% Freshness
  (
    (COALESCE(t.quality_score, 5.0) * 0.4) + 
    (COALESCE(t.rating_avg, 5.0) * 0.3) + 
    (LEAST(LN(GREATEST(t.usage_count, 1)) / LN(1000), 1.0) * 10.0 * 0.2) + 
    (GREATEST(0, (30 - EXTRACT(DAY FROM (NOW() - t.created_at)))) / 30.0 * 10 * 0.1)
  ) AS composite_weight
FROM templates t
WHERE t.status = 'active';

-- ═══════════════════════════════════════════════════════════════
-- PHASE S10: Extend submission_jobs for template analysis
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE submission_jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'analyze_component',
  ADD COLUMN IF NOT EXISTS metadata JSONB;
