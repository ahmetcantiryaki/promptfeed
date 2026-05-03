import "server-only";
import { headers } from "next/headers";
import { getServerEnv } from "@/lib/env";

/**
 * Lightweight rate limiter backed by Upstash Redis (REST). Skips silently
 * when UPSTASH_REDIS_* env vars are absent — that mode is for local dev.
 * In production the env vars MUST be set or rate limiting is a no-op and
 * the audit will flag it.
 *
 * Algorithm: fixed-window counter via INCR + EXPIRE. Good enough for
 * abuse mitigation; not a precise sliding window.
 */

export interface RateLimitOptions {
  /** Logical bucket name, e.g. "api:posts", "auth:login". */
  bucket: string;
  /** Maximum requests allowed in the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
  /**
   * Override the identifier. Defaults to client IP from x-forwarded-for /
   * x-real-ip, falling back to "anon".
   */
  identifier?: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

interface UpstashResponse<T> {
  result: T;
  error?: string;
}

async function upstashFetch<T>(
  url: string,
  token: string,
  command: (string | number)[],
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as UpstashResponse<T>;
    return json.error ? null : json.result;
  } catch {
    return null;
  }
}

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  } catch {
    // Outside request context.
  }
  return "anon";
}

/** True when rate limiting is configured (Upstash creds present). */
export function isRateLimitEnabled(): boolean {
  const env = getServerEnv();
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

export async function rateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const env = getServerEnv();
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + opts.windowSec;

  if (!url || !token) {
    // Fail-open in dev / unconfigured environments.
    return { ok: true, remaining: opts.limit, resetAt };
  }

  const id = opts.identifier ?? (await getClientIp());
  const key = `rl:${opts.bucket}:${id}:${Math.floor(now / opts.windowSec)}`;

  const count = await upstashFetch<number>(url, token, ["INCR", key]);
  if (count === null) {
    // Network/Redis failure — fail open to not break the app.
    return { ok: true, remaining: opts.limit, resetAt };
  }
  if (count === 1) {
    // First request in this window — set TTL.
    await upstashFetch(url, token, ["EXPIRE", key, opts.windowSec]);
  }

  const remaining = Math.max(0, opts.limit - count);
  return {
    ok: count <= opts.limit,
    remaining,
    resetAt,
  };
}

/** Convenience: rate-limited response builder for API routes. */
export function tooManyRequests(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Too many requests. Try again shortly.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, result.resetAt - Math.floor(Date.now() / 1000))),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetAt),
      },
    },
  );
}
