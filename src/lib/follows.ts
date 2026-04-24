import { createClient } from "@/lib/supabase/server";
import type { Post, PostSort } from "@/types/domain";

/**
 * List the `source_user` handles the viewer follows.
 *
 * We key follows on the handle/username string (e.g. "@dali_reborn", "@ahmet")
 * instead of auth uuids so that every post — including scraped mock content
 * without a real `owner_id` — can be followed from its detail view.
 */
export async function getFollowedHandles(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follows")
    .select("target_id")
    .eq("user_id", userId)
    .eq("target_type", "user");
  if (error) throw error;
  return (data ?? []).map((row) => row.target_id);
}

/** Count how many viewers follow a given handle. */
export async function countFollowersOfHandle(handle: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("target_type", "user")
    .eq("target_id", handle);
  if (error) throw error;
  return count ?? 0;
}

/** Posts whose source_user is in the viewer's followed-handle set. */
export async function listFollowingPosts(
  followedHandles: readonly string[],
  sort: PostSort,
  limit: number = 60,
): Promise<Post[]> {
  if (followedHandles.length === 0) return [];
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select("*")
    .eq("media_type", "image")
    .in("source_user", [...followedHandles]);
  query =
    sort === "top"
      ? query.order("likes", { ascending: false })
      : query.order("posted_at", { ascending: false });
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return data ?? [];
}
