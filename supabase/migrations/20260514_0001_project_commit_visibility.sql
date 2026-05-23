-- Volturiano MVP: hide in-flight project rows until a real build checkpoint exists.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_committed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ;

UPDATE public.projects
SET
  is_committed = CASE
    WHEN build_status IN ('preview', 'published') THEN true
    WHEN thumbnail_url IS NOT NULL THEN true
    WHEN generated_files IS NOT NULL
      AND generated_files <> 'null'::jsonb
      AND generated_files <> '[]'::jsonb
      AND generated_files <> '{}'::jsonb THEN true
    ELSE false
  END,
  committed_at = CASE
    WHEN build_status IN ('preview', 'published')
      OR thumbnail_url IS NOT NULL
      OR (
        generated_files IS NOT NULL
        AND generated_files <> 'null'::jsonb
        AND generated_files <> '[]'::jsonb
        AND generated_files <> '{}'::jsonb
      )
    THEN COALESCE(committed_at, updated_at, created_at, NOW())
    ELSE committed_at
  END;

CREATE INDEX IF NOT EXISTS idx_projects_user_committed_updated
  ON public.projects(user_id, is_committed, updated_at DESC);
