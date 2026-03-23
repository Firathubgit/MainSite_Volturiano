-- Migration 014: Phase 24 "Liked Components" System
-- Goal: Rename user_bookmarks to component_likes, add counters, and social triggers.

-- 1. Rename existing table to follow "Like" branding
ALTER TABLE user_bookmarks RENAME TO component_likes;

-- 2. Add likes_count column to components table
ALTER TABLE components ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- 3. Create the social trigger function to keep counts in sync
CREATE OR REPLACE FUNCTION update_component_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE components SET likes_count = likes_count + 1 WHERE id = NEW.component_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE components SET likes_count = likes_count - 1 WHERE id = OLD.component_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach the trigger
DROP TRIGGER IF EXISTS on_component_like_change ON component_likes;
CREATE TRIGGER on_component_like_change
  AFTER INSERT OR DELETE ON component_likes
  FOR EACH ROW EXECUTE FUNCTION update_component_likes_count();

-- 5. Seed initial counts based on existing data
UPDATE components c
SET likes_count = (
  SELECT count(*)
  FROM component_likes cl
  WHERE cl.component_id = c.id
);

-- 6. Enforce RLS
ALTER TABLE component_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all likes" ON component_likes;
CREATE POLICY "Users can view all likes" ON component_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own likes" ON component_likes;
CREATE POLICY "Users can manage own likes" ON component_likes 
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
