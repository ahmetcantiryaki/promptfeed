import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VIEWER_COOKIE = "pf_vid";
const VIEWER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/**
 * Resolve a stable viewer id used to dedupe post views.
 *
 * Authenticated users are keyed by their auth uid (so logging in/out from
 * the same browser does not produce a second "view"). Anonymous visitors
 * get a random uuid persisted in the httpOnly `pf_vid` cookie. A viewer
 * who clears cookies AND is logged out can pick up a fresh id — that is
 * an acceptable trade-off; we only need to defeat refresh-spam, not
 * adversaries with full client control.
 */
async function resolveViewerId(
  authUserId: string | null,
): Promise<{ viewerId: string; setCookie: boolean; cookieValue: string | null }> {
  if (authUserId) {
    return { viewerId: `u:${authUserId}`, setCookie: false, cookieValue: null };
  }

  const jar = await cookies();
  const existing = jar.get(VIEWER_COOKIE)?.value;
  if (existing && existing.length >= 8 && existing.length <= 64) {
    return {
      viewerId: `c:${existing}`,
      setCookie: false,
      cookieValue: existing,
    };
  }

  const fresh = randomUUID();
  return { viewerId: `c:${fresh}`, setCookie: true, cookieValue: fresh };
}

function attachViewerCookie(
  response: NextResponse,
  cookieValue: string,
): NextResponse {
  response.cookies.set({
    name: VIEWER_COOKIE,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VIEWER_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { success: false, error: "invalid_input" },
      { status: 400 },
    );
  }

  const { postId } = raw as Record<string, unknown>;

  if (!isUuid(postId)) {
    return NextResponse.json(
      { success: false, error: "invalid_input" },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Defense in depth against scripted cookie-cycling. The DB-level dedupe
  // already prevents the same viewer from incrementing twice; this caps a
  // single IP to ~1 distinct view per post per minute.
  const limited = await rateLimit({
    bucket: "api:views:write",
    limit: 1,
    windowSec: 60,
    identifier: `${ip}:${postId}`,
  });
  if (!limited.ok) {
    return NextResponse.json({ success: true, error: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { viewerId, setCookie, cookieValue } = await resolveViewerId(
    user?.id ?? null,
  );

  const { error } = await supabase.rpc("record_post_view", {
    p_post_id: postId,
    p_viewer_id: viewerId,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: "db_error" },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ success: true, error: null });
  if (setCookie && cookieValue) attachViewerCookie(response, cookieValue);
  return response;
}
