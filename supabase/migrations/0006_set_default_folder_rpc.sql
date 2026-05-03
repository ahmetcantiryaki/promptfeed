-- Atomic default-folder mutations. The two-step "clear old default + set new
-- default" sequence in folders-client.ts has a race that can leave the user
-- with no default folder if two tabs race. Replacing that with an RPC fixes
-- the race and reduces round-trips.
--
-- Both functions are SECURITY INVOKER so they run with the caller's RLS,
-- meaning a user cannot promote/create folders for someone else.

CREATE OR REPLACE FUNCTION public.set_default_save_folder(
  target_folder_id uuid
)
RETURNS public.save_folders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  target public.save_folders;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO target
    FROM public.save_folders
   WHERE id = target_folder_id
     AND user_id = caller;

  IF target IS NULL THEN
    RAISE EXCEPTION 'Folder not found';
  END IF;

  UPDATE public.save_folders
     SET is_default = false
   WHERE user_id = caller
     AND id <> target_folder_id;

  UPDATE public.save_folders
     SET is_default = true
   WHERE id = target_folder_id
     AND user_id = caller
   RETURNING * INTO target;

  RETURN target;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_save_folder(
  folder_name text,
  make_default boolean DEFAULT false
)
RETURNS public.save_folders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  created public.save_folders;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF folder_name IS NULL OR length(trim(folder_name)) = 0 THEN
    RAISE EXCEPTION 'Folder name is required';
  END IF;

  IF make_default THEN
    UPDATE public.save_folders
       SET is_default = false
     WHERE user_id = caller;
  END IF;

  INSERT INTO public.save_folders (user_id, name, is_default)
       VALUES (caller, trim(folder_name), make_default)
    RETURNING * INTO created;

  RETURN created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_save_folder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_save_folder(text, boolean) TO authenticated;
