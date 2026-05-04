"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { Post } from "@/types/domain";
import type { OwnerMap } from "@/lib/posts";
import { PostCard } from "./post-card";
import { PostDetailModal } from "./post-detail-modal";
import { useGridSize } from "@/hooks/use-grid-size";

const COL_RESPONSIVE: Record<number, number> = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

interface Props {
  posts: Post[];
  ownerMap?: OwnerMap;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

interface Placement {
  post: Post;
  column: number;
  index: number;
}

export function FeedGrid({
  posts,
  ownerMap,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
}: Props) {
  const { cols: storedCols } = useGridSize();
  const [active, setActive] = useState<Post | null>(null);

  const columnCount = COL_RESPONSIVE[storedCols] ?? 4;

  // Map of post.id -> measured rendered height (px). Cards report their
  // height via ResizeObserver after their image loads.
  const [heights, setHeights] = useState<Record<string, number>>({});

  const reportHeight = useCallback((id: string, h: number) => {
    setHeights((prev) => {
      const existing = prev[id];
      if (existing !== undefined && Math.abs(existing - h) < 1) return prev;
      return { ...prev, [id]: h };
    });
  }, []);

  // Greedy place each post in the column with the smallest measured height,
  // preserving chronological order. Posts without a measurement yet are
  // placed using a fallback "estimate" based on the running average so the
  // first paint isn't lopsided.
  const placements = useMemo<Placement[]>(() => {
    const colHeights = new Array<number>(columnCount).fill(0);
    const result: Placement[] = [];
    const measuredValues = Object.values(heights);
    const fallback =
      measuredValues.length > 0
        ? measuredValues.reduce((a, b) => a + b, 0) / measuredValues.length
        : 320;

    for (const post of posts) {
      let target = 0;
      let min = colHeights[0] ?? 0;
      for (let i = 1; i < columnCount; i++) {
        const h = colHeights[i] ?? 0;
        if (h < min) {
          min = h;
          target = i;
        }
      }
      result.push({ post, column: target, index: result.length });
      const h = heights[post.id] ?? fallback;
      colHeights[target] = (colHeights[target] ?? 0) + h + 16; // +gap
    }
    return result;
  }, [posts, columnCount, heights]);

  const columns = useMemo<Placement[][]>(() => {
    const buckets: Placement[][] = Array.from(
      { length: columnCount },
      () => [],
    );
    for (const p of placements) {
      buckets[p.column]?.push(p);
    }
    return buckets;
  }, [placements, columnCount]);

  // Infinite scroll — sentinel at the bottom.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onLoadMore();
            break;
          }
        }
      },
      { rootMargin: "800px 0px 800px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  if (posts.length === 0 && !active) {
    return (
      <div className="grid place-items-center rounded-[10px] border bg-surface py-20 text-[14px] text-text-muted">
        No posts match these filters yet.
      </div>
    );
  }

  const activeOwner =
    active?.owner_id && ownerMap ? ownerMap[active.owner_id] ?? null : null;

  return (
    <>
      {/* Mobile: single column stack */}
      <div className="block space-y-4 sm:hidden">
        {posts.map((p) => (
          <MeasuredCard
            key={p.id}
            post={p}
            owner={p.owner_id && ownerMap ? ownerMap[p.owner_id] ?? null : null}
            onOpen={() => setActive(p)}
            onMeasure={reportHeight}
          />
        ))}
      </div>

      {/* Tablet+: balanced flex columns, packed by measured height */}
      <div className="hidden gap-4 sm:flex">
        {columns.map((col, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-4">
            {col.map(({ post }) => (
              <MeasuredCard
                key={post.id}
                post={post}
                owner={
                  post.owner_id && ownerMap
                    ? ownerMap[post.owner_id] ?? null
                    : null
                }
                onOpen={() => setActive(post)}
                onMeasure={reportHeight}
              />
            ))}
          </div>
        ))}
      </div>

      {hasMore ? (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="mt-6 flex h-16 items-center justify-center text-text-subtle"
        >
          {loadingMore ? (
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
          ) : null}
        </div>
      ) : posts.length > 0 ? (
        <EndOfFeed />
      ) : null}

      <PostDetailModal
        post={active}
        owner={activeOwner}
        open={active !== null}
        onOpenChange={(o) => {
          if (!o) setActive(null);
        }}
      />
    </>
  );
}

interface MeasuredCardProps {
  post: Post;
  owner: import("@/lib/posts").OwnerInfo | null;
  onOpen: () => void;
  onMeasure: (id: string, h: number) => void;
}

function MeasuredCard({ post, owner, onOpen, onMeasure }: MeasuredCardProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    // Initial measurement (image may already be cached)
    onMeasure(post.id, node.getBoundingClientRect().height);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        if (h > 0) onMeasure(post.id, h);
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [post.id, onMeasure]);

  return (
    <div ref={wrapRef} className="pf-card-in">
      <PostCard post={post} owner={owner} onOpen={onOpen} />
    </div>
  );
}

function EndOfFeed() {
  return (
    <div className="mt-8 grid place-items-center rounded-[12px] border bg-surface-2/40 px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <CheckCircle2
          className="h-6 w-6 text-text-subtle"
          strokeWidth={1.6}
        />
        <div className="text-[14px] font-semibold text-text">
          You&rsquo;ve reached the end
        </div>
        <p className="text-[12px] text-text-muted">
          That&rsquo;s every prompt for now.
        </p>
      </div>
    </div>
  );
}
