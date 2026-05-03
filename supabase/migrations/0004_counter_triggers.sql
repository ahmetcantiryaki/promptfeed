-- Keep posts.likes / posts.shares in sync with post_likes / post_saves.
--
-- The application currently denormalises these counters on the posts row but
-- never updates them when interactions happen, so the "top" sort drifts and
-- the displayed count diverges from the real one. These triggers fix that.

-- ─── likes ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.post_likes_bump_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts
       SET likes = likes + 1
     WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts
       SET likes = GREATEST(likes - 1, 0)
     WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_likes_bump_counter_trg ON public.post_likes;
CREATE TRIGGER post_likes_bump_counter_trg
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.post_likes_bump_counter();

-- ─── saves (stored as posts.shares for legacy reasons) ───────────────────
CREATE OR REPLACE FUNCTION public.post_saves_bump_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts
       SET shares = shares + 1
     WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts
       SET shares = GREATEST(shares - 1, 0)
     WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_saves_bump_counter_trg ON public.post_saves;
CREATE TRIGGER post_saves_bump_counter_trg
  AFTER INSERT OR DELETE ON public.post_saves
  FOR EACH ROW
  EXECUTE FUNCTION public.post_saves_bump_counter();

-- ─── one-time backfill — recompute counters from real interaction rows ──
-- Safe to re-run; the WHERE ensures only changed rows are touched.
UPDATE public.posts p
   SET likes = COALESCE(c.cnt, 0)
  FROM (
    SELECT post_id, COUNT(*) AS cnt
      FROM public.post_likes
     GROUP BY post_id
  ) c
 WHERE c.post_id = p.id
   AND p.likes IS DISTINCT FROM c.cnt;

UPDATE public.posts p
   SET shares = COALESCE(c.cnt, 0)
  FROM (
    SELECT post_id, COUNT(*) AS cnt
      FROM public.post_saves
     GROUP BY post_id
  ) c
 WHERE c.post_id = p.id
   AND p.shares IS DISTINCT FROM c.cnt;
