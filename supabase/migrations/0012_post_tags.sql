-- Multi-tag taxonomy v1: subject / style / use_case axes as one controlled
-- vocabulary (public.tags) plus an M2M junction (public.post_tags).
--
-- Why a single tags table for all three axes:
--   * The picker UI iterates "tagsByAxis" — one SELECT returns the whole
--     vocabulary, axis is a column.
--   * Counter-cache mirrors the models/platforms pattern (migration 0004).
--   * Adding/renaming axes later is a value change, not a schema change.

-- 1) Vocabulary -----------------------------------------------------------
CREATE TABLE public.tags (
  slug          text PRIMARY KEY,
  name          text NOT NULL,
  axis          text NOT NULL CHECK (axis IN ('subject', 'style', 'use_case')),
  display_order int  NOT NULL DEFAULT 100,
  post_count    int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tags_axis_order_idx ON public.tags(axis, display_order, name);

-- 2) Junction -------------------------------------------------------------
CREATE TABLE public.post_tags (
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_slug   text NOT NULL REFERENCES public.tags(slug) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, tag_slug)
);
CREATE INDEX post_tags_tag_idx  ON public.post_tags(tag_slug, post_id);
CREATE INDEX post_tags_post_idx ON public.post_tags(post_id);

-- 3) Max-5-tags-per-post --------------------------------------------------
-- BEFORE INSERT keeps the check cheap; PK on (post_id, tag_slug) already
-- prevents the same tag from appearing twice on the same post.
CREATE OR REPLACE FUNCTION public.post_tags_enforce_max()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_count int;
BEGIN
  SELECT COUNT(*) INTO current_count
    FROM public.post_tags
   WHERE post_id = NEW.post_id;
  IF current_count >= 5 THEN
    RAISE EXCEPTION 'A post can have at most 5 tags (post_id=%)', NEW.post_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_tags_enforce_max_trg ON public.post_tags;
CREATE TRIGGER post_tags_enforce_max_trg
  BEFORE INSERT ON public.post_tags
  FOR EACH ROW EXECUTE FUNCTION public.post_tags_enforce_max();

-- 4) Counter trigger for tags.post_count ---------------------------------
-- Mirrors the models/platforms counter pattern (migration 0004). Fires on
-- cascade-delete too (when a post is removed, its post_tags rows are
-- DELETEd by the FK and the trigger runs per row).
CREATE OR REPLACE FUNCTION public.post_tags_bump_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.tags
       SET post_count = post_count + 1
     WHERE slug = NEW.tag_slug;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.tags
       SET post_count = GREATEST(post_count - 1, 0)
     WHERE slug = OLD.tag_slug;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_tags_bump_counter_trg ON public.post_tags;
CREATE TRIGGER post_tags_bump_counter_trg
  AFTER INSERT OR DELETE ON public.post_tags
  FOR EACH ROW EXECUTE FUNCTION public.post_tags_bump_counter();

-- 5) RLS ------------------------------------------------------------------
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- tags: public read, admin write (service role bypasses RLS for seeding).
DROP POLICY IF EXISTS tags_select_public ON public.tags;
CREATE POLICY tags_select_public
  ON public.tags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS tags_write_admin ON public.tags;
CREATE POLICY tags_write_admin
  ON public.tags FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- post_tags: public read; the post owner (or admin) can attach/detach tags.
DROP POLICY IF EXISTS post_tags_select_public ON public.post_tags;
CREATE POLICY post_tags_select_public
  ON public.post_tags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS post_tags_write_owner ON public.post_tags;
CREATE POLICY post_tags_write_owner
  ON public.post_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_tags.post_id
        AND (p.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_tags.post_id
        AND (p.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 6) Seed v1 taxonomy (30 rows) -------------------------------------------
INSERT INTO public.tags (slug, name, axis, display_order) VALUES
  -- Subject (11) — ordered by approximate prevalence in the current corpus
  ('portrait',     'Portrait',     'subject',  10),
  ('ui-mockup',    'UI Mockup',    'subject',  20),
  ('fashion',      'Fashion',      'subject',  30),
  ('landscape',    'Landscape',    'subject',  40),
  ('typography',   'Typography',   'subject',  50),
  ('architecture', 'Architecture', 'subject',  60),
  ('product',      'Product',      'subject',  70),
  ('food',         'Food',         'subject',  80),
  ('still-life',   'Still Life',   'subject',  90),
  ('vehicle',      'Vehicle',      'subject', 100),
  ('animal',       'Animal',       'subject', 110),
  -- Style (10)
  ('photoreal',     'Photoreal',       'style',  10),
  ('cinematic',     'Cinematic',       'style',  20),
  ('illustration',  'Illustration',    'style',  30),
  ('minimalist',    'Minimalist',      'style',  40),
  ('cartoon-3d',    'Cartoon / 3D',    'style',  50),
  ('ink-eastern',   'Ink / Eastern',   'style',  60),
  ('vintage-retro', 'Vintage / Retro', 'style',  70),
  ('cyber-scifi',   'Cyber / Sci-Fi',  'style',  80),
  ('anime',         'Anime',           'style',  90),
  ('fantasy',       'Fantasy',         'style', 100),
  -- Use Case (9)
  ('editorial',    'Editorial',    'use_case', 10),
  ('poster',       'Poster',       'use_case', 20),
  ('branding',     'Branding',     'use_case', 30),
  ('advertising',  'Advertising',  'use_case', 40),
  ('packaging',    'Packaging',    'use_case', 50),
  ('storyboard',   'Storyboard',   'use_case', 60),
  ('concept-art',  'Concept Art',  'use_case', 70),
  ('infographic',  'Infographic',  'use_case', 80),
  ('social-media', 'Social Media', 'use_case', 90)
ON CONFLICT (slug) DO NOTHING;
