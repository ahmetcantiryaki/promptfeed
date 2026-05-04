"use client";

import { Search } from "lucide-react";
import type { Model, Platform, PostSort } from "@/types/domain";
import { FilterDropdown } from "./filter-dropdown";
import { GridSizeSelector } from "./grid-size-selector";
import { useFeedFilter } from "@/components/providers/feed-filter-provider";

interface FilterBarProps {
  models: Model[];
  platforms: Platform[];
}

export function FilterBar({ models, platforms }: FilterBarProps) {
  const { state, setFilter } = useFeedFilter();

  return (
    <div className="flex items-center gap-2 border-b bg-surface px-3 py-3 sm:px-5 lg:px-7 md:flex-wrap">
      {/* Below md: chips scroll horizontally with snap; at md+: regular wrap. */}
      <div className="-mx-3 flex flex-1 items-center gap-2 overflow-x-auto px-3 pb-1 [scroll-snap-type:x_mandatory] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-none md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
        <div className="flex shrink-0 [scroll-snap-align:start]">
          <FilterDropdown
            activeValue={state.model}
            allLabel="All Models"
            options={models.map((m) => ({
              value: m.slug,
              label: m.name,
              meta: m.post_count,
            }))}
            onChange={(v) => setFilter({ model: v })}
          />
        </div>
        <div className="flex shrink-0 [scroll-snap-align:start]">
          <FilterDropdown
            activeValue={state.platform}
            allLabel="All Platforms"
            options={platforms.map((p) => ({
              value: p.slug,
              label: p.name,
              meta: p.post_count,
            }))}
            onChange={(v) => setFilter({ platform: v })}
          />
        </div>
        <div className="flex shrink-0 [scroll-snap-align:start]">
          <FilterDropdown
            activeValue={state.sort === "newest" ? undefined : state.sort}
            allLabel="Newest First"
            options={[
              { value: "newest", label: "Newest First" },
              { value: "top", label: "Top Liked" },
            ]}
            onChange={(v) =>
              setFilter({ sort: (v as PostSort | undefined) ?? "newest" })
            }
          />
        </div>

        <label className="flex w-full max-w-[220px] shrink-0 items-center gap-2 rounded-[10px] border bg-surface-2 px-3 py-1.5 transition-all focus-within:border-border-strong sm:max-w-[260px] focus-within:sm:max-w-[300px] [scroll-snap-align:start]">
          <Search
            className="h-3.5 w-3.5 shrink-0 text-text-subtle"
            strokeWidth={2}
          />
          <input
            type="search"
            placeholder="Search prompts…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
          />
        </label>
      </div>

      <div className="hidden flex-1 md:block" />

      <div className="hidden items-center gap-2 md:inline-flex">
        <span className="text-[12px] font-medium text-text-subtle">
          Grid Size
        </span>
        <GridSizeSelector />
      </div>
    </div>
  );
}
