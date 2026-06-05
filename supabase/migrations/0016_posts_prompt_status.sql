-- Prompt provenance / trust tier for every post. Splits the feed into three
-- categories WITHOUT breaking the existing "prompt library" trust model:
--
--   'verified'  — the creator/source actually shared this prompt. The default
--                 for every existing row (all current posts carry a real,
--                 copyable prompt). Most trusted; surfaced with "Copy prompt".
--   'reference' — a strong visual whose prompt was NOT shared. The post must
--                 NOT behave like a prompt: no copy action, a "Prompt not
--                 shared" empty-state, save-as-reference + open-source only.
--                 `prompt` is stored empty ('') for these rows.
--   'estimated' — prompt not shared, but Feedlens generated an approximate
--                 prompt from the image. Always surfaced as NON-original
--                 ("Estimated Prompt" / "Copy estimated prompt"). The estimate
--                 lives in the existing `prompt` column.
--
-- Backfill is implicit: NOT NULL DEFAULT 'verified' tags every existing row as
-- verified, preserving today's behavior exactly. Re-classification is an
-- explicit admin/curation action (add + edit dialogs), never silent.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS prompt_status text NOT NULL DEFAULT 'verified';

-- Constrained vocabulary — drop-then-add keeps the migration re-runnable.
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_prompt_status_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_prompt_status_check
  CHECK (prompt_status IN ('verified', 'reference', 'estimated'));

-- Feed slices by status (the new "Prompt status" filter). Newest-first matches
-- the discover default. Discover loads the corpus in memory and filters client
-- side, but the paged/category server paths still benefit from the index.
CREATE INDEX IF NOT EXISTS posts_prompt_status_created_idx
  ON public.posts (prompt_status, created_at DESC);
