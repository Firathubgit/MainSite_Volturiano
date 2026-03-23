-- ============================================================
-- PHASE S7: ULTRA Mega-Category Taxonomy & Blueprint System
-- Migration 007 — Database Schema
-- ============================================================
-- Run this in the Supabase SQL Editor or via psql.
-- DROP + CREATE used to ensure clean schema (no leftover columns).
-- ============================================================

-- ═══ CLEAN SLATE: Drop old versions of these tables ═══
-- Order matters: drop tables that reference others first.
DROP TABLE IF EXISTS component_compatibility CASCADE;
DROP TABLE IF EXISTS color_themes CASCADE;
DROP TABLE IF EXISTS website_type_blueprints CASCADE;
DROP TABLE IF EXISTS industry_verticals CASCADE;
DROP TABLE IF EXISTS component_categories CASCADE;


-- ════════════════════════════════════════════════════════════
-- 1. COMPONENT CATEGORIES
--    Hierarchical category system (40 top-level + 200+ sub)
--    Self-referencing via parent_id for unlimited depth.
-- ════════════════════════════════════════════════════════════

CREATE TABLE component_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  target_component_count INTEGER DEFAULT 0,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Hierarchy: NULL = top-level, else = sub-category
  parent_id UUID REFERENCES component_categories(id) ON DELETE CASCADE,
  depth INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug
  ON component_categories(slug);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id
  ON component_categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_categories_sort_order
  ON component_categories(sort_order);


-- ════════════════════════════════════════════════════════════
-- 2. WEBSITE TYPE BLUEPRINTS
--    100 preseeded presets + AI-generated dynamic blueprints.
--    Maps website archetypes → required component categories.
-- ════════════════════════════════════════════════════════════

CREATE TABLE website_type_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Component Recipe
  required_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_categories JSONB DEFAULT '[]'::jsonb,
  recommended_component_count INTEGER DEFAULT 6,
  min_components INTEGER DEFAULT 4,
  max_components INTEGER DEFAULT 12,

  -- Style Defaults
  default_color_mode TEXT DEFAULT 'dark',
  default_color_theme TEXT,
  default_typography TEXT DEFAULT 'modern-sans',

  -- Industry Mapping
  primary_industries JSONB DEFAULT '[]'::jsonb,
  secondary_industries JSONB DEFAULT '[]'::jsonb,

  -- Popularity & Quality
  popularity_score FLOAT DEFAULT 5.0,
  usage_count INTEGER DEFAULT 0,

  -- AI Hints (for keyword matching)
  prompt_keywords JSONB DEFAULT '[]'::jsonb,
  negative_keywords JSONB DEFAULT '[]'::jsonb,
  example_prompts JSONB DEFAULT '[]'::jsonb,

  -- Layout ordering
  component_layout_order JSONB DEFAULT '[]'::jsonb,

  -- Dynamic Generation Tracking
  is_ai_generated BOOLEAN DEFAULT FALSE,
  generated_from_prompt TEXT,
  generation_confidence FLOAT,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprints_slug
  ON website_type_blueprints(slug);

CREATE INDEX IF NOT EXISTS idx_blueprints_popularity
  ON website_type_blueprints(popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_blueprints_keywords
  ON website_type_blueprints USING GIN(prompt_keywords);

CREATE INDEX IF NOT EXISTS idx_blueprints_ai_generated
  ON website_type_blueprints(is_ai_generated);


-- ════════════════════════════════════════════════════════════
-- 3. INDUSTRY VERTICALS
--    50+ industry sectors with style prefs & compliance flags.
--    Self-referencing hierarchy for sub-industries.
-- ════════════════════════════════════════════════════════════

CREATE TABLE industry_verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Style Preferences
  preferred_color_modes JSONB DEFAULT '[]'::jsonb,
  preferred_color_themes JSONB DEFAULT '[]'::jsonb,
  preferred_typography JSONB DEFAULT '[]'::jsonb,
  preferred_animation_level TEXT DEFAULT 'medium',

  -- Component Preferences
  high_priority_categories JSONB DEFAULT '[]'::jsonb,
  low_priority_categories JSONB DEFAULT '[]'::jsonb,
  banned_categories JSONB DEFAULT '[]'::jsonb,

  -- Compliance / Restrictions
  requires_accessibility BOOLEAN DEFAULT FALSE,
  requires_gdpr BOOLEAN DEFAULT FALSE,
  requires_hipaa BOOLEAN DEFAULT FALSE,

  -- Hierarchy
  parent_vertical_id UUID REFERENCES industry_verticals(id) ON DELETE SET NULL,
  depth INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  icon TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verticals_slug
  ON industry_verticals(slug);

CREATE INDEX IF NOT EXISTS idx_verticals_parent
  ON industry_verticals(parent_vertical_id);


-- ════════════════════════════════════════════════════════════
-- 4. COMPONENT COMPATIBILITY GRAPH
--    Pairing scores between component types.
--    Used by AI to pick components that work well together.
-- ════════════════════════════════════════════════════════════

CREATE TABLE component_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_a_id TEXT NOT NULL,
  component_b_id TEXT NOT NULL,

  compatibility_score FLOAT DEFAULT 0.5,
  relationship TEXT DEFAULT 'neutral'
    CHECK (relationship IN (
      'perfect-pair',
      'complementary',
      'neutral',
      'style-clash',
      'incompatible'
    )),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(component_a_id, component_b_id)
);

