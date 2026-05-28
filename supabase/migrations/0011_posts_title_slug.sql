-- Adds `title` + `slug` to posts so each prompt has a human-readable URL
-- (/prompt/{slug}) and an SEO-friendly title that fits Google's ~60-char SERP cap.
--
-- A BEFORE INSERT/UPDATE trigger guarantees every row gets:
--   title : user-supplied OR derived from the prompt's first sentence (max 60 chars)
--   slug  : user-supplied OR slugified title; uniqueness enforced with a `-2`, `-3`
--           suffix when collision is detected.
--
-- Existing rows are backfilled by a no-op UPDATE that fires the trigger.

-- 1) Slugify utility — lowercase, non-alphanumerics become dashes, trim, cap length.
CREATE OR REPLACE FUNCTION public.slugify_text(input text, max_len int DEFAULT 60)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from
    substring(
      regexp_replace(
        lower(coalesce(input, '')),
        '[^a-z0-9]+', '-', 'g'
      ),
      1, max_len
    )
  );
$$;

-- 2) Title from prompt — collapse whitespace, prefer first sentence, JSON-aware.
CREATE OR REPLACE FUNCTION public.derive_title_from_prompt(input text, max_len int DEFAULT 60)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  candidate text;
  end_pos int;
BEGIN
  IF input IS NULL OR length(trim(input)) = 0 THEN
    RETURN '';
  END IF;

  cleaned := regexp_replace(input, E'\\s+', ' ', 'g');
  cleaned := trim(cleaned);

  -- For JSON-shaped input, pull the first sufficiently long quoted string value.
  IF substring(cleaned, 1, 1) IN ('{', '[') THEN
    candidate := (regexp_match(cleaned, ':\s*"([^"]{4,})"'))[1];
    IF candidate IS NULL OR length(candidate) = 0 THEN
      candidate := cleaned;
    END IF;
  ELSE
    candidate := cleaned;
  END IF;

  -- First sentence — terminator followed by a space.
  end_pos := least(
    coalesce(nullif(position('. ' in candidate), 0), 999999),
    coalesce(nullif(position('? ' in candidate), 0), 999999),
    coalesce(nullif(position('! ' in candidate), 0), 999999)
  );
  IF end_pos > 0 AND end_pos < 999999 THEN
    candidate := substring(candidate, 1, end_pos - 1);
  END IF;

  candidate := trim(candidate);
  IF length(candidate) > max_len THEN
    candidate := trim(substring(candidate, 1, max_len));
  END IF;

  RETURN candidate;
END;
$$;

-- 3) Columns (nullable initially so backfill can run).
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS slug text;

-- 4) Trigger — derives missing title/slug, ensures slug is unique.
CREATE OR REPLACE FUNCTION public.posts_ensure_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  counter int := 1;
  suffix text;
BEGIN
  -- Title: derive from prompt if missing; cap user-supplied at 60.
  IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 THEN
    NEW.title := public.derive_title_from_prompt(NEW.prompt, 60);
    IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 THEN
      NEW.title := 'Untitled prompt';
    END IF;
  ELSE
    NEW.title := substring(trim(NEW.title), 1, 60);
  END IF;

  -- Slug: derive from supplied slug, else from title.
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base_slug := public.slugify_text(NEW.title, 60);
  ELSE
    base_slug := public.slugify_text(NEW.slug, 60);
  END IF;
  IF length(coalesce(base_slug, '')) = 0 THEN
    base_slug := 'prompt';
  END IF;

  -- Resolve uniqueness with -2, -3, … suffixes; truncate base if needed to fit.
  candidate := base_slug;
  counter := 1;
  WHILE EXISTS (SELECT 1 FROM public.posts WHERE slug = candidate AND id <> NEW.id) LOOP
    counter := counter + 1;
    suffix := '-' || counter::text;
    candidate := substring(base_slug, 1, greatest(1, 60 - length(suffix))) || suffix;
  END LOOP;
  NEW.slug := candidate;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_ensure_slug_biu ON public.posts;
CREATE TRIGGER posts_ensure_slug_biu
  BEFORE INSERT OR UPDATE OF title, slug, prompt
  ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_ensure_slug();

-- 5) Backfill existing rows. UPDATE prompt to itself so the trigger fires
-- (it watches `OF title, slug, prompt`).
UPDATE public.posts
   SET prompt = prompt
 WHERE slug IS NULL OR title IS NULL;

-- 6) Lock NOT NULL + unique index.
ALTER TABLE public.posts
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN title SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique_idx ON public.posts (slug);
