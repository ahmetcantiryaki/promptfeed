import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SaveBody =
  | { action: "save"; postId: string; folderId: string }
  | { action: "unsave"; postId: string }
  | { action: "move"; postId: string; folderId: string };

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function parseBody(raw: unknown): SaveBody | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isUuid(r.postId)) return null;
  if (r.action === "save" || r.action === "move") {
    if (!isUuid(r.folderId)) return null;
    return { action: r.action, postId: r.postId, folderId: r.folderId };
  }
  if (r.action === "unsave") {
    return { action: "unsave", postId: r.postId };
  }
  return null;
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
    bucket: "api:saves:write",
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

  if (body.action === "save") {
    const { error } = await supabase.from("post_saves").insert({
      post_id: body.postId,
      user_id: user.id,
      folder_id: body.folderId,
    });
    if (error && error.code !== "23505") {
      return NextResponse.json(
        { success: false, error: "db_error" },
        { status: 400 },
      );
    }
  } else if (body.action === "unsave") {
    const { error } = await supabase
      .from("post_saves")
      .delete()
      .eq("post_id", body.postId)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json(
        { success: false, error: "db_error" },
        { status: 400 },
      );
    }
  } else {
    const { error } = await supabase
      .from("post_saves")
      .update({ folder_id: body.folderId })
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
