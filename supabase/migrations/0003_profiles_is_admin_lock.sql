-- Prevent users from self-promoting to admin via PATCH on profiles.
--
-- The UPDATE policy in 0002 lets users update their own profile row, which
-- includes the is_admin / is_banned / is_verified columns. Without this
-- trigger, a malicious client can simply PATCH /profiles?id=eq.<self> with
-- {"is_admin": true} and gain admin powers.
--
-- This trigger forces those flags to keep their previous value unless the
-- mutation is performed by an existing admin (who has gone through normal
-- promotion via service-role tooling).

CREATE OR REPLACE FUNCTION public.profiles_protect_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  SELECT public.is_admin(auth.uid()) INTO caller_is_admin;

  IF caller_is_admin THEN
    RETURN NEW;
  END IF;

  -- Force privileged columns back to their previous values.
  NEW.is_admin    := OLD.is_admin;
  NEW.is_banned   := OLD.is_banned;
  NEW.is_verified := OLD.is_verified;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_protect_privileged_columns() FROM public;

DROP TRIGGER IF EXISTS profiles_protect_privileged_columns_trg ON public.profiles;
CREATE TRIGGER profiles_protect_privileged_columns_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_privileged_columns();
