-- Two small lints from `get_advisors` after 0012:
--   * `post_tags_enforce_max` has a mutable search_path — pin it to public.
--   * `post_tags_bump_counter` is SECURITY DEFINER but EXECUTE is granted to
--     anon/authenticated by default; the function is only meant to run as a
--     trigger, so revoke direct RPC access.
--
-- Both fixes are idempotent — running 0012 followed by 0013 (or 0012 alone
-- after this file is folded into a fresh install) leaves the DB identical.

ALTER FUNCTION public.post_tags_enforce_max()
  SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.post_tags_bump_counter() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_tags_bump_counter() FROM anon;
REVOKE EXECUTE ON FUNCTION public.post_tags_bump_counter() FROM authenticated;
