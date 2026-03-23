-- Migration 008: Phase S9 Core Community Schema & Lifecycle

-- 1. Create Types for Statuses
DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM (
        'draft', 'processing', 'pending_review', 'approved', 'rejected', 'flagged', 'active', 'deprecated', 'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'pending', 'running', 'completed', 'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. community_submissions table
CREATE TABLE IF NOT EXISTS community_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references auth.users in Supabase
    submission_type TEXT CHECK (submission_type IN ('component', 'template', 'template_scratch')) DEFAULT 'component',
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    cleaned_code TEXT,
    content_hash TEXT, -- SHA-256 for deduplication
    quality_score FLOAT,
    status submission_status DEFAULT 'processing',
    rejection_reason TEXT,
    improvement_suggestions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. submission_jobs async queue
CREATE TABLE IF NOT EXISTS submission_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES community_submissions(id) ON DELETE CASCADE,
    status job_status DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_log TEXT,
    retry_after TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. llm_cost_log for budget tracking
CREATE TABLE IF NOT EXISTS llm_cost_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation TEXT NOT NULL,
    model TEXT NOT NULL,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper function to get daily LLM cost
CREATE OR REPLACE FUNCTION get_daily_llm_cost() 
RETURNS NUMERIC AS $$
DECLARE
    daily_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO daily_total
    FROM llm_cost_log
    WHERE created_at >= date_trunc('day', NOW());
    RETURN daily_total;
END;
$$ LANGUAGE plpgsql;

-- 5. ai_selection_events feedback loop
CREATE TABLE IF NOT EXISTS ai_selection_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id TEXT NOT NULL,
    component_id UUID NOT NULL, -- We will add FK below after altering components
    was_selected BOOLEAN DEFAULT false,
    was_kept BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. component_ratings
CREATE TABLE IF NOT EXISTS component_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL, -- We will add FK below
    user_id UUID NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (component_id, user_id)
);

-- 7. Alter existing components table
ALTER TABLE components 
  ADD COLUMN IF NOT EXISTS preview_video_url TEXT,
  ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES community_submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_component_id UUID REFERENCES components(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rating_avg FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Now add foreign key for ai_selection_events.component_id (components table already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_ai_selection_component'
  ) THEN
    ALTER TABLE ai_selection_events
      ADD CONSTRAINT fk_ai_selection_component
      FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign key for component_ratings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_component_ratings_component'
  ) THEN
    ALTER TABLE component_ratings
      ADD CONSTRAINT fk_component_ratings_component
      FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8. Indexes

-- Indexes for community_submissions
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON community_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON community_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_hash ON community_submissions(content_hash);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON community_submissions(created_at);

-- Indexes for submission_jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status_retry ON submission_jobs(status, retry_after) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_submission_id ON submission_jobs(submission_id);

-- Indexes for llm_cost_log
CREATE INDEX IF NOT EXISTS idx_cost_log_created_at ON llm_cost_log(created_at);

-- Indexes for component_ratings
CREATE INDEX IF NOT EXISTS idx_ratings_component_id ON component_ratings(component_id);

-- Indexes for components (new columns)
CREATE INDEX IF NOT EXISTS idx_components_submission_id ON components(submission_id);
CREATE INDEX IF NOT EXISTS idx_components_content_hash ON components(content_hash);
CREATE INDEX IF NOT EXISTS idx_components_parent_id ON components(parent_component_id);

-- Add update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_community_submissions_modtime
        BEFORE UPDATE ON community_submissions
        FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_submission_jobs_modtime
        BEFORE UPDATE ON submission_jobs
        FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_component_ratings_modtime
        BEFORE UPDATE ON component_ratings
        FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
