"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Folder,
  Heart,
  Sparkles,
  Cpu,
  Globe,
} from "lucide-react";
import { formatCount } from "@/lib/utils";
import type {
  MediaType,
  Model,
  Platform,
  Post,
  PostSort,
  SaveFolder,
  SaveFolderSummary,
} from "@/types/domain";
import type { OwnerMap } from "@/lib/posts";
import { FilterBar } from "@/components/features/filter-bar/filter-bar";
import { FeedGrid } from "@/components/features/feed/feed-grid";
import { SavedFoldersGrid } from "@/components/features/save-folders/saved-folders-grid";
import {
  useFeedFilter,
  type FeedFilterState,
} from "@/components/providers/feed-filter-provider";
import { useInteractions } from "@/components/providers/interactions-provider";
import { useRouteProgress } from "@/components/providers/route-progress-provider";
import { useGridSize } from "@/hooks/use-grid-size";

interface InitialFolderDetail {
  folder: SaveFolder;
  posts: Post[];
  owners: OwnerMap;
}

interface InitialLiked {
  posts: Post[];
  owners: OwnerMap;
  nextCursor: string | null;
}

interface Props {
  models: Model[];
  platforms: Platform[];
  /** Full image dataset, pre-fetched once on the server so the client can
   *  filter / sort / search in memory without hitting the API. */
  allPosts: Post[];
  /** Owner profiles for every post in `allPosts`, keyed by owner_id. */
  allOwners: OwnerMap;
  initialFolders: SaveFolderSummary[] | null;
  initialFolderDetail: InitialFolderDetail | null;
  initialLiked: InitialLiked | null;
}

interface FeedData {
  posts: Post[];
  owners: OwnerMap;
  nextCursor: string | null;
}

/** Number of posts revealed by the masonry on first paint. Subsequent
 *  scrolls extend the slice in chunks of the same size — purely a client
 *  windowing strategy since the full dataset already lives in memory. */
const WINDOW_STEP = 60;

function escapeLikeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Apply the active feed filter to the pre-fetched dataset. All comparisons
 * are case-insensitive where natural language is involved; tag filtering
 * is AND-intersection across `state.tags`.
 */
function filterAndSortPosts(
  posts: readonly Post[],
  state: FeedFilterState,
): Post[] {
  const term = state.q?.trim().toLowerCase() ?? "";
  const termRe = term ? new RegExp(escapeLikeForRegex(term), "i") : null;
  const requiredTags = state.tags.length > 0 ? state.tags : null;
  const model = state.model;
  const platform = state.platform;

  const mode = state.tagsMode;

  // Gallery/Video are separate modes, not an optional filter: an unset
  // mediaType means the Gallery (image) tab, so the discover feed never
  // mixes the two. The top-center switcher flips between them.
  const mediaType: MediaType = state.mediaType ?? "image";

  const filtered = posts.filter((p) => {
    if (p.media_type !== mediaType) return false;
    if (model && p.model_slug !== model) return false;
    if (platform && p.platform_slug !== platform) return false;
    if (requiredTags) {
      const slugs = p.tag_slugs ?? [];
      if (mode === "any") {
        let hit = false;
        for (const candidate of requiredTags) {
          if (slugs.includes(candidate)) {
            hit = true;
            break;
          }
        }
        if (!hit) return false;
      } else {
        for (const required of requiredTags) {
          if (!slugs.includes(required)) return false;
        }
      }
    }
    if (termRe) {
      const haystack = [
        p.prompt,
        p.source_user,
        p.source_url ?? "",
        p.external_creator_handle ?? "",
        p.external_creator_url ?? "",
        p.external_creator_platform ?? "",
        p.model_slug,
        p.platform_slug,
      ].join(" ");
      if (!termRe.test(haystack)) return false;
    }
    return true;
  });

  return sortPosts(filtered, state.sort);
}

