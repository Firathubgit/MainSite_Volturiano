-- Migration 010: Phase S9 Reputation Engine & Rating Triggers
-- Spec: S9.11 (Rating Triggers), S9.12 (Reputation System)
-- Dependencies: 008 + 009 must be run first

-- ═══════════════════════════════════════════════════════════════
-- 1. RATING AGGREGATOR TRIGGER
-- Auto-recalculates rating_avg and rating_count on the components
-- table whenever a review is inserted, updated, or deleted.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_component_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE components SET
    rating_avg = (SELECT AVG(rating)::FLOAT FROM component_ratings WHERE component_id = COALESCE(NEW.component_id, OLD.component_id)),
    rating_count = (SELECT COUNT(*) FROM component_ratings WHERE component_id = COALESCE(NEW.component_id, OLD.component_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.component_id, OLD.component_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER on_rating_change
    AFTER INSERT OR UPDATE OR DELETE ON component_ratings
    FOR EACH ROW EXECUTE FUNCTION update_component_rating_stats();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. SELF-RATING PREVENTION TRIGGER
-- Prevents users from rating components they authored.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION prevent_self_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM components WHERE id = NEW.component_id AND author_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot rate your own component';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER check_self_rating
    BEFORE INSERT ON component_ratings
    FOR EACH ROW EXECUTE FUNCTION prevent_self_rating();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. REPUTATION SYSTEM
-- Increments or decrements a user's reputation_score.
-- Also increments components_submitted when points >= 10 (approval).
-- ═══════════════════════════════════════════════════════════════

-- First ensure the profiles table has the required columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS components_submitted INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_reputation(p_user_id UUID, p_points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET
    reputation_score = GREATEST(0, COALESCE(reputation_score, 0) + p_points),
    components_submitted = CASE
      WHEN p_points > 0 AND p_points >= 10 THEN COALESCE(components_submitted, 0) + 1
      ELSE COALESCE(components_submitted, 0)
    END,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 4. REPUTATION POINTS SCHEDULE (reference comments)
-- ═══════════════════════════════════════════════════════════════
--
-- REPUTATION SCHEDULE — Called from JS application code:
--   increment_reputation(user_id, points)
--
-- TRIGGER EVENT                          |  POINTS
-- ────────────────────────────────────────|────────
-- Component submitted (enters processing)|  +5
-- Component auto-approved (quality >= 8) |  +15
-- Component manually approved            |  +10
-- Component auto-rejected (quality < 4)  |  -2
-- Component used in a build              |  +1  (per use)
-- Component rated 4+ stars               |  +3
-- Component reaches 100 uses (milestone) |  +25
-- Template submitted                     |  +8
-- Template approved                      |  +15
-- Flagged for review                     |  -5
-- Confirmed violation                    |  -20
-- Self-removed by author (deprecated)    |  -5
--
-- CONTRIBUTOR LEVELS (derived from reputation_score):
--   0-100:    Explorer
--   101-500:  Builder
--   501-2000: Architect (unlocks verified badge)
--   2001+:    Master (unlocks 'Featured' placement priority)

-- ═══════════════════════════════════════════════════════════════
-- 5. COMPONENT VERSIONING VIEW
-- Returns only the latest active version of each component.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW latest_active_components AS
SELECT DISTINCT ON (component_id) *
FROM components
WHERE status = 'active'
ORDER BY component_id, version_number DESC;

-- ═══════════════════════════════════════════════════════════════
-- 6. USAGE COUNT TRACKING AND MILESTONES (S9.14)
-- Increments usage_count and awards +25 rep at 100 uses.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_usage_count(p_component_id UUID)
RETURNS VOID AS $$
DECLARE
  v_new_count INTEGER;
  v_author_id UUID;
BEGIN
  -- Increment usage count and get new value + author
  UPDATE components 
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_component_id
  RETURNING usage_count, author_id INTO v_new_count, v_author_id;

  -- Milestone: Component reaches exactly 100 uses
  IF v_new_count = 100 AND v_author_id IS NOT NULL THEN
    PERFORM increment_reputation(v_author_id, 25);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

