import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/types/domain";
import { POSTS_WITH_TAGS_SELECT, flattenPostsWithTags } from "@/lib/posts";

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
    .select(POSTS_WITH_TAGS_SELECT)
    .in("id", ids);
  if (postsErr) throw postsErr;

  // Preserve save order
  const flat = flattenPostsWithTags(posts ?? []);
  const byId = new Map(flat.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Post => p !== undefined);
}

export interface LikedCursor {
  /** ISO timestamp of last seen post_likes.created_at */
  createdAt: string;
  /** post_id tiebreaker for stable ordering */
  postId: string;
}

export interface LikedPage {
  posts: Post[];
  nextCursor: LikedCursor | null;
}

/**
 * List posts the user has liked, newest-liked first. Uses keyset pagination
 * over (created_at DESC, post_id DESC) — backed by idx_post_likes_user.
 *
 * Posts deleted after a like was recorded are filtered out (the FK has
 * ON DELETE CASCADE so this is mostly belt-and-suspenders against races).
 */
export async function listLikedPosts(
  userId: string,
  limit: number = 60,
  cursor: LikedCursor | null = null,
): Promise<LikedPage> {
  const supabase = await createClient();
  let query = supabase
    .from("post_likes")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("post_id", { ascending: false })
    .limit(limit);

  if (cursor) {
    // Keyset: rows strictly older than the cursor.
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},post_id.lt.${cursor.postId})`,
    );
  }

  const { data: likeRows, error: likesErr } = await query;
  if (likesErr) throw likesErr;
  const rows = likeRows ?? [];
  if (rows.length === 0) {
    return { posts: [], nextCursor: null };
  }

  const ids = rows.map((r) => r.post_id);
  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select(POSTS_WITH_TAGS_SELECT)
    .in("id", ids);
  if (postsErr) throw postsErr;

  const flat = flattenPostsWithTags(posts ?? []);
  const byId = new Map(flat.map((p) => [p.id, p]));
  const ordered = rows
    .map((r) => byId.get(r.post_id))
    .filter((p): p is Post => p !== undefined);

  const last = rows[rows.length - 1];
  const nextCursor: LikedCursor | null =
    rows.length < limit || !last
      ? null
      : { createdAt: last.created_at, postId: last.post_id };

  return { posts: ordered, nextCursor };
}
