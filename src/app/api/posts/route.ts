import { NextResponse } from "next/server";
import { getOwnerProfiles, listPosts } from "@/lib/posts";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { MediaType, PostSort } from "@/types/domain";

function pickSort(raw: string | null): PostSort {
  return raw === "top" ? "top" : "newest";
}

function pickMediaType(raw: string | null): MediaType | undefined {
  return raw === "image" || raw === "video" ? raw : undefined;
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
    Math.max(Number.parseInt(searchParams.get("limit") ?? "60", 10) || 60, 1),
    120,
  );

  const posts = await listPosts({ model, platform, mediaType, sort, limit });
  const ownerIds = posts
    .map((p) => p.owner_id)
    .filter((id): id is string => Boolean(id));
  const owners = await getOwnerProfiles(ownerIds);

  return NextResponse.json({
    success: true,
    data: { posts, owners },
    error: null,
  });
}
