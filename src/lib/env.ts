/**
 * Centralised environment variable validation. Throws at module-load time when
 * required variables are missing, so we fail fast instead of producing
 * confusing runtime errors deep inside Supabase clients.
 *
 * Public (NEXT_PUBLIC_*) variables are accessible from both server and client
 * components. Server-only variables MUST never be imported from a client
 * component — TypeScript cannot enforce this; rely on the "server-only" import
 * inside @/lib/supabase/admin.ts as the authoritative gate.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Set it in .env.local (development) or your deployment platform.`,
    );
  }
  return value;
}

function optional(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  return value;
}

function validateUrl(name: string, value: string): string {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      throw new Error(`${name} must be http(s)`);
    }
    return value;
  } catch (e) {
    throw new Error(`[env] ${name} is not a valid URL: ${(e as Error).message}`);
  }
}

const NEXT_PUBLIC_SUPABASE_URL = validateUrl(
  "NEXT_PUBLIC_SUPABASE_URL",
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
);
const NEXT_PUBLIC_SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: optional(process.env.NEXT_PUBLIC_SITE_URL),
} as const;

/**
 * Server-only env. Lazy-resolved so that importing this module in a Client
 * Component does not crash with a "missing SERVICE_ROLE_KEY" error. Call
 * `getServerEnv()` only from server code.
 */
export function getServerEnv() {
  return {
    SUPABASE_SERVICE_ROLE_KEY: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    UPSTASH_REDIS_REST_URL: optional(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: optional(process.env.UPSTASH_REDIS_REST_TOKEN),
  } as const;
}
