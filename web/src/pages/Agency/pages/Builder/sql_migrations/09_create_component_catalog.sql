-- Phase S6: Component Catalog Migration Schema
-- Description: Creates components, categories, and templates tables for migrating the registry JSONs to Supabase.

-- 1. Create component_categories table
CREATE TABLE IF NOT EXISTS component_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  parent_category_id UUID REFERENCES component_categories(id),
  depth INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  icon TEXT,
  color TEXT,
  component_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create components table
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  version TEXT DEFAULT 'v1',

  -- Ownership
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_type TEXT DEFAULT 'official' CHECK (author_type IN ('official', 'community', 'partner')),

  -- Classification
  category TEXT NOT NULL,
  subcategory TEXT,
  component_type TEXT NOT NULL,

  -- Rich Metadata
  display_name TEXT,
  description TEXT,
  visual_description TEXT,
  mood_tone TEXT,
  design_personality JSONB,

  -- Color Profile
  color_mode TEXT CHECK (color_mode IN ('dark', 'light', 'mixed', 'adaptive')),
  color_primary TEXT,
  color_secondary TEXT,
  color_accent TEXT,
  color_background TEXT,
  color_palette JSONB,
  color_warmth TEXT CHECK (color_warmth IN ('warm', 'cool', 'neutral', 'vibrant')),
  color_theme TEXT,

  -- Typography
  typography_style TEXT,
  typography_heading_font TEXT,
  typography_body_font TEXT,

  -- Layout
  layout_type TEXT,
  layout_columns INTEGER,
  layout_spacing TEXT,
  border_radius TEXT,

  -- Industry Suitability
  suitable_for JSONB,
  not_suitable_for JSONB,
  industry_tags JSONB,

  -- Feature Flags
  supports JSONB,
  requires JSONB,
  responsive BOOLEAN DEFAULT TRUE,
  has_animation BOOLEAN DEFAULT FALSE,
  animation_type TEXT,

  -- Tags & Keywords
  tags JSONB,
  keywords JSONB,
  search_vector tsvector,

  -- Quality & Popularity
  quality_score FLOAT DEFAULT 5.0,
  usage_count INTEGER DEFAULT 0,
  rating_avg FLOAT DEFAULT 0,
  rating_count INTEGER DEFAULT 0,

  -- Visual Assets
  preview_image_url TEXT,
  thumbnail_url TEXT,

  -- Code Bundle
  bundle_code JSONB NOT NULL,
  bundle_size_bytes INTEGER,

  -- Status & Moderation
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected', 'deprecated', 'archived')),
  is_premium BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  visual_description TEXT,
  author_id UUID REFERENCES profiles(id),
  author_type TEXT DEFAULT 'official',
  category TEXT,
  industry_tags JSONB,
  color_mode TEXT,
  color_palette JSONB,
  design_system JSONB,
  component_ids JSONB,
  component_count INTEGER DEFAULT 0,
  template_code JSONB NOT NULL,
  app_wrapper_class TEXT,
  preview_image_url TEXT,
  thumbnail_url TEXT,
  quality_score FLOAT DEFAULT 5.0,
  usage_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for components
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);
CREATE INDEX IF NOT EXISTS idx_components_component_type ON components(component_type);
CREATE INDEX IF NOT EXISTS idx_components_color_mode ON components(color_mode);
CREATE INDEX IF NOT EXISTS idx_components_status ON components(status);
CREATE INDEX IF NOT EXISTS idx_components_quality_score ON components(quality_score);
CREATE INDEX IF NOT EXISTS idx_components_search ON components USING GIN(search_vector);
