"use client";

import { useCallback, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  SlidersHorizontal,
  ChevronDown,
  X,
  ArrowLeftRight,
} from "lucide-react";
import type { Tag } from "@/types/domain";
import { TAG_AXES, TAG_AXIS_LABEL } from "@/types/domain";
import { useFeedFilter } from "@/components/providers/feed-filter-provider";
import { useTags } from "@/components/providers/tags-provider";
import { cn, formatCount } from "@/lib/utils";

/**
 * Top filter-bar "Filters" dropdown — a Browse-tags panel anchored next to
 * the Model / Platform / Sort selectors. Three axis columns of tag chips
 * with counts, a selected-tags tray with an AND/OR toggle, and a Done /
 * Clear footer. Every toggle writes straight to the feed filter (URL-
 * synced) so the grid updates live behind the open panel.
 */
export function FiltersDropdown() {
  const { state, setFilter } = useFeedFilter();
  const { tagsByAxis } = useTags();
  const [open, setOpen] = useState(false);

  const activeSet = useMemo(() => new Set(state.tags), [state.tags]);
  const count = state.tags.length;

  const bySlug = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const axis of TAG_AXES) {
      for (const t of tagsByAxis[axis]) m.set(t.slug, t);
    }
    return m;
  }, [tagsByAxis]);

  const selected = useMemo(
    () => state.tags.map((s) => bySlug.get(s)).filter((t): t is Tag => Boolean(t)),
    [state.tags, bySlug],
  );

  const toggle = useCallback(
    (slug: string) => {
      const next = new Set(state.tags);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      setFilter({ tags: Array.from(next) });
    },
    [state.tags, setFilter],
  );
  const clear = useCallback(() => setFilter({ tags: [] }), [setFilter]);
  const otherMode = state.tagsMode === "all" ? "any" : "all";
  const flipMode = useCallback(
    () => setFilter({ tagsMode: otherMode }),
    [setFilter, otherMode],
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Filters"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] border bg-surface px-3 py-2 text-[13px] font-medium transition-colors hover:bg-hover hover:text-text",
            count > 0 || open ? "text-text" : "text-text-muted",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Filters</span>
          {count > 0 ? (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-text px-1 text-[10px] font-bold tabular-nums text-bg">
              {count}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "h-3 w-3 opacity-50 transition-transform",
              open ? "rotate-180" : "",
            )}
            strokeWidth={2}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-[60] w-[min(720px,calc(100vw-1.5rem))] overflow-hidden rounded-[14px] border bg-surface shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold tracking-tight text-text">
                Browse tags
              </div>
              <div className="truncate text-[11.5px] text-text-subtle">
                Narrow results by subject, style &amp; use case.
              </div>
            </div>
            {count > 0 ? (
              <button
                type="button"
                onClick={clear}
                className="shrink-0 rounded-[8px] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-text-subtle transition-colors hover:bg-hover hover:text-text"
              >
                Clear
              </button>
            ) : null}
          </div>

          {/* Three axis columns */}
          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
            {TAG_AXES.map((axis) => (
              <div key={axis} className="flex flex-col bg-surface">
                <div className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                  {TAG_AXIS_LABEL[axis]}
                </div>
                <div className="pf-soft-scroll flex max-h-[320px] flex-wrap content-start gap-1.5 overflow-y-auto px-3 pb-3">
                  {tagsByAxis[axis].map((tag) => {
                    const active = activeSet.has(tag.slug);
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        onClick={() => toggle(tag.slug)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11.5px] font-medium leading-none transition-colors",
                          active
                            ? "border-text bg-text text-surface hover:opacity-90"
                            : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text",
                        )}
                      >
                        <span>{tag.name}</span>
                        <span
                          className={cn(
                            "tabular-nums text-[9.5px] leading-none",
                            active ? "opacity-70" : "text-text-subtle",
                          )}
                        >
                          {formatCount(tag.post_count)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Selected tray + mode toggle + Done */}
          <div className="flex items-center justify-between gap-3 border-t bg-surface-2/40 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {selected.length === 0 ? (
                <span className="text-[11.5px] text-text-subtle">
                  No tags selected
                </span>
              ) : (
                selected.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => toggle(t.slug)}
                    className="inline-flex items-center gap-1 rounded-full bg-text px-2 py-[3px] text-[11px] font-medium text-surface transition-opacity hover:opacity-90"
                  >
                    {t.name}
                    <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </button>
                ))
              )}
              {selected.length >= 2 ? (
                <button
                  type="button"
                  onClick={flipMode}
                  title={`Switch to "matching ${otherMode}"`}
                  className="ml-1 inline-flex items-center gap-1 rounded-full border bg-surface px-2 py-[3px] text-[10.5px] font-medium text-text-muted transition-colors hover:text-text"
                >
                  matching {state.tagsMode}
                  <ArrowLeftRight
                    className="h-2.5 w-2.5 opacity-60"
                    strokeWidth={2.5}
                  />
                </button>
              ) : null}
            </div>
            <Popover.Close asChild>
              <button
                type="button"
                className="shrink-0 rounded-[10px] bg-text px-4 py-2 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
