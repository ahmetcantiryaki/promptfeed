import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Model, Platform, Post, PostFilters } from "@/types/domain";

export const OTHER_SLUG = "other";
const OTHER_LABEL = "Other";

/** Supabase select fragment for posts + their tag slugs. The nested array
 *  comes back as `{ tag_slug: string }[]`; flattenPostTags() turns that into
 *  Post.tag_slugs without leaving the helper relation on the object. */
export const POSTS_WITH_TAGS_SELECT = "*, post_tags(tag_slug)";

interface RawPostWithTags {
  post_tags?: { tag_slug: string }[] | null;
  [key: string]: unknown;
}

/** Flatten a single supabase row that selected POSTS_WITH_TAGS_SELECT. */
export function flattenPostTags(row: RawPostWithTags): Post {
  const { post_tags, ...rest } = row;
  const tag_slugs = (post_tags ?? []).map((t) => t.tag_slug);
  return { ...(rest as unknown as Post), tag_slugs };
}

/** Batch flatten — preserves order. */
export function flattenPostsWithTags(rows: readonly RawPostWithTags[]): Post[] {
  return rows.map(flattenPostTags);
}

/**
 * Resolve a list of tag slugs to the set of post ids that carry ALL of them
 * (AND intersection). Returns `null` when the filter is disabled (empty tags)
 * so the caller can skip the .in() narrowing entirely. Returns `[]` when the
 * filter is active but matches no rows — caller should short-circuit to no
 * results.
 */
async function postIdsMatchingAllTags(
  tagSlugs: readonly string[],
): Promise<string[] | null> {
  if (tagSlugs.length === 0) return null;
  const supabase = await createClient();
  // Single-tag case is a simple lookup — skip the GROUP BY HAVING dance.
  if (tagSlugs.length === 1) {
    const { data, error } = await supabase
      .from("post_tags")
      .select("post_id")
      .eq("tag_slug", tagSlugs[0]!);
    if (error) throw error;
    return (data ?? []).map((r) => r.post_id);
  }
  // Multi-tag: fetch all (post_id, tag_slug) rows matching any selected tag,
  // then keep only post_ids that appeared `tagSlugs.length` times — i.e.
  // posts carrying every selected tag. Done client-side so we stay on the
  // PostgREST API without an RPC.
  const { data, error } = await supabase
    .from("post_tags")
    .select("post_id, tag_slug")
    .in("tag_slug", [...tagSlugs]);
  if (error) throw error;
  const required = tagSlugs.length;
  const tally = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    let set = tally.get(row.post_id);
    if (!set) {
      set = new Set();
      tally.set(row.post_id, set);
    }
    set.add(row.tag_slug);
  }
  const matched: string[] = [];
  for (const [postId, set] of tally) {
    if (set.size === required) matched.push(postId);
  }
  return matched;
}

/** Escape characters that have special meaning in PostgREST `ilike` filters
 *  and inside Supabase's `.or()` comma-list. */
function escapeIlike(s: string): string {
  return s.replace(/[\\%_,()]/g, "\\$&");
}

/**
 * Fetch the entire image feed in one query, ordered newest-first. The client
 * then runs filter/sort/search in memory over this snapshot, eliminating the
 * round-trip on every filter change. The cap is defensive — at ~342 posts
 * today the gzipped payload is ~150 KB, well within budget. If the corpus
 * grows past the cap, switch back to paged server fetches for discover.
 */
export async function listAllPostsForFeed(limit = 2000): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POSTS_WITH_TAGS_SELECT)
    .eq("media_type", "image")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return flattenPostsWithTags(data ?? []);
}

export async function listPosts(filters: PostFilters = {}): Promise<Post[]> {
  const supabase = await createClient();

  // Tag intersection first — if no post matches all selected tags, short
  // circuit before building the main query.
  const tagIds = filters.tags && filters.tags.length > 0
    ? await postIdsMatchingAllTags(filters.tags)
    : null;
  if (tagIds !== null && tagIds.length === 0) return [];

  let query = supabase.from("posts").select(POSTS_WITH_TAGS_SELECT);

  if (tagIds !== null) {
    query = query.in("id", tagIds);
  }

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

  if (filters.sort === "top") {
    query = query
      .order("likes", { ascending: false })
      .order("created_at", { ascending: false });
  } else if (filters.sort === "viewed") {
    query = query
      .order("views", { ascending: false })
      .order("created_at", { ascending: false });
  } else if (filters.sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(filters.limit ?? 60);

  const { data, error } = await query;
  if (error) throw error;
  return flattenPostsWithTags(data ?? []);
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

export interface PostsCursor {
  /** Tuple anchor: posts.created_at (Feedlens insert time, NOT source post_at). */
  created_at: string;
  id: string;
}

export interface PagedPostsResult {
  posts: Post[];
  nextCursor: PostsCursor | null;
}

export async function listPostsPaged(
  filters: PostFilters = {},
  cursor: PostsCursor | null = null,
): Promise<PagedPostsResult> {
  const supabase = await createClient();

  // Tag intersection — fetch the candidate id set up front. The cursor
  // walks the same id set (no re-fetch on page-2), but for huge tag sets
  // we may want a database-side approach later.
  const tagIds = filters.tags && filters.tags.length > 0
    ? await postIdsMatchingAllTags(filters.tags)
    : null;
  if (tagIds !== null && tagIds.length === 0) {
    return { posts: [], nextCursor: null };
  }

  let query = supabase.from("posts").select(POSTS_WITH_TAGS_SELECT);

  if (tagIds !== null) {
    query = query.in("id", tagIds);
  }

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

  // Free-text search across prompt body, source_user (legacy author), and the
  // external creator handle/URL. Supabase `.or` takes a comma-separated list
  // of `column.op.value` clauses; we ilike-match each candidate column.
  if (filters.q && filters.q.trim().length > 0) {
    const term = escapeIlike(filters.q.trim());
    const pattern = `%${term}%`;
    query = query.or(
      [
        `prompt.ilike.${pattern}`,
        // Post owner / author fields (legacy + URL-derived)
        `source_user.ilike.${pattern}`,
        `source_url.ilike.${pattern}`,
        // External curator (the person who attributed/posted it on social)
        `external_creator_handle.ilike.${pattern}`,
        `external_creator_url.ilike.${pattern}`,
        `external_creator_platform.ilike.${pattern}`,
        // Taxonomy slugs so e.g. "midjourney" or "reddit" match
        `model_slug.ilike.${pattern}`,
        `platform_slug.ilike.${pattern}`,
      ].join(","),
    );
  }

  // Sort + keyset cursor on (created_at, id):
  //  - newest: created_at DESC, id DESC; cursor narrows to rows strictly after
  //  - oldest: created_at ASC,  id ASC;  cursor narrows the other direction
  //  - top:    likes DESC then created_at DESC; cursor is a pragmatic tiebreaker
  //            on (created_at, id) only — likes can drift but the hard limit
  //            keeps the result set bounded.
  const sort = filters.sort ?? "newest";
  const limit = filters.limit ?? 30;

  if (sort === "top") {
    query = query
      .order("likes", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }
  } else if (sort === "viewed") {
    query = query
      .order("views", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }
  } else if (sort === "oldest") {
    query = query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (cursor) {
      query = query.or(
        `created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`,
      );
    }
  } else {
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }
  }

  query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  const posts = flattenPostsWithTags(data ?? []);
  const last = posts[posts.length - 1];
  const nextCursor =
    posts.length === limit && last
      ? { created_at: last.created_at, id: last.id }
      : null;
  return { posts, nextCursor };
}

export async function totalPostCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
