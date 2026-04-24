import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses RLS. NEVER import from Client Components.
 * Used by server scripts (seed, scraper uploads) and privileged server routes.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL in environment.",
    );
  }
  return createSupabase<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
