-- Enable Row-Level Security on every public table that holds user data.
-- Without this, the browser's anon/auth roles can read/write arbitrary rows
-- via PostgREST regardless of application-layer auth.

ALTER TABLE IF EXISTS public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_saves      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.save_folders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports         ENABLE ROW LEVEL SECURITY;

-- Reference data — readable by anon/auth, writable only via service role.
ALTER TABLE IF EXISTS public.models          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.platforms       ENABLE ROW LEVEL SECURITY;
