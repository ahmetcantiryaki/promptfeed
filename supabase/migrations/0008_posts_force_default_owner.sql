-- Force every post to be owned by @eyupyusufa (42@eyupyusufa.com).
-- Even when a post is inserted via the UI, MCP tool, or any other authenticated
-- path, this trigger rewrites owner_id to the canonical creator before the row
-- is committed, so attribution stays consistent.

CREATE OR REPLACE FUNCTION public.posts_force_default_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_owner constant uuid := '832da69a-7be5-491d-83a4-1571e684057b'; -- 42@eyupyusufa.com
BEGIN
  NEW.owner_id := default_owner;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_force_default_owner_biu ON public.posts;
CREATE TRIGGER posts_force_default_owner_biu
  BEFORE INSERT OR UPDATE OF owner_id ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_force_default_owner();

-- Relax INSERT RLS: any authenticated session may insert; the trigger always
-- rewrites owner_id to the canonical creator, so attribution is safe.
DROP POLICY IF EXISTS posts_insert_owner ON public.posts;
DROP POLICY IF EXISTS posts_insert_authenticated ON public.posts;
CREATE POLICY posts_insert_authenticated
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Backfill any pre-existing posts whose owner_id drifted from the canonical
-- creator (e.g., legacy seed rows or earlier multi-user inserts).
UPDATE public.posts
   SET owner_id = '832da69a-7be5-491d-83a4-1571e684057b'
 WHERE owner_id IS DISTINCT FROM '832da69a-7be5-491d-83a4-1571e684057b';
