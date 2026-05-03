import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Post, SaveFolder, SaveFolderSummary } from "@/types/domain";

const COVER_LIMIT = 4;

export interface UserFoldersAndSaves {
  folders: SaveFolder[];
  savedIds: string[];
  saveByPostId: Record<string, string>;
  /** post_id ordered newest-first per folder, capped to COVER_LIMIT */
  coverPostIdsByFolder: Map<string, string[]>;
  /** count per folder */
  countsByFolder: Map<string, number>;
}

/** One round-trip pair: folders + saves. No post lookups for thumbs (do that lazily). */
export const getUserFoldersAndSaves = cache(_getUserFoldersAndSaves);

async function _getUserFoldersAndSaves(
  userId: string,
): Promise<UserFoldersAndSaves> {
  const supabase = await createClient();
  const [foldersRes, savesRes] = await Promise.all([
    supabase
      .from("save_folders")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("post_saves")
      .select("post_id, folder_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (foldersRes.error) throw foldersRes.error;
  if (savesRes.error) throw savesRes.error;

  const folders = foldersRes.data ?? [];
  const saves = savesRes.data ?? [];

  const savedIds: string[] = [];
  const saveByPostId: Record<string, string> = {};
  const coverPostIdsByFolder = new Map<string, string[]>();
  const countsByFolder = new Map<string, number>();

  for (const s of saves) {
    savedIds.push(s.post_id);
    saveByPostId[s.post_id] = s.folder_id;
    countsByFolder.set(s.folder_id, (countsByFolder.get(s.folder_id) ?? 0) + 1);
    const ids = coverPostIdsByFolder.get(s.folder_id) ?? [];
    if (ids.length < COVER_LIMIT) {
      ids.push(s.post_id);
      coverPostIdsByFolder.set(s.folder_id, ids);
    }
  }

  return {
    folders,
    savedIds,
    saveByPostId,
    coverPostIdsByFolder,
    countsByFolder,
  };
}

/** Build SaveFolderSummary[] (cover thumbs included). Reuses prefetched data when given. */
export async function listFolderSummaries(
  userId: string,
  prefetched?: UserFoldersAndSaves,
): Promise<SaveFolderSummary[]> {
  const data = prefetched ?? (await getUserFoldersAndSaves(userId));
  if (data.folders.length === 0) return [];

  const allCoverIds = new Set<string>();
  for (const ids of data.coverPostIdsByFolder.values()) {
    for (const id of ids) allCoverIds.add(id);
  }

  const thumbByPostId = new Map<string, string>();
  if (allCoverIds.size > 0) {
    const supabase = await createClient();
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, thumbnail_url, media_url")
      .in("id", [...allCoverIds]);
    if (error) throw error;
    for (const p of posts ?? []) {
      thumbByPostId.set(p.id, p.thumbnail_url ?? p.media_url);
    }
  }

  return data.folders.map((f) => ({
    ...f,
    post_count: data.countsByFolder.get(f.id) ?? 0,
    cover_urls: (data.coverPostIdsByFolder.get(f.id) ?? [])
      .map((id) => thumbByPostId.get(id))
      .filter((u): u is string => Boolean(u)),
  }));
}

export async function getFolderById(
  userId: string,
  folderId: string,
): Promise<SaveFolder | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("save_folders")
    .select("*")
    .eq("id", folderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listSavedPostsInFolder(
  userId: string,
  folderId: string,
  limit: number = 120,
): Promise<Post[]> {
  const supabase = await createClient();
  const { data: saveRows, error: savesErr } = await supabase
    .from("post_saves")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (savesErr) throw savesErr;
  const ids = (saveRows ?? []).map((r) => r.post_id);
  if (ids.length === 0) return [];

  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select("*")
    .in("id", ids);
  if (postsErr) throw postsErr;

  const byId = new Map((posts ?? []).map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Post => p !== undefined);
}
