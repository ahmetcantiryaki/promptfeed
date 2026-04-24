import Link from "next/link";
import { Search } from "lucide-react";
import type { Model, Platform, PostSort } from "@/types/domain";
import { FilterDropdown } from "./filter-dropdown";
import { GridSizeSelector } from "./grid-size-selector";

interface FilterBarProps {
  models: Model[];
  platforms: Platform[];
  activeModel?: string;
  activePlatform?: string;
  activeSort: PostSort;
  activeTab: "for-you" | "following";
}

export function FilterBar({
  models,
  platforms,
  activeModel,
  activePlatform,
  activeSort,
  activeTab,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-surface px-7 py-3">
      {/* LEFT CLUSTER — For You, Following, filters, Search */}
      <Link
        href="/"
        data-active={activeTab === "for-you" ? "true" : undefined}
        className="inline-flex items-center gap-1.5 rounded-[10px] border border-transparent px-3.5 py-1.5 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text data-[active=true]:bg-accent data-[active=true]:font-semibold data-[active=true]:text-accent-fg"
      >
        For You
      </Link>
      <Link
        href="/?tab=following"
        data-active={activeTab === "following" ? "true" : undefined}
        className="inline-flex items-center gap-1.5 rounded-[10px] border border-transparent px-3.5 py-1.5 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text data-[active=true]:bg-accent data-[active=true]:font-semibold data-[active=true]:text-accent-fg"
      >
        Following
      </Link>

      <FilterDropdown
        paramKey="model"
        activeValue={activeModel}
        allLabel="All Models"
        options={models.map((m) => ({
          value: m.slug,
          label: m.name,
          meta: m.post_count,
        }))}
      />
      <FilterDropdown
        paramKey="platform"
        activeValue={activePlatform}
        allLabel="All Platforms"
        options={platforms.map((p) => ({
          value: p.slug,
          label: p.name,
          meta: p.post_count,
        }))}
      />
      <FilterDropdown
        paramKey="sort"
        activeValue={activeSort === "newest" ? undefined : activeSort}
        allLabel="Newest First"
        options={[
          { value: "newest", label: "Newest First" },
          { value: "top", label: "Top Liked" },
        ]}
      />

      <label className="flex w-[220px] items-center gap-2 rounded-[10px] border bg-surface-2 px-3 py-1.5 transition-all focus-within:w-[300px] focus-within:border-border-strong">
        <Search className="h-3.5 w-3.5 shrink-0 text-text-subtle" strokeWidth={2} />
        <input
          type="search"
          placeholder="Search prompts…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
        />
      </label>

      {/* flex-1 spacer — pushes Grid Size alone to the far right */}
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
