import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv, getServerEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS. NEVER import from Client Components.
 * Used by server scripts (seed, scraper uploads) and privileged server routes.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  return createSupabase<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
