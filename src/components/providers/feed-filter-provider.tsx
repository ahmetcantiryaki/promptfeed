"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Model, Platform, PostSort, TagsMatchMode } from "@/types/domain";
import { DEFAULT_TAGS_MATCH_MODE } from "@/types/domain";
import {
  buildCategoryUrl,
  decodeMatchParam,
  decodeTagParam,
  readPathFilter,
  type FeedView,
} from "@/lib/category-url";

export type { FeedView } from "@/lib/category-url";

export interface FeedFilterState {
  model?: string;
  platform?: string;
  /** Selected tag slugs (multi). The composition mode is `tagsMode`. */
  tags: string[];
  /** How the tag set composes: "all" intersects, "any" unions. */
  tagsMode: TagsMatchMode;
  sort: PostSort;
  view: FeedView;
  folder?: string;
  /** Free-text search query (prompt body, source user, curator handle). */
  q?: string;
}

export interface FeedFilterContextValue {
  state: FeedFilterState;
  setFilter: (patch: Partial<FeedFilterState>) => void;
  clearFilters: () => void;
}

const FeedFilterContext = createContext<FeedFilterContextValue | null>(null);

function pickSort(raw: string | null | undefined): PostSort {
  if (raw === "top") return "top";
  if (raw === "oldest") return "oldest";
  if (raw === "viewed") return "viewed";
  return "newest";
}

function pickView(raw: string | null | undefined): FeedView {
  return raw === "saved" ? "saved" : raw === "liked" ? "liked" : "feed";
}

interface ProviderProps {
  children: ReactNode;
  models: Model[];
  platforms: Platform[];
}

/**
 * Filter state lives partially in the path (model + platform) and partially
 * in the query string (sort, q, view, folder). Path changes trigger real
 * Next.js navigation so the server can pre-render the category page with
 * ISR; query-only changes use replaceState so the existing HomeContent
 * useEffect handles a client-side refetch without a full route swap.
 */
export function FeedFilterProvider({
  children,
  models,
  platforms,
}: ProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const knownModels = useMemo(
    () => new Set(models.map((m) => m.slug)),
    [models],
  );
  const knownPlatforms = useMemo(
    () => new Set(platforms.map((p) => p.slug)),
    [platforms],
  );

  const readState = useCallback((): FeedFilterState => {
    const pf = readPathFilter(pathname, knownModels, knownPlatforms);
    const sp =
      searchParams ??
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams());
    return {
      model: pf.model,
      platform: pf.platform,
      tags: decodeTagParam(sp.get("tag")),
      tagsMode: decodeMatchParam(sp.get("match")),
      sort: pickSort(sp.get("sort")),
      view: pickView(sp.get("view")),
      folder: sp.get("folder") ?? undefined,
      q: sp.get("q") ?? undefined,
    };
  }, [pathname, searchParams, knownModels, knownPlatforms]);

  const [state, setState] = useState<FeedFilterState>(() => readState());

  // Re-sync after router.push (pathname/searchParams change) and on
  // back/forward navigation. This is what keeps the sidebar's "active
  // model" highlight in sync with the URL after a category-link click.
  useEffect(() => {
    setState(readState());
  }, [readState]);

  const setFilter = useCallback(
    (patch: Partial<FeedFilterState>) => {
      setState((prev) => {
        const next: FeedFilterState = { ...prev, ...patch };
        // Switching away from saved drops folder.
        if (patch.view !== undefined && next.view !== "saved") {
          next.folder = undefined;
        }
        // Saved/Liked are user-private views that intentionally drop
        // feed-only path filters, tag filters, and sort.
        if (next.view === "saved" || next.view === "liked") {
          next.model = undefined;
          next.platform = undefined;
          next.tags = [];
          next.tagsMode = DEFAULT_TAGS_MATCH_MODE;
          next.sort = "newest";
        }
        // Whenever the tag set empties the mode resets too — `match=any`
        // with no tags is meaningless and would leak into URL builders.
        if (next.tags.length === 0) {
          next.tagsMode = DEFAULT_TAGS_MATCH_MODE;
        }

        const targetUrl = buildCategoryUrl({
          model: next.model,
          platform: next.platform,
          tags: next.tags,
          tagsMode: next.tagsMode,
          sort: next.sort,
          q: next.q,
          view: next.view,
          folder: next.folder,
        });

        if (typeof window !== "undefined") {
          const targetPath = targetUrl.split("?")[0] ?? "/";
          const currentPath = window.location.pathname;
          const currentUrl = `${currentPath}${window.location.search}`;

          if (targetPath !== currentPath) {
            router.push(targetUrl);
          } else if (targetUrl !== currentUrl) {
            window.history.replaceState(null, "", targetUrl);
          }
        }
        return next;
      });
    },
    [router],
  );

  const clearFilters = useCallback(() => {
    setState({
      sort: "newest",
      view: "feed",
      tags: [],
      tagsMode: DEFAULT_TAGS_MATCH_MODE,
    });
    router.push("/");
  }, [router]);

  const value = useMemo(
    () => ({ state, setFilter, clearFilters }),
    [state, setFilter, clearFilters],
  );

  return (
    <FeedFilterContext.Provider value={value}>
      {children}
    </FeedFilterContext.Provider>
  );
}

export function useFeedFilter(): FeedFilterContextValue {
  const ctx = useContext(FeedFilterContext);
  if (!ctx) {
    throw new Error("useFeedFilter must be used within FeedFilterProvider");
  }
  return ctx;
}
