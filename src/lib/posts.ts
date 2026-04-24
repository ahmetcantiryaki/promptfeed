import { createClient } from "@/lib/supabase/server";
import type { Model, Platform, Post, PostFilters } from "@/types/domain";

export async function listPosts(filters: PostFilters = {}): Promise<Post[]> {
  const supabase = await createClient();
  let query = supabase.from("posts").select("*");

  if (filters.model) query = query.eq("model_slug", filters.model);
  if (filters.platform) query = query.eq("platform_slug", filters.platform);
  // UI is image-only for now. Callers may still override via filters.mediaType.
  query = query.eq("media_type", filters.mediaType ?? "image");

  query =
    filters.sort === "top"
      ? query.order("likes", { ascending: false })
      : query.order("posted_at", { ascending: false });

  query = query.limit(filters.limit ?? 60);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listModels(): Promise<Model[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("models")
    .select("*")
    .order("post_count", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listPlatforms(): Promise<Platform[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platforms")
    .select("*")
    .order("post_count", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface OwnerInfo {
  avatarUrl: string | null;
  avatarConfig: unknown | null;
  displayName: string | null;
  handle: string | null;
}

export type OwnerMap = Record<string, OwnerInfo>;

/** Resolve a map of user_id -> public profile snippet for post owners. */
export async function getOwnerProfiles(
  ownerIds: readonly string[],
): Promise<OwnerMap> {
  if (ownerIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, avatar_url, avatar_config, display_name, handle")
    .in("id", [...new Set(ownerIds)]);
  if (error) throw error;
  const map: OwnerMap = {};
  for (const row of data ?? []) {
    map[row.id] = {
      avatarUrl: row.avatar_url,
      avatarConfig: row.avatar_config,
      displayName: row.display_name,
      handle: row.handle,
    };
  }
  return map;
}

export async function totalPostCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
