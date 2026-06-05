/**
 * URL helpers for the path-based category routing introduced after we moved
 * model + platform out of query strings and into the URL path:
 *
 *   /                       Discover (no filter)
 *   /midjourney             single model
 *   /x                      single platform
 *   /midjourney/x           model + platform combo (model first, platform second)
 *   /midjourney?sort=top    sort/q stay in query string
 *   /?view=liked            user-private views still ride on / with view=
 *
 * Reading the current filter from a URL needs the known model/platform slug
 * sets so we can disambiguate /:slug — that's why the reader takes them as
 * arguments. Builders never need that.
 */

import type {
  MediaType,
  PostSort,
  PromptStatus,
  TagsMatchMode,
} from "@/types/domain";
import {
  DEFAULT_TAGS_MATCH_MODE,
  isPromptStatus,
  isTagsMatchMode,
  PROMPT_STATUSES,
} from "@/types/domain";

export type FeedView = "feed" | "saved" | "liked";

export interface CategoryFilter {
  model?: string;
  platform?: string;
  /** Selected tag slugs (multi). Encoded as `?tag=slug1,slug2`. */
  tags?: string[];
  /** AND vs OR composition for the tag set. Default "all" omits the param. */
  tagsMode?: TagsMatchMode;
  /** Image / video filter. Undefined = both (the new default). */
  mediaType?: MediaType;
  /** Included prompt-status tiers (multi). Empty / all = no filter. Encoded
   *  as `?status=verified,reference`. */
  promptStatus?: PromptStatus[];
  sort?: PostSort;
  q?: string;
  view?: FeedView;
  folder?: string;
}

/** Comma-separated tag slugs for the URL — empty array becomes undefined so
 *  the param is omitted entirely. Slugs are kebab-case (no commas), so a
 *  simple `join(",")` round-trips safely. */
function encodeTagParam(tags: readonly string[] | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  const cleaned = tags.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return cleaned.join(",");
}

export function decodeTagParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]+$/.test(s));
}

/** Read `?match=any|all`. Anything else falls back to the default ("all"). */
export function decodeMatchParam(
  raw: string | null | undefined,
): TagsMatchMode {
  if (isTagsMatchMode(raw)) return raw;
  return DEFAULT_TAGS_MATCH_MODE;
}

/** Read `?type=image|video`. Anything else returns undefined (= both). */
export function decodeMediaTypeParam(
  raw: string | null | undefined,
): MediaType | undefined {
  if (raw === "image" || raw === "video") return raw;
  return undefined;
}

/** Comma-separated prompt-status tiers. Empty OR all-three === no filter, so
 *  both collapse to `null` (param omitted) — the feed shows every tier. */
function encodeStatusParam(
  statuses: readonly PromptStatus[] | undefined,
): string | null {
  if (!statuses || statuses.length === 0) return null;
  const set = new Set(statuses.filter(isPromptStatus));
  if (set.size === 0 || set.size >= PROMPT_STATUSES.length) return null;
  return PROMPT_STATUSES.filter((s) => set.has(s)).join(",");
}

/** Read `?status=verified,reference,…`. Returns the canonical-ordered subset;
 *  empty or all-three collapses to `[]` (= no filter, every tier shown). */
export function decodeStatusParam(
  raw: string | null | undefined,
): PromptStatus[] {
  if (!raw) return [];
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(isPromptStatus),
  );
  if (set.size === 0 || set.size >= PROMPT_STATUSES.length) return [];
  return PROMPT_STATUSES.filter((s) => set.has(s));
}

export function buildCategoryUrl(f: CategoryFilter): string {
  if (f.view === "liked" || f.view === "saved") {
    const params = new URLSearchParams();
    params.set("view", f.view);
    if (f.folder) params.set("folder", f.folder);
    return `/?${params.toString()}`;
  }

  let path = "/";
  if (f.model && f.platform) path = `/${f.model}/${f.platform}`;
  else if (f.model) path = `/${f.model}`;
  else if (f.platform) path = `/${f.platform}`;

  const params = new URLSearchParams();
  if (f.sort && f.sort !== "newest") params.set("sort", f.sort);
  if (f.q && f.q.trim()) params.set("q", f.q.trim());
  const tagParam = encodeTagParam(f.tags);
  if (tagParam) params.set("tag", tagParam);
  // Only persist `match` when both (a) a non-default mode is set AND (b)
  // there are tags to compose — match=any with zero tags is meaningless.
  if (
    f.tagsMode &&
    f.tagsMode !== DEFAULT_TAGS_MATCH_MODE &&
    f.tags &&
    f.tags.length > 0
  ) {
    params.set("match", f.tagsMode);
  }
  if (f.mediaType) params.set("type", f.mediaType);
  const statusParam = encodeStatusParam(f.promptStatus);
  if (statusParam) params.set("status", statusParam);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export interface PathFilter {
  model?: string;
  platform?: string;
}

/**
 * Parse a pathname into model+platform using the known slug sets.
 * Returns empty object for unknown paths (the route layer handles 404).
 */
export function readPathFilter(
  pathname: string | null | undefined,
  knownModels: ReadonlySet<string>,
  knownPlatforms: ReadonlySet<string>,
): PathFilter {
  if (!pathname || pathname === "/") return {};
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return {};

  const a = segs[0];
  if (!a) return {};

  if (segs.length >= 2) {
    const b = segs[1];
    if (b && knownModels.has(a) && knownPlatforms.has(b)) {
      return { model: a, platform: b };
    }
  }

  if (knownModels.has(a)) return { model: a };
  if (knownPlatforms.has(a)) return { platform: a };
  return {};
}
