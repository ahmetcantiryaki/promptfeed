-- Indexes for the app's hot paths. All `IF NOT EXISTS` so the migration is
-- idempotent and safe to re-run.

-- post_likes / post_saves — primary lookups by user, by post, and the unique
-- (user, post) tuple used for "is this saved/liked?" checks.
CREATE UNIQUE INDEX IF NOT EXISTS post_likes_user_post_uniq
  ON public.post_likes (user_id, post_id);
CREATE INDEX IF NOT EXISTS post_likes_post_idx
  ON public.post_likes (post_id);

CREATE UNIQUE INDEX IF NOT EXISTS post_saves_user_post_uniq
  ON public.post_saves (user_id, post_id);
CREATE INDEX IF NOT EXISTS post_saves_folder_idx
  ON public.post_saves (folder_id);
CREATE INDEX IF NOT EXISTS post_saves_user_folder_idx
  ON public.post_saves (user_id, folder_id);

-- save_folders — every folder query filters by user.
CREATE INDEX IF NOT EXISTS save_folders_user_idx
  ON public.save_folders (user_id);

-- social_accounts — joined to profile in OwnerInfo lookups.
CREATE INDEX IF NOT EXISTS social_accounts_profile_idx
  ON public.social_accounts (profile_id);

-- posts — feed sorts and filters.
CREATE INDEX IF NOT EXISTS posts_posted_at_idx
  ON public.posts (posted_at DESC);
CREATE INDEX IF NOT EXISTS posts_media_posted_idx
  ON public.posts (media_type, posted_at DESC);
CREATE INDEX IF NOT EXISTS posts_top_idx
  ON public.posts (media_type, likes DESC, posted_at DESC);
CREATE INDEX IF NOT EXISTS posts_model_idx
  ON public.posts (model_slug);
CREATE INDEX IF NOT EXISTS posts_platform_idx
  ON public.posts (platform_slug);
CREATE INDEX IF NOT EXISTS posts_owner_idx
  ON public.posts (owner_id);

-- profiles — handle is the public lookup key. UNIQUE prevents duplicate
-- handles. Skip if existing data has duplicates — clean those up first.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_uniq
  ON public.profiles (LOWER(handle))
  WHERE handle IS NOT NULL;

-- reports — list "open" first.
CREATE INDEX IF NOT EXISTS reports_status_created_idx
  ON public.reports (status, created_at DESC);
