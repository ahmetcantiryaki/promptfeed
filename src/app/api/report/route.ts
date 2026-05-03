import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_REPORTS_PER_DAY = 5;
const REASON_MAX = 500;

interface ReportPayload {
  postId?: unknown;
  reason?: unknown;
}

function bad(status: number, error: string) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad(401, "unauthenticated");

  // Banned users cannot report.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.is_banned) return bad(403, "banned");

  let body: ReportPayload;
  try {
    body = (await request.json()) as ReportPayload;
  } catch {
    return bad(400, "invalid_body");
  }
  const postId = typeof body.postId === "string" ? body.postId : null;
  const rawReason = typeof body.reason === "string" ? body.reason : "";
  const reason = rawReason.trim().slice(0, REASON_MAX);
  if (!postId) return bad(400, "missing_post_id");
  if (reason.length < 4) return bad(400, "reason_too_short");

  // Verify post exists.
  const { data: post } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return bad(404, "post_not_found");

  // Already reported this post?
  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();
  if (existing) return bad(409, "already_reported");

  // Rate limit: max N reports in last 24h.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: cntErr } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", user.id)
    .gte("created_at", since);
  if (cntErr) return bad(500, "rate_check_failed");
  if ((count ?? 0) >= MAX_REPORTS_PER_DAY) return bad(429, "rate_limited");

  const { error: insErr } = await supabase.from("reports").insert({
    post_id: postId,
    reporter_id: user.id,
    reason,
    status: "open",
  });
  if (insErr) {
    if (insErr.code === "23505") return bad(409, "already_reported");
    return bad(500, "insert_failed");
  }

  return NextResponse.json({ success: true, data: null, error: null });
}
