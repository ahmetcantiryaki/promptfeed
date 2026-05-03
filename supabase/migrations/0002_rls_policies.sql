-- Least-privilege RLS policies for PromptFeed.
--
-- Convention:
--   * SELECT       — public/global where it makes sense (posts, profiles),
--                    owner-only for private things (saves, folders, socials).
--   * INSERT/UPDATE/DELETE — owner only, with admin override via is_admin().
--
-- A helper function lets policies check the admin flag without recursing
-- through profiles' RLS.

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = uid),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;

-- ─── profiles ────────────────────────────────────────────────────────────
-- Any visitor may read profile cards (public site).
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_public
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Note: column-level lock on is_admin / is_banned / is_verified is enforced
-- in 0003_profiles_is_admin_lock.sql via a trigger.
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_delete_admin
  ON public.profiles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ─── posts ───────────────────────────────────────────────────────────────
-- Public feed — anyone may read.
DROP POLICY IF EXISTS posts_select_public ON public.posts;
CREATE POLICY posts_select_public
  ON public.posts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS posts_insert_owner ON public.posts;
CREATE POLICY posts_insert_owner
  ON public.posts FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS posts_update_owner ON public.posts;
CREATE POLICY posts_update_owner
  ON public.posts FOR UPDATE
  USING (auth.uid() = owner_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = owner_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS posts_delete_owner ON public.posts;
CREATE POLICY posts_delete_owner
  ON public.posts FOR DELETE
  USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

-- ─── post_likes ─────────────────────────────────────────────────────────
-- Reads are public so the UI can show counts; writes are user-scoped.
DROP POLICY IF EXISTS post_likes_select_public ON public.post_likes;
CREATE POLICY post_likes_select_public
  ON public.post_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS post_likes_insert_self ON public.post_likes;
CREATE POLICY post_likes_insert_self
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS post_likes_delete_self ON public.post_likes;
CREATE POLICY post_likes_delete_self
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ─── post_saves ─────────────────────────────────────────────────────────
-- Only the owner can read/write their saves.
DROP POLICY IF EXISTS post_saves_select_self ON public.post_saves;
CREATE POLICY post_saves_select_self
  ON public.post_saves FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS post_saves_insert_self ON public.post_saves;
CREATE POLICY post_saves_insert_self
  ON public.post_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS post_saves_update_self ON public.post_saves;
CREATE POLICY post_saves_update_self
  ON public.post_saves FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS post_saves_delete_self ON public.post_saves;
CREATE POLICY post_saves_delete_self
  ON public.post_saves FOR DELETE
  USING (auth.uid() = user_id);

-- ─── save_folders ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS save_folders_select_self ON public.save_folders;
CREATE POLICY save_folders_select_self
  ON public.save_folders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS save_folders_insert_self ON public.save_folders;
CREATE POLICY save_folders_insert_self
  ON public.save_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS save_folders_update_self ON public.save_folders;
CREATE POLICY save_folders_update_self
  ON public.save_folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS save_folders_delete_self ON public.save_folders;
CREATE POLICY save_folders_delete_self
  ON public.save_folders FOR DELETE
  USING (auth.uid() = user_id);

-- ─── social_accounts ────────────────────────────────────────────────────
-- Public read (so visitors can see another creator's socials), self-write.
DROP POLICY IF EXISTS social_accounts_select_public ON public.social_accounts;
CREATE POLICY social_accounts_select_public
  ON public.social_accounts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS social_accounts_write_self ON public.social_accounts;
CREATE POLICY social_accounts_write_self
  ON public.social_accounts FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- ─── reports ────────────────────────────────────────────────────────────
-- Reporters can insert their own reports; only admins can read/update.
DROP POLICY IF EXISTS reports_insert_self ON public.reports;
CREATE POLICY reports_insert_self
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS reports_select_admin ON public.reports;
CREATE POLICY reports_select_admin
  ON public.reports FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS reports_update_admin ON public.reports;
CREATE POLICY reports_update_admin
  ON public.reports FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── models / platforms (reference data) ────────────────────────────────
-- Public read; writes go through service role only.
DROP POLICY IF EXISTS models_select_public ON public.models;
CREATE POLICY models_select_public
  ON public.models FOR SELECT
  USING (true);

DROP POLICY IF EXISTS platforms_select_public ON public.platforms;
CREATE POLICY platforms_select_public
  ON public.platforms FOR SELECT
  USING (true);
