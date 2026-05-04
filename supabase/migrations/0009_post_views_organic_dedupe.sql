-- Organic per-viewer view dedupe.
--
-- A viewer (logged-in or anonymous) is identified by a stable id passed
-- from the API layer (httpOnly `pf_vid` cookie for anon, "u:<auth_uid>" for
-- authenticated). The table stores at most one row per (post, viewer); the
-- RPC inserts that row and only bumps posts.views when the insert was
-- actually fresh, so refreshing the page can never increment more than once.

CREATE TABLE IF NOT EXISTS public.post_view_dedupe (
  post_id    uuid        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id  text        NOT NULL,
  viewed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, viewer_id)
);

ALTER TABLE public.post_view_dedupe ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER RPC below may read/write this table.

CREATE OR REPLACE FUNCTION public.record_post_view(
  p_post_id   uuid,
  p_viewer_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count int;
BEGIN
  IF p_post_id IS NULL OR p_viewer_id IS NULL OR length(p_viewer_id) = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.post_view_dedupe(post_id, viewer_id)
  VALUES (p_post_id, p_viewer_id)
  ON CONFLICT (post_id, viewer_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count > 0 THEN
    UPDATE public.posts
       SET views = views + 1
     WHERE id = p_post_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_post_view(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_post_view(uuid, text) TO authenticated, anon;

-- The legacy unconditional increment is now an attractive nuisance.
-- Revoke it so callers must go through record_post_view.
REVOKE EXECUTE ON FUNCTION public.increment_post_views(uuid) FROM authenticated, anon;
