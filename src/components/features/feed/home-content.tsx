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
  Model,
  Platform,
  Post,
  SaveFolder,
  SaveFolderSummary,
} from "@/types/domain";
import type { OwnerMap } from "@/lib/posts";
import { FilterBar } from "@/components/features/filter-bar/filter-bar";
import { FeedGrid } from "@/components/features/feed/feed-grid";
import { SavedFoldersGrid } from "@/components/features/save-folders/saved-folders-grid";
import { useFeedFilter } from "@/components/providers/feed-filter-provider";
import { useInteractions } from "@/components/providers/interactions-provider";
import { useRouteProgress } from "@/components/providers/route-progress-provider";
import { useGridSize } from "@/hooks/use-grid-size";

interface InitialFeed {
  posts: Post[];
  owners: OwnerMap;
  nextCursor?: string | null;
}

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
  initialFeed: InitialFeed | null;
  initialFolders: SaveFolderSummary[] | null;
  initialFolderDetail: InitialFolderDetail | null;
  initialLiked: InitialLiked | null;
}

interface FeedData {
  posts: Post[];
  owners: OwnerMap;
  nextCursor: string | null;
}

const PAGE_SIZE = 30;

export function HomeContent({
  models,
  platforms,
  initialFeed,
  initialFolders,
  initialFolderDetail,
  initialLiked,
}: Props) {
  const { state } = useFeedFilter();
  const { isAuthed, liked: likedSet } = useInteractions();
  const progress = useRouteProgress();
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [feed, setFeed] = useState<FeedData | null>(
    initialFeed
      ? {
          posts: initialFeed.posts,
          owners: initialFeed.owners,
          nextCursor: initialFeed.nextCursor ?? null,
        }
      : null,
  );
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
  // the cached liked list so the Liked view updates instantly — no refetch.
  useEffect(() => {
    setLiked((prev) => {
      if (!prev) return prev;
      const filtered = prev.posts.filter((p) => likedSet.has(p.id));
      if (filtered.length === prev.posts.length) return prev;
      return { ...prev, posts: filtered };
    });
  }, [likedSet]);

  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreInFlight = useRef(false);
  const requestId = useRef(0);

  // Fetch on filter changes (skip first render — server already provided initial data)
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    const id = ++requestId.current;
    const ac = new AbortController();
    progressRef.current.start();

    // Saved-list view: keep prior folders visible while the API refreshes
    // (so re-entry doesn't blank out). We deliberately do NOT paint
    // cover-less synthetic placeholders — they used to flash broken-image
    // tiles for the duration of the fetch.

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
        } else {
          const params = new URLSearchParams({ type: "image" });
          if (state.model) params.set("model", state.model);
          if (state.platform) params.set("platform", state.platform);
          if (state.sort === "top") params.set("sort", "top");
          else if (state.sort === "oldest") params.set("sort", "oldest");
          else if (state.sort === "viewed") params.set("sort", "viewed");
          if (state.q && state.q.trim()) params.set("q", state.q.trim());
          params.set("limit", String(PAGE_SIZE));
          const res = await fetch(`/api/posts?${params.toString()}`, {
            signal: ac.signal,
            cache: "no-store",
          });
          const json = await res.json();
          if (id !== requestId.current) return;
          if (json.success) {
            setFeed({
              posts: json.data.posts,
              owners: json.data.owners,
              nextCursor: json.data.nextCursor ?? null,
            });
            setFolders(null);
            setFolderDetail(null);
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
  }, [state.view, state.model, state.platform, state.sort, state.folder, state.q]);

  const loadMore = useCallback(async () => {
    if (loadMoreInFlight.current) return;
    if (!feed || !feed.nextCursor) return;
    loadMoreInFlight.current = true;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ type: "image" });
      if (state.model) params.set("model", state.model);
      if (state.platform) params.set("platform", state.platform);
      if (state.sort === "top") params.set("sort", "top");
      else if (state.sort === "oldest") params.set("sort", "oldest");
      else if (state.sort === "viewed") params.set("sort", "viewed");
      if (state.q && state.q.trim()) params.set("q", state.q.trim());
      params.set("limit", String(PAGE_SIZE));
      params.set("cursor", feed.nextCursor);
      const res = await fetch(`/api/posts?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        const seen = new Set(feed.posts.map((p) => p.id));
        const incoming = (json.data.posts as Post[]).filter(
          (p) => !seen.has(p.id),
        );
        setFeed({
          posts: [...feed.posts, ...incoming],
          owners: { ...feed.owners, ...(json.data.owners as OwnerMap) },
          nextCursor: json.data.nextCursor ?? null,
        });
      }
    } catch {
      // swallow — infinite scroll failures shouldn't disrupt the page
    } finally {
      loadMoreInFlight.current = false;
      setLoadingMore(false);
    }
  }, [feed, state.model, state.platform, state.sort, state.q]);

  const loadMoreLiked = useCallback(async () => {
    if (loadMoreInFlight.current) return;
    if (!liked || !liked.nextCursor) return;
    loadMoreInFlight.current = true;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
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
      setLoadingMore(false);
    }
  }, [liked]);

  return (
    <>
      {state.view === "feed" ? (
        <FilterBarSticky models={models} platforms={platforms} />
      ) : null}

      <div className="px-3 pb-10 pt-4 sm:px-5 sm:pt-6 lg:px-7">
        {state.view === "feed" ? (
          <StatsStrip models={models} platforms={platforms} />
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
          feed={feed}
          folders={folders}
          folderDetail={folderDetail}
          liked={liked}
          onLoadMore={loadMore}
          onLoadMoreLiked={loadMoreLiked}
          loadingMore={loadingMore}
        />
      </div>
    </>
  );
}

interface BodyProps {
  state: ReturnType<typeof useFeedFilter>["state"];
  isAuthed: boolean;
  feed: FeedData | null;
  folders: SaveFolderSummary[] | null;
  folderDetail: InitialFolderDetail | null;
  liked: FeedData | null;
  onLoadMore: () => void;
  onLoadMoreLiked: () => void;
  loadingMore: boolean;
}

function ContentBody({
  state,
  isAuthed,
  feed,
  folders,
  folderDetail,
  liked,
  onLoadMore,
  onLoadMoreLiked,
  loadingMore,
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
        loadingMore={loadingMore}
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
      posts={feed?.posts ?? []}
      ownerMap={feed?.owners ?? {}}
      onLoadMore={onLoadMore}
      hasMore={Boolean(feed?.nextCursor)}
      loadingMore={loadingMore}
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

function StatsStrip({
  models,
  platforms,
}: {
  models: Model[];
  platforms: Platform[];
}) {
  const totalPrompts = useMemo(
    () => models.reduce((sum, m) => sum + (m.post_count ?? 0), 0),
    [models],
  );
  const modelCount = models.length;
  const platformCount = platforms.length;
  const items: Array<{
    label: string;
    value: number;
    icon: React.ReactNode;
  }> = [
    {
      label: "Prompts",
      value: totalPrompts,
      icon: <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />,
    },
    {
      label: "Models",
      value: modelCount,
      icon: <Cpu className="h-3.5 w-3.5" strokeWidth={2} />,
    },
    {
      label: "Platforms",
      value: platformCount,
      icon: <Globe className="h-3.5 w-3.5" strokeWidth={2} />,
    },
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 rounded-full border bg-surface-2/60 px-2.5 py-1 text-[12px] font-medium text-text-muted"
        >
          <span className="text-text-subtle">{it.icon}</span>
          <span className="font-semibold tabular-nums text-text">
            {formatCount(it.value)}
          </span>
          <span>{it.label}</span>
        </span>
      ))}
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
