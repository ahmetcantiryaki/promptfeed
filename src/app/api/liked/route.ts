import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { listLikedPosts, type LikedCursor } from "@/lib/interactions";
import { getOwnerProfiles } from "@/lib/posts";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeCursor(raw: string | null): LikedCursor | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const c = parsed as Record<string, unknown>;
    if (typeof c.createdAt !== "string" || !ISO_RE.test(c.createdAt)) {
      return null;
    }
    if (typeof c.postId !== "string" || !UUID_RE.test(c.postId)) return null;
    return { createdAt: c.createdAt, postId: c.postId };
  } catch {
    return null;
  }
}

function encodeCursor(cursor: LikedCursor | null): string | null {
  if (!cursor) return null;
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64");
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, data: null, error: "unauthenticated" },
      { status: 401 },
    );
  }

  const limited = await rateLimit({
    bucket: "api:liked",
    limit: 120,
    windowSec: 60,
    identifier: user.id,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const { searchParams } = new URL(request.url);
  const cursor = decodeCursor(searchParams.get("cursor"));
  const limitRaw = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 120
      ? Math.floor(limitRaw)
      : 60;

  const { posts, nextCursor } = await listLikedPosts(user.id, limit, cursor);
  const ownerIds = posts
    .map((p) => p.owner_id)
    .filter((id): id is string => Boolean(id));
  const owners = await getOwnerProfiles(ownerIds);

  return NextResponse.json({
    success: true,
    data: { posts, owners, nextCursor: encodeCursor(nextCursor) },
    error: null,
  });
}