CREATE INDEX IF NOT EXISTS idx_compat_a
  ON component_compatibility(component_a_id);

CREATE INDEX IF NOT EXISTS idx_compat_b
  ON component_compatibility(component_b_id);

CREATE INDEX IF NOT EXISTS idx_compat_score
  ON component_compatibility(compatibility_score DESC);


-- ════════════════════════════════════════════════════════════
-- 5. COLOR THEMES
--    30+ curated palettes with full hex values,
--    CSS vars, Tailwind config, and industry suitability.
-- ════════════════════════════════════════════════════════════

CREATE TABLE color_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Full Palette
  palette JSONB DEFAULT '{}'::jsonb,
  css_variables JSONB DEFAULT '{}'::jsonb,
  tailwind_config JSONB DEFAULT '{}'::jsonb,

  -- Classification
  mode TEXT CHECK (mode IN ('dark', 'light', 'mixed', 'adaptive')),
  warmth TEXT CHECK (warmth IN ('warm', 'cool', 'neutral', 'vibrant', 'muted')),
  intensity TEXT CHECK (intensity IN ('subtle', 'medium', 'bold', 'extreme')),

  -- Industry Suitability
  suitable_industries JSONB DEFAULT '[]'::jsonb,
  suitable_website_types JSONB DEFAULT '[]'::jsonb,

  -- Accessibility
  wcag_aa_compliant BOOLEAN DEFAULT TRUE,
  contrast_ratio_min FLOAT DEFAULT 4.5,

  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_themes_slug
  ON color_themes(slug);

CREATE INDEX IF NOT EXISTS idx_themes_mode
  ON color_themes(mode);


-- ════════════════════════════════════════════════════════════
-- 6. COMPONENT VARIANT SYSTEM
--    Adds variant columns to the existing `components` table.
--    Allows one component to have dark/light/compact variants.
-- ════════════════════════════════════════════════════════════

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS variant_of TEXT;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS variant_label TEXT;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS variant_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_components_variant_of
  ON components(variant_of);


-- ════════════════════════════════════════════════════════════
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
--    All new tables: readable by anyone, writable by service_role only.
-- ════════════════════════════════════════════════════════════

-- ── component_categories ──
ALTER TABLE component_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "component_categories_select_all" ON component_categories;
CREATE POLICY "component_categories_select_all"
  ON component_categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "component_categories_insert_service" ON component_categories;
CREATE POLICY "component_categories_insert_service"
  ON component_categories FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "component_categories_update_service" ON component_categories;
CREATE POLICY "component_categories_update_service"
  ON component_categories FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "component_categories_delete_service" ON component_categories;
CREATE POLICY "component_categories_delete_service"
  ON component_categories FOR DELETE
  TO service_role
  USING (true);

-- ── website_type_blueprints ──
ALTER TABLE website_type_blueprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blueprints_select_all" ON website_type_blueprints;
CREATE POLICY "blueprints_select_all"
  ON website_type_blueprints FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "blueprints_insert_service" ON website_type_blueprints;
CREATE POLICY "blueprints_insert_service"
  ON website_type_blueprints FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "blueprints_update_service" ON website_type_blueprints;
CREATE POLICY "blueprints_update_service"
  ON website_type_blueprints FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "blueprints_delete_service" ON website_type_blueprints;
CREATE POLICY "blueprints_delete_service"
  ON website_type_blueprints FOR DELETE
  TO service_role
  USING (true);

-- ── industry_verticals ──
ALTER TABLE industry_verticals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verticals_select_all" ON industry_verticals;
CREATE POLICY "verticals_select_all"
  ON industry_verticals FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "verticals_insert_service" ON industry_verticals;
CREATE POLICY "verticals_insert_service"
  ON industry_verticals FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "verticals_update_service" ON industry_verticals;
CREATE POLICY "verticals_update_service"
  ON industry_verticals FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "verticals_delete_service" ON industry_verticals;
CREATE POLICY "verticals_delete_service"
  ON industry_verticals FOR DELETE
  TO service_role
  USING (true);

-- ── component_compatibility ──
ALTER TABLE component_compatibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compatibility_select_all" ON component_compatibility;
CREATE POLICY "compatibility_select_all"
  ON component_compatibility FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "compatibility_insert_service" ON component_compatibility;
CREATE POLICY "compatibility_insert_service"
  ON component_compatibility FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "compatibility_update_service" ON component_compatibility;
CREATE POLICY "compatibility_update_service"
  ON component_compatibility FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "compatibility_delete_service" ON component_compatibility;
CREATE POLICY "compatibility_delete_service"
  ON component_compatibility FOR DELETE
  TO service_role
  USING (true);

-- ── color_themes ──
ALTER TABLE color_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "themes_select_all" ON color_themes;
CREATE POLICY "themes_select_all"
  ON color_themes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "themes_insert_service" ON color_themes;
CREATE POLICY "themes_insert_service"
  ON color_themes FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "themes_update_service" ON color_themes;
CREATE POLICY "themes_update_service"
  ON color_themes FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "themes_delete_service" ON color_themes;
CREATE POLICY "themes_delete_service"
  ON color_themes FOR DELETE
  TO service_role
  USING (true);


-- ════════════════════════════════════════════════════════════
-- DONE — Phase S7 database schema is ready.
-- Next: Run Prompt 2 seed script to populate reference data.
-- ════════════════════════════════════════════════════════════
