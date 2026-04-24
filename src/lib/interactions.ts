import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/types/domain";

export async function getLikedPostIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.post_id);
}

export async function getSavedPostIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_saves")
    .select("post_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.post_id);
}

/** List the posts the current user has saved, newest-saved first. */
export async function listSavedPosts(
  userId: string,
  limit: number = 60,
): Promise<Post[]> {
  const supabase = await createClient();
  const { data: saveRows, error: savesErr } = await supabase
    .from("post_saves")
    .select("post_id, created_at")
    .eq("user_id", userId)
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

  // Preserve save order
  const byId = new Map((posts ?? []).map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Post => p !== undefined);
}
