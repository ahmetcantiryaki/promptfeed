import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Model, Platform, Post, PostFilters } from "@/types/domain";

export const OTHER_SLUG = "other";
const OTHER_LABEL = "Other";

export async function listPosts(filters: PostFilters = {}): Promise<Post[]> {
  const supabase = await createClient();
  let query = supabase.from("posts").select("*");

  query = query.eq("media_type", filters.mediaType ?? "image");

  if (filters.model) {
    if (filters.model === OTHER_SLUG) {
      const knownSlugs = await getKnownModelSlugs();
      if (knownSlugs.length > 0) {
        query = query.not("model_slug", "in", `(${knownSlugs.join(",")})`);
      }
    } else {
      query = query.eq("model_slug", filters.model);
    }
  }
  if (filters.platform) {
    if (filters.platform === OTHER_SLUG) {
      const knownSlugs = await getKnownPlatformSlugs();
      if (knownSlugs.length > 0) {
        query = query.not("platform_slug", "in", `(${knownSlugs.join(",")})`);
      }
    } else {
      query = query.eq("platform_slug", filters.platform);
    }
  }

  query =
    filters.sort === "top"
      ? query.order("likes", { ascending: false }).order("posted_at", { ascending: false })
      : query.order("posted_at", { ascending: false });

  query = query.limit(filters.limit ?? 60);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function getKnownModelSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("models").select("slug");
  if (error) throw error;
  return (data ?? []).map((r) => r.slug);
}

async function getKnownPlatformSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("platforms").select("slug");
  if (error) throw error;
  return (data ?? []).map((r) => r.slug);
}

export const listModelsAndPlatforms = cache(
  async function listModelsAndPlatforms(): Promise<{
    models: Model[];
    platforms: Platform[];
  }> {
    return _listModelsAndPlatforms();
  },
);

async function _listModelsAndPlatforms(): Promise<{
  models: Model[];
  platforms: Platform[];
}> {
  const supabase = await createClient();
  const [modelsRes, platformsRes, postSlugsRes] = await Promise.all([
    supabase.from("models").select("*"),
    supabase.from("platforms").select("*"),
    supabase
      .from("posts")
      .select("model_slug, platform_slug")
      .eq("media_type", "image"),
  ]);
  if (modelsRes.error) throw modelsRes.error;
  if (platformsRes.error) throw platformsRes.error;
  if (postSlugsRes.error) throw postSlugsRes.error;

  const modelCounts = new Map<string, number>();
  const platformCounts = new Map<string, number>();
  const knownModelSlugs = new Set((modelsRes.data ?? []).map((m) => m.slug));
  const knownPlatformSlugs = new Set(
    (platformsRes.data ?? []).map((p) => p.slug),
  );
  let total = 0;
  for (const row of postSlugsRes.data ?? []) {
    total += 1;
    const ms = knownModelSlugs.has(row.model_slug) ? row.model_slug : OTHER_SLUG;
    const ps = knownPlatformSlugs.has(row.platform_slug)
      ? row.platform_slug
      : OTHER_SLUG;
    modelCounts.set(ms, (modelCounts.get(ms) ?? 0) + 1);
    platformCounts.set(ps, (platformCounts.get(ps) ?? 0) + 1);
  }

  const models = sortAndAppendOther(
    (modelsRes.data ?? []).map((m) => ({
      ...m,
      post_count: modelCounts.get(m.slug) ?? 0,
    })),
    modelCounts.get(OTHER_SLUG) ?? 0,
    total,
    makeVirtualModel,
  );
  const platforms = sortAndAppendOther(
    (platformsRes.data ?? []).map((p) => ({
      ...p,
      post_count: platformCounts.get(p.slug) ?? 0,
    })),
    platformCounts.get(OTHER_SLUG) ?? 0,
    total,
    makeVirtualPlatform,
  );
  return { models, platforms };
}

export async function listModels(): Promise<Model[]> {
  return (await listModelsAndPlatforms()).models;
}

export async function listPlatforms(): Promise<Platform[]> {
  return (await listModelsAndPlatforms()).platforms;
}

function sortAndAppendOther<T extends { post_count: number; name: string }>(
  items: T[],
  otherCount: number,
  _totalImagePosts: number,
  buildOther: (count: number) => T,
): T[] {
  items.sort(
    (a, b) => b.post_count - a.post_count || a.name.localeCompare(b.name),
  );
  if (otherCount > 0) items.push(buildOther(otherCount));
  return items;
}

function makeVirtualModel(postCount: number): Model {
  return {
    slug: OTHER_SLUG,
    name: OTHER_LABEL,
    post_count: postCount,
    created_at: new Date(0).toISOString(),
    icon_url: null,
  };
}

function makeVirtualPlatform(postCount: number): Platform {
  return {
    slug: OTHER_SLUG,
    name: OTHER_LABEL,
    post_count: postCount,
    created_at: new Date(0).toISOString(),
    icon_url: null,
  };
}

export interface OwnerInfo {
  avatarUrl: string | null;
  avatarConfig: unknown | null;
  displayName: string | null;
  handle: string | null;
  xUrl: string | null;
}

export type OwnerMap = Record<string, OwnerInfo>;

export async function getOwnerProfiles(
  ownerIds: readonly string[],
): Promise<OwnerMap> {
  if (ownerIds.length === 0) return {};
  const supabase = await createClient();
  const ids = [...new Set(ownerIds)];
  const [{ data: profilesData, error: profilesError }, { data: socialsData, error: socialsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, avatar_url, avatar_config, display_name, handle")
        .in("id", ids),
      supabase
        .from("social_accounts")
        .select("profile_id, platform, url")
        .in("profile_id", ids)
        .eq("platform", "x"),
    ]);
  if (profilesError) throw profilesError;
  if (socialsError) throw socialsError;

  const xByOwner = new Map<string, string>();
  for (const row of socialsData ?? []) {
    if (row.url) xByOwner.set(row.profile_id, row.url);
  }

  const map: OwnerMap = {};
  for (const row of profilesData ?? []) {
    map[row.id] = {
      avatarUrl: row.avatar_url,
      avatarConfig: row.avatar_config,
      displayName: row.display_name,
      handle: row.handle,
      xUrl: xByOwner.get(row.id) ?? null,
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
