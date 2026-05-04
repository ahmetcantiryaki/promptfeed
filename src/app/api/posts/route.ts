import { NextResponse } from "next/server";
import {
  getOwnerProfiles,
  listPostsPaged,
  type PostsCursor,
} from "@/lib/posts";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { MediaType, PostSort } from "@/types/domain";

function pickSort(raw: string | null): PostSort {
  return raw === "top" ? "top" : "newest";
}

function pickMediaType(raw: string | null): MediaType | undefined {
  return raw === "image" || raw === "video" ? raw : undefined;
}

function parseCursor(raw: string | null): PostsCursor | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "posted_at" in parsed &&
      "id" in parsed
    ) {
      const c = parsed as { posted_at: unknown; id: unknown };
      if (typeof c.posted_at === "string" && typeof c.id === "string") {
        return { posted_at: c.posted_at, id: c.id };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function encodeCursor(cursor: PostsCursor | null): string | null {
  if (!cursor) return null;
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64");
}

export async function GET(request: Request) {
  const limit60s = await rateLimit({
    bucket: "api:posts",
    limit: 120,
    windowSec: 60,
  });
  if (!limit60s.ok) return tooManyRequests(limit60s);

  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model") ?? undefined;
  const platform = searchParams.get("platform") ?? undefined;
  const mediaType = pickMediaType(searchParams.get("type"));
  const sort = pickSort(searchParams.get("sort"));
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") ?? "30", 10) || 30, 1),
    60,
  );
  const cursor = parseCursor(searchParams.get("cursor"));

  const { posts, nextCursor } = await listPostsPaged(
    { model, platform, mediaType, sort, limit },
    cursor,
  );
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
