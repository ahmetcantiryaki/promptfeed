-- Add views counter to posts table.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

-- RPC to atomically increment a post's view count.
-- Granted to both authenticated and anon roles so anonymous visitors are counted.
CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
     SET views = views + 1
   WHERE id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO anon;

-- Partial index for leaderboard sort (top posts by views).
CREATE INDEX IF NOT EXISTS idx_posts_views_desc ON public.posts (views DESC);
