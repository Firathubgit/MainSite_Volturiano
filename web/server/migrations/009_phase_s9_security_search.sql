-- Migration 009: Phase S9 Security, Search & RLS Policies
-- Spec: S9.8 (RLS), S9.9 (Search Indexing)
-- Dependencies: 008_phase_s9_community_core.sql must be run first

-- ═══════════════════════════════════════════════════════════════
-- 1. RLS: community_submissions
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE community_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions (any status)
CREATE POLICY "submissions_select_own"
  ON community_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert submissions (only as themselves)
CREATE POLICY "submissions_insert_own"
  ON community_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update ONLY their own submissions in draft/processing/rejected status
CREATE POLICY "submissions_update_own"
  ON community_submissions FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('draft', 'processing', 'rejected'))
  WITH CHECK (auth.uid() = user_id);

-- Users can soft-delete (archive) their own submissions
CREATE POLICY "submissions_delete_own"
  ON community_submissions FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view ALL submissions
CREATE POLICY "submissions_select_admin"
  ON community_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND plan = 'admin'));

-- Admins can update ANY submission (approve, reject, flag)
CREATE POLICY "submissions_update_admin"
  ON community_submissions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND plan = 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- 2. RLS: component_ratings
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE component_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings
CREATE POLICY "ratings_select_all"
  ON component_ratings FOR SELECT
  USING (true);

-- Authenticated users can insert ratings (must be their own user_id)
CREATE POLICY "ratings_insert_own"
  ON component_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own ratings
CREATE POLICY "ratings_update_own"
  ON component_ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own ratings
CREATE POLICY "ratings_delete_own"
  ON component_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. RLS: user_bookmarks (create table first if not exists)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  component_id UUID REFERENCES components(id) ON DELETE CASCADE,
  template_id UUID, -- references templates(id) if templates table exists
  collection_name TEXT DEFAULT 'Saved',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, component_id),
  CHECK (component_id IS NOT NULL OR template_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_component ON user_bookmarks(component_id);

ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_select_own"
  ON user_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "bookmarks_insert_own"
  ON user_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks_delete_own"
  ON user_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. RLS: submission_jobs (server-only table via service_role)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE submission_jobs ENABLE ROW LEVEL SECURITY;

-- No public policies — accessed only via supabaseAdmin (service_role key)
-- This ensures the job queue is invisible to client-side queries

-- ═══════════════════════════════════════════════════════════════
-- 5. RLS: llm_cost_log (server-only table via service_role)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE llm_cost_log ENABLE ROW LEVEL SECURITY;

-- No public policies — accessed only via supabaseAdmin (service_role key)

-- ═══════════════════════════════════════════════════════════════
-- 6. FULL-TEXT SEARCH: tsvector column + GIN index
-- Without this, textSearch() queries in Phase S11 will NOT work.
-- ═══════════════════════════════════════════════════════════════

-- Add tsvector column to components table
ALTER TABLE components
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_comp_search_vector
  ON components USING GIN(search_vector);

-- Trigger to auto-update search_vector on insert/update
-- Weight A: name, display_name, category (highest relevance)
-- Weight B: description, tags, keywords (medium relevance)
-- Weight C: visual_description, mood_tone (lower relevance)
CREATE OR REPLACE FUNCTION update_component_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.visual_description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE((SELECT string_agg(value, ' ') FROM jsonb_array_elements_text(NEW.tags)), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE((SELECT string_agg(value, ' ') FROM jsonb_array_elements_text(NEW.keywords)), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.mood_tone, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_update_search_vector
    BEFORE INSERT OR UPDATE ON components
    FOR EACH ROW EXECUTE FUNCTION update_component_search_vector();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backfill existing rows with search vectors
UPDATE components SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(display_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(visual_description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE((SELECT string_agg(value, ' ') FROM jsonb_array_elements_text(tags)), '')), 'B') ||
  setweight(to_tsvector('english', COALESCE((SELECT string_agg(value, ' ') FROM jsonb_array_elements_text(keywords)), '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(mood_tone, '')), 'C');

-- ═══════════════════════════════════════════════════════════════
-- 7. COMPOUND INDEXES for common browse query patterns
-- ═══════════════════════════════════════════════════════════════

-- Browse: filter by status + category + sort by quality
CREATE INDEX IF NOT EXISTS idx_comp_browse
  ON components(status, category, quality_score DESC);

-- Browse: filter by status + sort by newest
CREATE INDEX IF NOT EXISTS idx_comp_newest
  ON components(status, created_at DESC);

-- Browse: filter by status + sort by most used
CREATE INDEX IF NOT EXISTS idx_comp_popular
  ON components(status, usage_count DESC);

-- JSONB GIN indexes for containment queries (suitable_for, industry_tags, tags)
CREATE INDEX IF NOT EXISTS idx_comp_suitable_for
  ON components USING GIN(suitable_for);

CREATE INDEX IF NOT EXISTS idx_comp_industry_tags
  ON components USING GIN(industry_tags);

CREATE INDEX IF NOT EXISTS idx_comp_tags
  ON components USING GIN(tags);
