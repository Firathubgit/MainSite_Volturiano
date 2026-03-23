-- Phase S6: Component Catalog Migration — Table Schema Updates
-- Run this in the Supabase SQL Editor

-- 1. Enhance Components Table with Rich Metadata (30+ fields)
ALTER TABLE components 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS visual_description TEXT,
ADD COLUMN IF NOT EXISTS mood_tone TEXT,
ADD COLUMN IF NOT EXISTS design_personality JSONB,
ADD COLUMN IF NOT EXISTS color_mode TEXT CHECK (color_mode IN ('dark', 'light', 'mixed', 'adaptive')),
ADD COLUMN IF NOT EXISTS color_primary TEXT,
ADD COLUMN IF NOT EXISTS color_secondary TEXT,
ADD COLUMN IF NOT EXISTS color_accent TEXT,
ADD COLUMN IF NOT EXISTS color_background TEXT,
ADD COLUMN IF NOT EXISTS color_palette JSONB,
ADD COLUMN IF NOT EXISTS color_warmth TEXT CHECK (color_warmth IN ('warm', 'cool', 'neutral', 'vibrant')),
ADD COLUMN IF NOT EXISTS color_theme TEXT,
ADD COLUMN IF NOT EXISTS typography_style TEXT,
ADD COLUMN IF NOT EXISTS typography_heading_font TEXT,
ADD COLUMN IF NOT EXISTS typography_body_font TEXT;

-- 2. Performance Indexes for Components
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);
CREATE INDEX IF NOT EXISTS idx_components_component_type ON components(component_type);
CREATE INDEX IF NOT EXISTS idx_components_color_mode ON components(color_mode);
CREATE INDEX IF NOT EXISTS idx_components_status ON components(status);
CREATE INDEX IF NOT EXISTS idx_components_quality_score ON components(quality_score);
-- idx_components_search depends on tsvector column search_vector which should already exist
-- CREATE INDEX IF NOT EXISTS idx_components_search ON components USING GIN(search_vector);

-- 3. Component Categories Table
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

-- 4. Templates Table
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
  preview_image_url TEXT,
  thumbnail_url TEXT,
  quality_score FLOAT DEFAULT 5.0,
  usage_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
