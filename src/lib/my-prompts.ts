import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/types/domain";

export interface MyPostStats {
  likes: number;
  saves: number;
}

export async function listMyPosts(userId: string): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("owner_id", userId)
    .order("posted_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Aggregate real engagement on a user's own post.
 * likes & saves come from the interaction tables (absolute truth).
 */
export async function getMyPostStats(postId: string): Promise<MyPostStats> {
  const supabase = await createClient();
  const [likesRes, savesRes] = await Promise.all([
    supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
    supabase
      .from("post_saves")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
  ]);
  return {
    likes: likesRes.count ?? 0,
    saves: savesRes.count ?? 0,
  };
}
