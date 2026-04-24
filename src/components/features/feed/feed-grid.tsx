"use client";

import { useMemo, useState } from "react";
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

function hashStringToInt(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function estimateWeight(post: Post): number {
  const baseByType = post.prompt_type === "remix" ? 1.2 : 1.0;
  const bucket = hashStringToInt(post.id) % 5;
  const bucketWeights = [0.72, 0.88, 1.0, 1.18, 1.38];
  return baseByType * (bucketWeights[bucket] ?? 1);
}

function packIntoColumns<T extends Post>(posts: T[], cols: number): T[][] {
  const buckets: T[][] = Array.from({ length: cols }, () => []);
  const heights = new Array(cols).fill(0);
  posts.forEach((p) => {
    let target = 0;
    let min = heights[0] ?? 0;
    for (let i = 1; i < cols; i++) {
      const h = heights[i] ?? 0;
      if (h < min) {
        min = h;
        target = i;
      }
    }
    buckets[target]?.push(p);
    heights[target] = (heights[target] ?? 0) + estimateWeight(p);
  });
  return buckets;
}

interface Props {
  posts: Post[];
  ownerMap?: OwnerMap;
}

export function FeedGrid({ posts, ownerMap }: Props) {
  const { cols: storedCols } = useGridSize();
  const [active, setActive] = useState<Post | null>(null);

  const columnCount = COL_RESPONSIVE[storedCols] ?? 4;
  const columns = useMemo(
    () => packIntoColumns(posts, columnCount),
    [posts, columnCount],
  );

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
          <PostCard
            key={p.id}
            post={p}
            owner={p.owner_id && ownerMap ? ownerMap[p.owner_id] ?? null : null}
            onOpen={() => setActive(p)}
          />
        ))}
      </div>

      {/* Tablet+: balanced flex columns */}
      <div className="hidden gap-4 sm:flex">
        {columns.map((col, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-4">
            {col.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                owner={
                  p.owner_id && ownerMap ? ownerMap[p.owner_id] ?? null : null
                }
                onOpen={() => setActive(p)}
              />
            ))}
          </div>
        ))}
      </div>

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
