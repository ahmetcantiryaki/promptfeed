import { NextResponse } from "next/server";
import { listPosts } from "@/lib/posts";
import type { MediaType, PostSort } from "@/types/domain";

function pickSort(raw: string | null): PostSort {
  return raw === "top" ? "top" : "newest";
}

function pickMediaType(raw: string | null): MediaType | undefined {
  return raw === "image" || raw === "video" ? raw : undefined;
}

export async function GET(request: Request) {
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

  return NextResponse.json({ success: true, data: posts, error: null });
}
