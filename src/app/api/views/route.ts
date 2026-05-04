import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
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
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const limited = await rateLimit({
    bucket: "api:views:write",
    limit: 1,
    windowSec: 60,
    identifier: `${ip}:${postId}`,
  });

  // Silent dedupe: if rate-limited, return success without incrementing.
  if (!limited.ok) {
    return NextResponse.json({ success: true, error: null });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_post_views", {
    p_post_id: postId,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: "db_error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, error: null });
}
