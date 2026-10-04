-- ═══════════════════════════════════════════════════════════════
-- 024: Semantic component retrieval (pgvector)
--
-- Adds an embedding column + HNSW index to `components` and an RPC for
-- similarity search. Embeddings are generated from the AI-extracted design
-- metadata (visual_description, description, tags, suitable_for, mood_tone)
-- so the agent can retrieve components by meaning, not keyword overlap.
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_text_hash TEXT,
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- HNSW scales better than IVFFlat for incremental community submissions.
CREATE INDEX IF NOT EXISTS idx_components_embedding_hnsw
  ON components USING hnsw (embedding vector_cosine_ops);

-- ═══════════════════════════════════════════════════════════════
-- Similarity search RPC (active components only)
-- Returns cosine similarity in [0, 1].
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_components(
  query_embedding vector(768),
  match_count INT DEFAULT 40
)
RETURNS TABLE (
  id UUID,
  component_id TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.component_id,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM components c
  WHERE c.status = 'active'
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ═══════════════════════════════════════════════════════════════
-- Agent usage telemetry (component flywheel)
-- `installed`  — agent wrote the bundle into a sandbox
-- `survived`   — installed files still present in the project's final snapshot
-- `removed`    — installed files were deleted before the final snapshot
-- Survival rate feeds retrieval ranking and author reputation.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS component_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES components(id) ON DELETE CASCADE,
  component_slug TEXT,
  project_id UUID,
  session_id UUID,
  event TEXT NOT NULL CHECK (event IN ('installed', 'survived', 'removed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_component_usage_events_component
  ON component_usage_events (component_id, event);
CREATE INDEX IF NOT EXISTS idx_component_usage_events_project
  ON component_usage_events (project_id);

-- Aggregated survival stats for ranking.
CREATE OR REPLACE VIEW component_survival_stats AS
SELECT
  component_id,
  COUNT(*) FILTER (WHERE event = 'installed') AS installs,
  COUNT(*) FILTER (WHERE event = 'survived') AS survivals,
  COUNT(*) FILTER (WHERE event = 'removed') AS removals,
  CASE
    WHEN COUNT(*) FILTER (WHERE event IN ('survived', 'removed')) = 0 THEN NULL
    ELSE COUNT(*) FILTER (WHERE event = 'survived')::float
         / COUNT(*) FILTER (WHERE event IN ('survived', 'removed'))
  END AS survival_rate
FROM component_usage_events
WHERE component_id IS NOT NULL
GROUP BY component_id;