function sortPosts(posts: readonly Post[], sort: PostSort): Post[] {
  const arr = [...posts];
  switch (sort) {
    case "oldest":
      arr.sort((a, b) => {
        if (a.created_at === b.created_at) return a.id < b.id ? -1 : 1;
        return a.created_at < b.created_at ? -1 : 1;
      });
      break;
    case "top":
      arr.sort((a, b) => {
        if (a.likes !== b.likes) return b.likes - a.likes;
        if (a.created_at !== b.created_at)
          return a.created_at < b.created_at ? 1 : -1;
        return a.id < b.id ? 1 : -1;
      });
      break;
    case "viewed":
      arr.sort((a, b) => {
        if (a.views !== b.views) return b.views - a.views;
        if (a.created_at !== b.created_at)
          return a.created_at < b.created_at ? 1 : -1;
        return a.id < b.id ? 1 : -1;
      });
      break;
    case "newest":
    default:
      arr.sort((a, b) => {
        if (a.created_at === b.created_at) return a.id < b.id ? 1 : -1;
        return a.created_at < b.created_at ? 1 : -1;
      });
      break;
  }
  return arr;
}

export function HomeContent({
  models,
  platforms,
  allPosts,
  allOwners,
  initialFolders,
  initialFolderDetail,
  initialLiked,
}: Props) {
  const { state } = useFeedFilter();
  const { isAuthed, liked: likedSet } = useInteractions();
  const progress = useRouteProgress();
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Saved / liked stay as per-user fetches because they're not part of the
  // pre-fetched public dataset. Discover view derives entirely from
  // allPosts via the useMemo below — no refetch on filter changes.
  const [folders, setFolders] = useState<SaveFolderSummary[] | null>(
    initialFolders,
  );
  const [folderDetail, setFolderDetail] =
    useState<InitialFolderDetail | null>(initialFolderDetail);
  const [liked, setLiked] = useState<FeedData | null>(
    initialLiked
      ? {
          posts: initialLiked.posts,
          owners: initialLiked.owners,
          nextCursor: initialLiked.nextCursor,
        }
      : null,
  );

  // When a post is unliked anywhere (heart toggled on a card), drop it from
  // the cached liked list so the Liked view updates instantly.
  useEffect(() => {
    setLiked((prev) => {
      if (!prev) return prev;
      const filtered = prev.posts.filter((p) => likedSet.has(p.id));
      if (filtered.length === prev.posts.length) return prev;
      return { ...prev, posts: filtered };
    });
  }, [likedSet]);

  // Client-side filtered + sorted feed. Recomputes only when the dataset or
  // a filter knob changes — all O(n) over ~hundreds of posts, well under
  // a frame.
  const filteredPosts = useMemo(
    () => filterAndSortPosts(allPosts, state),
    [allPosts, state],
  );

  // Headline counts that track the active filter. Lets the StatsStrip
  // surface "127 prompts, 3 models, 2 platforms" instead of static totals
  // so the user can see how restrictive the current combination is.
  const filteredStats = useMemo(() => {
    const modelSet = new Set<string>();
    const platformSet = new Set<string>();
    for (const p of filteredPosts) {
      modelSet.add(p.model_slug);
      platformSet.add(p.platform_slug);
    }
    return {
      prompts: filteredPosts.length,
      models: modelSet.size,
      platforms: platformSet.size,
    };
  }, [filteredPosts]);
  const isFiltering = Boolean(
    state.model || state.platform || state.tags.length > 0 || state.q,
  );

  // Windowed slice — reveal more on scroll without paying the cost of
  // rendering every card on first paint.
  const [visibleCount, setVisibleCount] = useState(WINDOW_STEP);
  // Reset window when the filter result list changes (different posts).
  // Using length+first-id as a cheap signature — exact filter identity
  // doesn't matter, only "did the list change."
  const firstId = filteredPosts[0]?.id ?? "";
  useEffect(() => {
    setVisibleCount(WINDOW_STEP);
  }, [firstId, filteredPosts.length]);

  const windowedPosts = useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount],
  );

  const loadMore = useCallback(() => {
    setVisibleCount((current) => {
      if (current >= filteredPosts.length) return current;
      return Math.min(current + WINDOW_STEP, filteredPosts.length);
    });
  }, [filteredPosts.length]);

  // Per-user views (saved / liked) still need to refresh when the user
  // switches into them or changes folder. Discover relies on the in-memory
  // dataset so it never enters this effect.
  const isFirst = useRef(true);
  const requestId = useRef(0);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (state.view !== "saved" && state.view !== "liked") return;

    const id = ++requestId.current;
    const ac = new AbortController();
    progressRef.current.start();

    (async () => {
      try {
        if (state.view === "saved") {
          if (state.folder) {
            const res = await fetch(
              `/api/saved?folder=${encodeURIComponent(state.folder)}`,
              { signal: ac.signal, cache: "no-store" },
            );
            const json = await res.json();
            if (id !== requestId.current) return;
            if (json.success) {
              setFolderDetail(json.data);
            } else {
              setFolderDetail(null);
            }
          } else {
            const res = await fetch(`/api/saved`, {
              signal: ac.signal,
              cache: "no-store",
            });
            const json = await res.json();
            if (id !== requestId.current) return;
            if (json.success) {
              setFolders(json.data.folders);
              setFolderDetail(null);
            }
          }
        } else if (state.view === "liked") {
          const res = await fetch(`/api/liked`, {
            signal: ac.signal,
            cache: "no-store",
          });
          const json = await res.json();
          if (id !== requestId.current) return;
          if (json.success) {
            setLiked({
              posts: json.data.posts,
              owners: json.data.owners,
              nextCursor: json.data.nextCursor ?? null,
            });
          }
        }
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
      } finally {
        if (id === requestId.current) progressRef.current.done();
      }
    })();

    return () => {
      ac.abort();
      progressRef.current.done();
    };
  }, [state.view, state.folder]);

  const [loadingMoreLiked, setLoadingMoreLiked] = useState(false);
  const loadMoreInFlight = useRef(false);
  const loadMoreLiked = useCallback(async () => {
    if (loadMoreInFlight.current) return;
    if (!liked || !liked.nextCursor) return;
    loadMoreInFlight.current = true;
    setLoadingMoreLiked(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(WINDOW_STEP));
      params.set("cursor", liked.nextCursor);
      const res = await fetch(`/api/liked?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        const seen = new Set(liked.posts.map((p) => p.id));
        const incoming = (json.data.posts as Post[]).filter(
          (p) => !seen.has(p.id),
        );
        setLiked({
          posts: [...liked.posts, ...incoming],
          owners: { ...liked.owners, ...(json.data.owners as OwnerMap) },
          nextCursor: json.data.nextCursor ?? null,
        });
      }
    } catch {
      // swallow — infinite scroll failures shouldn't disrupt the page
    } finally {
      loadMoreInFlight.current = false;
      setLoadingMoreLiked(false);
    }
  }, [liked]);

  const hasMoreDiscover = visibleCount < filteredPosts.length;

  return (
    <>
      {state.view === "feed" ? (
        <FilterBarSticky models={models} platforms={platforms} />
      ) : null}

      <div className="px-3 pb-10 pt-4 sm:px-5 sm:pt-6 lg:px-7">
        {state.view === "feed" ? (
          <StatsStrip stats={filteredStats} filtering={isFiltering} />
        ) : null}
        {state.view === "saved" ? (
          <SavedHeader detail={folderDetail} folders={folders ?? []} />
        ) : null}
        {state.view === "liked" ? (
          <LikedHeader count={liked?.posts.length ?? 0} />
        ) : null}

        <ContentBody
          state={state}
          isAuthed={isAuthed}
          discoverPosts={windowedPosts}
          discoverOwners={allOwners}
          hasMoreDiscover={hasMoreDiscover}
          onLoadMoreDiscover={loadMore}
          folders={folders}
          folderDetail={folderDetail}
          liked={liked}
          onLoadMoreLiked={loadMoreLiked}
          loadingMoreLiked={loadingMoreLiked}
        />
      </div>
    </>
  );
}

interface BodyProps {
  state: ReturnType<typeof useFeedFilter>["state"];
  isAuthed: boolean;
  discoverPosts: Post[];
  discoverOwners: OwnerMap;
  hasMoreDiscover: boolean;
  onLoadMoreDiscover: () => void;
  folders: SaveFolderSummary[] | null;
  folderDetail: InitialFolderDetail | null;
  liked: FeedData | null;
  onLoadMoreLiked: () => void;
  loadingMoreLiked: boolean;
}

function ContentBody({
  state,
  isAuthed,
  discoverPosts,
  discoverOwners,
  hasMoreDiscover,
  onLoadMoreDiscover,
  folders,
  folderDetail,
  liked,
  onLoadMoreLiked,
  loadingMoreLiked,
}: BodyProps) {
  if (state.view === "liked") {
    if (!isAuthed) {
      return (
        <EmptyState
          icon={<Heart className="h-6 w-6" strokeWidth={1.6} />}
          title="Sign in to see your liked prompts"
          body="Like any prompt to keep it here — synced across devices."
          ctaHref="/login"
          ctaLabel="Sign in"
        />
      );
    }
    if (liked === null) {
      return <FeedSkeletonGrid />;
    }
    if (liked.posts.length === 0) {
      return (
        <EmptyState
          icon={<Heart className="h-6 w-6" strokeWidth={1.6} />}
          title="No liked prompts yet"
          body="Tap the heart on any prompt to keep it here."
          ctaHref="/"
          ctaLabel="Browse Discover"
        />
      );
    }
    return (
      <FeedGrid
        posts={liked.posts}
        ownerMap={liked.owners}
        onLoadMore={onLoadMoreLiked}
        hasMore={Boolean(liked.nextCursor)}
        loadingMore={loadingMoreLiked}
        showEndOfFeed={false}
      />
    );
  }
  if (state.view === "saved") {
    if (!isAuthed) {
      return (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" strokeWidth={1.6} />}
          title="Sign in to see your saved prompts"
          body="Saved prompts sync across devices once you're signed in."
          ctaHref="/login"
          ctaLabel="Sign in"
        />
      );
    }
    if (state.folder) {
      if (!folderDetail) return null;
      if (folderDetail.posts.length === 0) {
        return (
          <EmptyState
            icon={<Bookmark className="h-6 w-6" strokeWidth={1.6} />}
            title={`"${folderDetail.folder.name}" is empty`}
            body="Tap the bookmark on any prompt and pick this folder to fill it up."
            ctaHref="/"
            ctaLabel="Browse Discover"
          />
        );
      }
      return (
        <FeedGrid
          posts={folderDetail.posts}
          ownerMap={folderDetail.owners}
          showEndOfFeed={false}
        />
      );
    }
    if (folders === null) {
      return <FoldersSkeletonGrid />;
    }
    if (folders.length === 0) {
      return (
        <EmptyState
          icon={<Folder className="h-6 w-6" strokeWidth={1.6} />}
          title="No folders yet"
          body="Tap the bookmark on any prompt to create your first folder."
          ctaHref="/"
          ctaLabel="Browse Discover"
        />
      );
    }
    return <SavedFoldersGrid folders={folders} />;
  }

  return (
    <FeedGrid
      posts={discoverPosts}
      ownerMap={discoverOwners}
      onLoadMore={onLoadMoreDiscover}
      hasMore={hasMoreDiscover}
      loadingMore={false}
    />
  );
}

/**
 * Sticky filter bar that animates on stick. A 0px sentinel right above the
 * wrapper enters/exits the viewport's top edge as the user scrolls past the
 * (mobile) topbar. We toggle a `data-pf-filter-stuck` attribute that triggers
 * a tiny slide-down + shadow via CSS, matching iOS/native nav-bar feel.
 */
function FilterBarSticky({
  models,
  platforms,
}: {
  models: Model[];
  platforms: Platform[];
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry?.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Zero-height sentinel — visible when the page is unscrolled, hidden
          (above viewport) once the user scrolls past the topbar. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-0" />
      <div
        data-pf-filter-stuck={stuck ? "true" : "false"}
        className="sticky top-0 z-30 bg-surface md:top-[calc(60px-1px)]"
      >
        <FilterBar models={models} platforms={platforms} />
      </div>
    </>
  );
}

/**
 * Masonry-style skeleton matching FeedGrid's flex-column layout. Heights are
 * deterministic per slot so the skeleton doesn't jitter on re-renders.
 */
function FeedSkeletonGrid() {
  const { cols: storedCols, mobileCols } = useGridSize();
  const [columnCount, setColumnCount] = useState<number>(storedCols);
  useEffect(() => {
    function compute() {
      setColumnCount(window.innerWidth < 768 ? mobileCols : storedCols);
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [storedCols, mobileCols]);

  // Card aspect heights cycle through a small set so columns visually stagger.
  const HEIGHTS = [220, 300, 260, 340, 240, 320, 280];
  const PER_COLUMN = 6;

  return (
    <div className="flex gap-3 sm:gap-4 lg:gap-5">
      {Array.from({ length: columnCount }).map((_, colIdx) => (
        <div key={colIdx} className="flex flex-1 flex-col gap-3 sm:gap-4 lg:gap-5">
          {Array.from({ length: PER_COLUMN }).map((_, rowIdx) => {
            const h = HEIGHTS[(colIdx + rowIdx * 2) % HEIGHTS.length] ?? 280;
            return (
              <div
                key={rowIdx}
                className="overflow-hidden rounded-[10px] border bg-surface-2"
              >
                <div
                  className="animate-pulse bg-gradient-to-br from-surface to-surface-2"
                  style={{ height: `${h}px` }}
                />
                <div className="space-y-2 px-3 py-2.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-surface" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FoldersSkeletonGrid() {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[14px] border bg-surface-2"
        >
          <div className="aspect-square animate-pulse bg-gradient-to-br from-surface to-surface-2" />
          <div className="px-3 py-3">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-2.5 w-1/3 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatsStripProps {
  stats: { prompts: number; models: number; platforms: number };
  filtering: boolean;
}

function StatsStrip({ stats, filtering }: StatsStripProps) {
  const items: Array<{
    label: string;
    value: number;
    icon: React.ReactNode;
  }> = [
    {
      label: "Prompts",
      value: stats.prompts,
      icon: <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />,
    },
    {
      label: "Models",
      value: stats.models,
      icon: <Cpu className="h-3.5 w-3.5" strokeWidth={2} />,
    },
    {
      label: "Platforms",
      value: stats.platforms,
      icon: <Globe className="h-3.5 w-3.5" strokeWidth={2} />,
    },
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 rounded-full border bg-surface-2/60 px-2.5 py-1 text-[12px] font-medium text-text-muted transition-colors"
        >
          <span className="text-text-subtle">{it.icon}</span>
          <span className="font-semibold tabular-nums text-text">
            {formatCount(it.value)}
          </span>
          <span>{it.label}</span>
        </span>
      ))}
      {filtering ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent"
          aria-live="polite"
        >
          Filtered
        </span>
      ) : null}
    </div>
  );
}

function LikedHeader({ count }: { count: number }) {
  return (
    <header className="mb-5 flex items-center gap-2">
      <Heart className="h-4 w-4 text-text-muted" strokeWidth={2} />
      <h1 className="text-[17px] font-semibold tracking-tight">
        Liked prompts
      </h1>
      <span className="text-[13px] text-text-subtle">
        {count} {count === 1 ? "item" : "items"}
      </span>
    </header>
  );
}

function SavedHeader({
  detail,
  folders,
}: {
  detail: InitialFolderDetail | null;
  folders: SaveFolderSummary[];
}) {
  const { setFilter } = useFeedFilter();
  return (
    <header className="mb-5 flex items-center gap-2">
      {detail ? (
        <button
          type="button"
          onClick={() => setFilter({ folder: undefined })}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          All folders
        </button>
      ) : (
        <Bookmark className="h-4 w-4 text-text-muted" strokeWidth={2} />
      )}
      <h1 className="text-[17px] font-semibold tracking-tight">
        {detail ? detail.folder.name : "Saved prompts"}
      </h1>
      <span className="text-[13px] text-text-subtle">
        {detail
          ? `${detail.posts.length} ${detail.posts.length === 1 ? "item" : "items"}`
          : `${folders.length} ${folders.length === 1 ? "folder" : "folders"}`}
      </span>
    </header>
  );
}

function EmptyState({
  icon,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="grid place-items-center rounded-[12px] border bg-surface-2/40 py-24 text-center">
      <div className="flex flex-col items-center gap-3 px-6">
        <span className="text-text-subtle">{icon}</span>
        <div className="text-[16px] font-semibold text-text">{title}</div>
        <p className="max-w-[360px] text-[13px] text-text-muted">{body}</p>
        <a
          href={ctaHref}
          className="mt-1 inline-flex items-center rounded-[10px] border border-accent bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg hover:opacity-90"
        >
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
