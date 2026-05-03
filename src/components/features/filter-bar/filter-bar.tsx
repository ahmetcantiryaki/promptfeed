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
    <div className="flex flex-wrap items-center gap-2 border-b bg-surface px-7 py-3">
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

      <label className="flex w-[220px] items-center gap-2 rounded-[10px] border bg-surface-2 px-3 py-1.5 transition-all focus-within:w-[300px] focus-within:border-border-strong">
        <Search className="h-3.5 w-3.5 shrink-0 text-text-subtle" strokeWidth={2} />
        <input
          type="search"
          placeholder="Search prompts…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
        />
      </label>

      <div className="flex-1" />

      <div className="inline-flex items-center gap-2">
        <span className="text-[12px] font-medium text-text-subtle">
          Grid Size
        </span>
        <GridSizeSelector />
      </div>
    </div>
  );
}
