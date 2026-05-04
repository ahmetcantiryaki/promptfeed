-- Sort feeds by Feedlens insert time (created_at) instead of source post time
-- (posted_at). The existing posts_posted_at_idx still serves the per-post
-- detail page's "originally posted N days ago" timeline; this new index
-- powers /api/posts and the homepage feed.

CREATE INDEX IF NOT EXISTS posts_created_at_idx
  ON public.posts (created_at DESC);

CREATE INDEX IF NOT EXISTS posts_media_type_created_at_idx
  ON public.posts (media_type, created_at DESC);

CREATE INDEX IF NOT EXISTS posts_media_type_likes_created_at_idx
  ON public.posts (media_type, likes DESC, created_at DESC);
