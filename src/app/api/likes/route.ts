import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LikeBody {
  postId: string;
  action: "like" | "unlike";
}

function parseBody(raw: unknown): LikeBody | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.postId !== "string" || !UUID_RE.test(r.postId)) return null;
  if (r.action !== "like" && r.action !== "unlike") return null;
  return { postId: r.postId, action: r.action };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "unauthenticated" },
      { status: 401 },
    );
  }

  const limited = await rateLimit({
    bucket: "api:likes",
    limit: 60,
    windowSec: 60,
    identifier: user.id,
  });
  if (!limited.ok) return tooManyRequests(limited);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json(
      { success: false, error: "invalid_input" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  if (body.action === "like") {
    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: body.postId, user_id: user.id });
    // Idempotent: ignore unique-violation when user already liked.
    if (error && error.code !== "23505") {
      return NextResponse.json(
        { success: false, error: "db_error" },
        { status: 400 },
      );
    }
  } else {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", body.postId)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json(
        { success: false, error: "db_error" },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ success: true, error: null });
}
