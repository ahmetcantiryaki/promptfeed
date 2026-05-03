import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  getFolderById,
  listFolderSummaries,
  listSavedPostsInFolder,
} from "@/lib/folders";
import { getOwnerProfiles } from "@/lib/posts";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, data: null, error: "unauthenticated" },
      { status: 401 },
    );
  }

  const limited = await rateLimit({
    bucket: "api:saved",
    limit: 120,
    windowSec: 60,
    identifier: user.id,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folder");

  if (!folderId) {
    const folders = await listFolderSummaries(user.id);
    return NextResponse.json({
      success: true,
      data: { folders },
      error: null,
    });
  }

  const folder = await getFolderById(user.id, folderId);
  if (!folder) {
    return NextResponse.json(
      { success: false, data: null, error: "not_found" },
      { status: 404 },
    );
  }
  const posts = await listSavedPostsInFolder(user.id, folderId, 120);
  const ownerIds = posts
    .map((p) => p.owner_id)
    .filter((id): id is string => Boolean(id));
  const owners = await getOwnerProfiles(ownerIds);
  return NextResponse.json({
    success: true,
    data: { folder, posts, owners },
    error: null,
  });
}
