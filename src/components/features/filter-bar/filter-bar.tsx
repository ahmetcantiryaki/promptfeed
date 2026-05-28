"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeftRight, Search, SlidersHorizontal, X } from "lucide-react";
import type {
  Model,
  Platform,
  PostSort,
  Tag,
  TagAxis,
  TagsByAxis,
  TagsMatchMode,
} from "@/types/domain";
import { TAG_AXES, TAG_AXIS_LABEL } from "@/types/domain";
import { FilterDropdown, type FilterOption } from "./filter-dropdown";
import { GridSizeSelector } from "./grid-size-selector";
import { MobileGridSizeSelector } from "./mobile-grid-size-selector";
import { useFeedFilter } from "@/components/providers/feed-filter-provider";
import { useTags } from "@/components/providers/tags-provider";
import { cn, formatCount } from "@/lib/utils";

interface FilterBarProps {
  models: Model[];
  platforms: Platform[];
}

const SORT_OPTIONS: FilterOption[] = [
  { value: "newest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "top", label: "Top Liked" },
  { value: "viewed", label: "Most Viewed" },
];

export function FilterBar({ models, platforms }: FilterBarProps) {
  const { state, setFilter } = useFeedFilter();
  const { tagsByAxis } = useTags();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(state.q ?? "");

  useEffect(() => {
    setSearchInput(state.q ?? "");
  }, [state.q]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    const current = state.q ?? "";
    if (trimmed === current) return;
    const t = window.setTimeout(() => {
      setFilter({ q: trimmed || undefined });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, state.q, setFilter]);

  const modelOptions = useMemo<FilterOption[]>(
    () =>
      models.map((m) => ({
        value: m.slug,
        label: m.name,
        meta: m.post_count,
      })),
    [models],
  );

  const platformOptions = useMemo<FilterOption[]>(
    () =>
      platforms.map((p) => ({
        value: p.slug,
        label: p.name,
        meta: p.post_count,
      })),
    [platforms],
  );

  const activeCount =
    [state.model, state.platform].filter(Boolean).length +
    (state.sort !== "newest" ? 1 : 0) +
    (state.tags.length > 0 ? 1 : 0);

  return (
    <div className="flex items-center gap-2 border-b bg-surface px-3 py-3 sm:px-5 lg:px-7">
      <div className="flex w-full items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border bg-surface px-3 text-[13px] font-medium transition-colors hover:bg-hover",
            activeCount > 0 ? "text-text" : "text-text-muted",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Filters</span>
          {activeCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-text px-1.5 text-[10px] font-bold tabular-nums text-bg">
              {activeCount}
            </span>
          ) : null}
        </button>
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[10px] border bg-surface-2 px-3 transition-colors focus-within:border-border-strong">
          <Search
            className="h-3.5 w-3.5 shrink-0 text-text-subtle"
            strokeWidth={2}
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search prompts, creators"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
          />
        </label>
        <MobileGridSizeSelector />
      </div>

      <div className="hidden flex-1 flex-wrap items-center gap-2 md:flex">
        <FilterDropdown
          activeValue={state.model}
          allLabel="All Models"
          options={modelOptions}
          onChange={(v) => setFilter({ model: v })}
        />
        <FilterDropdown
          activeValue={state.platform}
          allLabel="All Platforms"
          options={platformOptions}
          onChange={(v) => setFilter({ platform: v })}
        />
        <FilterDropdown
          activeValue={state.sort}
          options={SORT_OPTIONS}
          onChange={(v) =>
            setFilter({ sort: (v as PostSort | undefined) ?? "newest" })
          }
        />
        <label className="flex w-[240px] items-center gap-2 rounded-[10px] border bg-surface-2 px-3 py-1.5 transition-all focus-within:w-[320px] focus-within:border-border-strong">
          <Search
            className="h-3.5 w-3.5 shrink-0 text-text-subtle"
            strokeWidth={2}
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search prompts, creators"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
          />
        </label>
      </div>

      <div className="hidden items-center gap-2 md:inline-flex">
        <span className="text-[12px] font-medium text-text-subtle">
          Grid Size
        </span>
        <GridSizeSelector />
      </div>

      <MobileFilterModal
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        models={models}
        platforms={platforms}
        tagsByAxis={tagsByAxis}
        activeModel={state.model}
        activePlatform={state.platform}
        activeSort={state.sort}
        activeTags={state.tags}
        activeTagsMode={state.tagsMode}
        activeCount={activeCount}
      />
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  models: Model[];
  platforms: Platform[];
  tagsByAxis: TagsByAxis;
  activeModel: string | undefined;
  activePlatform: string | undefined;
  activeSort: PostSort;
  activeTags: string[];
  activeTagsMode: TagsMatchMode;
  activeCount: number;
}

/**
 * Mobile filter modal — centered, fade-in animation handled by the shared
 * `pf-modal-content` keyframes (no custom slide that fights the parent
 * transform). Sized to span the viewport's vertical breathing room while
 * leaving a soft inset, so the sheet reads as a panel rather than a
 * full-screen takeover.
 *
 * NO horizontal scrolling anywhere — every section uses chip wrap. The
 * Tags zone collapses three axes behind a single segmented selector so
 * only one axis's chip grid is on-screen at a time; that's what lets all
 * 30 tags fit without forcing the body to scroll.
 *
 * Everything is instant-apply: chip taps fire `setFilter` immediately and
 * the URL updates via history.replaceState. "Done" just closes.
 */
function MobileFilterModal({
  open,
  onOpenChange,
  models,
  platforms,
  tagsByAxis,
  activeModel,
  activePlatform,
  activeSort,
  activeTags,
  activeTagsMode,
  activeCount,
}: ModalProps) {
  const { setFilter, clearFilters } = useFeedFilter();
  const [tagsAxis, setTagsAxis] = useState<TagAxis>("subject");

  const activeTagSet = useMemo(() => new Set(activeTags), [activeTags]);

  const onToggleTag = useCallback(
    (slug: string) => {
      const next = new Set(activeTags);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      setFilter({ tags: Array.from(next) });
    },
    [activeTags, setFilter],
  );

  const onFlipMode = useCallback(() => {
    setFilter({ tagsMode: activeTagsMode === "all" ? "any" : "all" });
  }, [activeTagsMode, setFilter]);

  const allTagsBySlug = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const axis of TAG_AXES) {
      for (const tag of tagsByAxis[axis] ?? []) map.set(tag.slug, tag);
    }
    return map;
  }, [tagsByAxis]);

  const selectedTagCount = activeTagSet.size;

  // Per-axis selection dot — keeps the user oriented while switching axes.
  const selectedPerAxis = useMemo(() => {
    const counts: Record<TagAxis, number> = {
      subject: 0,
      style: 0,
      use_case: 0,
    };
    for (const slug of activeTags) {
      const tag = allTagsBySlug.get(slug);
      if (tag) counts[tag.axis] += 1;
    }
    return counts;
  }, [activeTags, allTagsBySlug]);

  const otherMode = activeTagsMode === "all" ? "any" : "all";
  const currentAxisTags = tagsByAxis[tagsAxis] ?? [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="pf-modal-content fixed left-1/2 top-1/2 z-[70] flex max-h-[88dvh] w-[min(94vw,440px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[14px] border bg-surface shadow-2xl outline-none"
        >
          <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Dialog.Title className="text-[15px] font-semibold text-text">
                Filters
              </Dialog.Title>
              {activeCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-text px-1.5 text-[10px] font-bold tabular-nums text-bg">
                  {activeCount}
                </span>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-text-subtle transition-colors hover:bg-hover hover:text-text"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </Dialog.Close>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-4 py-4">
            <Section label="Model">
              <ChoiceChip
                label="All"
                active={!activeModel}
                onSelect={() => setFilter({ model: undefined })}
              />
              {models.map((m) => (
                <ChoiceChip
                  key={m.slug}
                  label={m.name}
                  active={activeModel === m.slug}
                  onSelect={() => setFilter({ model: m.slug })}
                />
              ))}
            </Section>

            <Section label="Platform">
              <ChoiceChip
                label="All"
                active={!activePlatform}
                onSelect={() => setFilter({ platform: undefined })}
              />
              {platforms.map((p) => (
                <ChoiceChip
                  key={p.slug}
                  label={p.name}
                  active={activePlatform === p.slug}
                  onSelect={() => setFilter({ platform: p.slug })}
                />
              ))}
            </Section>

            <Section label="Sort">
              {SORT_OPTIONS.map((o) => (
                <ChoiceChip
                  key={o.value}
                  label={o.label}
                  active={activeSort === o.value}
                  onSelect={() =>
                    setFilter({ sort: (o.value as PostSort) ?? "newest" })
                  }
                />
              ))}
            </Section>

            <div className="flex flex-col gap-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                  Tags
                </span>
                {selectedTagCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFilter({ tags: [] })}
                    className="text-[10.5px] font-medium text-text-subtle transition-colors hover:text-text"
                  >
                    Clear tags
                  </button>
                ) : null}
              </div>

              <div className="flex gap-1">
                {TAG_AXES.map((axis) => {
                  const active = tagsAxis === axis;
                  const dot = selectedPerAxis[axis];
                  return (
                    <button
                      key={axis}
                      type="button"
                      onClick={() => setTagsAxis(axis)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-[11.5px] font-medium transition-colors",
                        active
                          ? "border-text bg-text text-surface"
                          : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text",
                      )}
                    >
                      <span>{TAG_AXIS_LABEL[axis]}</span>
                      {dot > 0 ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            active ? "bg-surface" : "bg-text",
                          )}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {currentAxisTags.map((tag) => (
                  <ChoiceChip
                    key={tag.slug}
                    label={tag.name}
                    active={activeTagSet.has(tag.slug)}
                    onSelect={() => onToggleTag(tag.slug)}
                  />
                ))}
              </div>

              {selectedTagCount >= 2 ? (
                <button
                  type="button"
                  onClick={onFlipMode}
                  className="mt-1 inline-flex w-fit items-center gap-1.5 self-end rounded-full border bg-surface px-2.5 py-1 text-[10.5px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
                  title={`Switch to "matching ${otherMode}"`}
                >
                  <span>matching {activeTagsMode}</span>
                  <ArrowLeftRight
                    className="h-3 w-3 opacity-60"
                    strokeWidth={2.5}
                  />
                </button>
              ) : null}
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-2 border-t bg-surface-2/40 px-4 py-3">
            <button
              type="button"
              onClick={clearFilters}
              disabled={activeCount === 0}
              className="rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset all
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-text px-5 py-2 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Chip wrap row — never overflows horizontally, breaks to a new line. */
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ChoiceChip({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium leading-none transition-colors",
        active
          ? "border-text bg-text text-surface hover:opacity-90"
          : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text",
      )}
    >
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
