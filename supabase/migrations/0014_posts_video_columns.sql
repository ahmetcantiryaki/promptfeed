-- Optional metadata for video posts. Pure-embed architecture: the player
-- is an iframe pointed at the source provider, so we only need enough
-- metadata to render a card preview and reserve the layout slot before
-- the iframe loads.
--
--   aspect_ratio       — width / height (e.g. 1.777 for 16:9). Lets the
--                        masonry reserve exact space and avoid CLS.
--   embed_provider     — 'youtube' | 'x' | 'tiktok' | 'instagram' |
--                        'reddit' | 'vimeo' | 'native'. Picks the iframe
--                        builder directly; scraper sets it explicitly.
--   duration_seconds   — drives the "1:23" badge in the corner; optional.
--
-- All three are nullable so existing image rows aren't touched and a
-- video can land with the minimum data set.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS aspect_ratio numeric,
  ADD COLUMN IF NOT EXISTS embed_provider text,
  ADD COLUMN IF NOT EXISTS duration_seconds int;

-- Narrow index for the "videos only" feed slice. Newest-first ordering
-- matches the discover default and the route's `?type=video` filter.
CREATE INDEX IF NOT EXISTS posts_video_created_idx
  ON public.posts (created_at DESC)
  WHERE media_type = 'video';
