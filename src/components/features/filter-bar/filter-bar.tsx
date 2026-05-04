"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Model, Platform, PostSort } from "@/types/domain";
import { FilterDropdown, type FilterOption } from "./filter-dropdown";
import { GridSizeSelector } from "./grid-size-selector";
import { MobileGridSizeSelector } from "./mobile-grid-size-selector";
import { useFeedFilter } from "@/components/providers/feed-filter-provider";
import { cn, formatCount } from "@/lib/utils";

interface FilterBarProps {
  models: Model[];
  platforms: Platform[];
}

const SORT_OPTIONS: FilterOption[] = [
  { value: "newest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "top", label: "Top Liked" },
];

export function FilterBar({ models, platforms }: FilterBarProps) {
  const { state, setFilter } = useFeedFilter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(state.q ?? "");

  // Sync local input when the URL/state changes externally (back/forward,
  // reset, etc).
  useEffect(() => {
    setSearchInput(state.q ?? "");
  }, [state.q]);

  // Debounce: push the trimmed query into shared state 350ms after typing
  // stops. Empty string clears the filter.
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

  // Sort is always defined (default "newest" → "Latest"), so we don't hide
  // it behind an undefined sentinel. activeCount still ignores "newest"
  // so the Filters badge only ticks up for non-default sorts.
  const activeCount =
    [state.model, state.platform].filter(Boolean).length +
    (state.sort !== "newest" ? 1 : 0);

  return (
    <div className="flex items-center gap-2 border-b bg-surface px-3 py-3 sm:px-5 lg:px-7">
      {/* Mobile: single filter button + compact search */}
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

      {/* md+: full inline filter bar */}
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

      <MobileFilterDialog
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        initialModel={state.model}
        modelOptions={modelOptions}
        initialPlatform={state.platform}
        platformOptions={platformOptions}
        initialSort={state.sort}
        onApply={(next) => setFilter(next)}
      />
    </div>
  );
}

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialModel: string | undefined;
  modelOptions: FilterOption[];
  initialPlatform: string | undefined;
  platformOptions: FilterOption[];
  initialSort: PostSort;
  onApply: (next: {
    model: string | undefined;
    platform: string | undefined;
    sort: PostSort;
  }) => void;
}

function MobileFilterDialog({
  open,
  onOpenChange,
  initialModel,
  modelOptions,
  initialPlatform,
  platformOptions,
  initialSort,
  onApply,
}: DialogProps) {
  // Draft state — only flushed to the URL/feed via onApply when the user
  // taps "Show results". Selections inside the dialog don't refetch.
  const [draftModel, setDraftModel] = useState<string | undefined>(initialModel);
  const [draftPlatform, setDraftPlatform] = useState<string | undefined>(
    initialPlatform,
  );
  const [draftSort, setDraftSort] = useState<PostSort>(initialSort);

  // Re-sync drafts each time the dialog opens so an unfinished selection
  // from a previous open never leaks into the next session.
  useEffect(() => {
    if (open) {
      setDraftModel(initialModel);
      setDraftPlatform(initialPlatform);
      setDraftSort(initialSort);
    }
  }, [open, initialModel, initialPlatform, initialSort]);

  const dirty =
    draftModel !== initialModel ||
    draftPlatform !== initialPlatform ||
    draftSort !== initialSort;
  const hasAny =
    Boolean(draftModel) || Boolean(draftPlatform) || draftSort !== "newest";

  function reset() {
    setDraftModel(undefined);
    setDraftPlatform(undefined);
    setDraftSort("newest");
  }

  function apply() {
    onApply({
      model: draftModel,
      platform: draftPlatform,
      sort: draftSort,
    });
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="pf-modal-content fixed left-1/2 top-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border bg-surface shadow-2xl outline-none">
          <header className="flex items-center justify-between border-b px-5 py-4">
            <Dialog.Title className="text-[15px] font-semibold text-text">
              Filters
            </Dialog.Title>
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

          <div className="flex flex-col gap-4 px-5 py-5">
            <FilterField label="Model">
              <RadioList
                allLabel="All Models"
                activeValue={draftModel}
                options={modelOptions}
                onChange={setDraftModel}
              />
            </FilterField>
            <FilterField label="Platform">
              <RadioList
                allLabel="All Platforms"
                activeValue={draftPlatform}
                options={platformOptions}
                onChange={setDraftPlatform}
              />
            </FilterField>
            <FilterField label="Sort">
              {/* No allLabel — sort is always defined, so we just show two
                  options (Newest First / Top Liked) without an "All" row. */}
              <RadioList
                activeValue={draftSort}
                options={SORT_OPTIONS}
                onChange={(v) => setDraftSort((v as PostSort) ?? "newest")}
              />
            </FilterField>
          </div>

          <footer className="flex items-center justify-between gap-2 border-t bg-surface-2/40 px-5 py-3">
            <button
              type="button"
              onClick={reset}
              disabled={!hasAny}
              className="rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!dirty}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-text px-3 py-1.5 text-[12px] font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Show results
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        {label}
      </span>
      {children}
    </div>
  );
}

interface RadioListProps {
  /** When omitted, no "All" row is rendered (use for required-value fields
   *  like sort, where every option always has a value). */
  allLabel?: string;
  activeValue: string | undefined;
  options: FilterOption[];
  onChange: (v: string | undefined) => void;
}

function RadioList({
  allLabel,
  activeValue,
  options,
  onChange,
}: RadioListProps) {
  return (
    <div className="-mx-1 flex max-h-[32vh] flex-col overflow-y-auto">
      {allLabel ? (
        <RadioRow
          label={allLabel}
          active={!activeValue}
          onSelect={() => onChange(undefined)}
        />
      ) : null}
      {options.map((o) => (
        <RadioRow
          key={o.value}
          label={o.label}
          meta={o.meta}
          active={o.value === activeValue}
          onSelect={() => onChange(o.value)}
        />
      ))}
    </div>
  );
}

function RadioRow({
  label,
  meta,
  active,
  onSelect,
}: {
  label: string;
  meta?: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2.5 rounded-[8px] border px-3 py-2 text-left text-[13px] transition-colors",
        active
          ? "border-text bg-text/5 font-semibold text-text"
          : "border-transparent text-text-muted hover:bg-hover hover:text-text",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
          active ? "border-text" : "border-border-strong",
        )}
      >
        {active ? (
          <span className="h-2 w-2 rounded-full bg-text" />
        ) : null}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {meta !== undefined ? (
        <span className="tabular-nums text-[11px] text-text-subtle">
          {formatCount(meta)}
        </span>
      ) : null}
    </button>
  );
}
