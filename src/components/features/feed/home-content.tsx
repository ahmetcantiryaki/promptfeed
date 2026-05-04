"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Folder,
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

interface Props {
  models: Model[];
  platforms: Platform[];
  initialFeed: InitialFeed | null;
  initialFolders: SaveFolderSummary[] | null;
  initialFolderDetail: InitialFolderDetail | null;
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
}: Props) {
  const { state } = useFeedFilter();
  const { isAuthed } = useInteractions();
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
              setFolders(null);
              setFeed(null);
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
              setFeed(null);
            }
          }
        } else {
          const params = new URLSearchParams({ type: "image" });
          if (state.model) params.set("model", state.model);
          if (state.platform) params.set("platform", state.platform);
          if (state.sort === "top") params.set("sort", "top");
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

        <ContentBody
          state={state}
          isAuthed={isAuthed}
          feed={feed}
          folders={folders}
          folderDetail={folderDetail}
          onLoadMore={loadMore}
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
  onLoadMore: () => void;
  loadingMore: boolean;
}

function ContentBody({
  state,
  isAuthed,
  feed,
  folders,
  folderDetail,
  onLoadMore,
  loadingMore,
}: BodyProps) {
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
        <FeedGrid posts={folderDetail.posts} ownerMap={folderDetail.owners} />
      );
    }
    if (!folders || folders.length === 0) {
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
