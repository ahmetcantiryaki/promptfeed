"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { ArrowLeftRight, Search, X } from "lucide-react";
import type { Tag, TagAxis, TagsByAxis, TagsMatchMode } from "@/types/domain";
import { TAG_AXES, TAG_AXIS_LABEL } from "@/types/domain";
import { cn, formatCount } from "@/lib/utils";

export interface TagsFilterPanelProps {
  tagsByAxis: TagsByAxis;
  activeTags: ReadonlySet<string>;
  tagsMode: TagsMatchMode;
  onToggleTag: (slug: string) => void;
  onClearTags: () => void;
  onSetTagsMode: (mode: TagsMatchMode) => void;
  /** Tighter padding for the sidebar rail; the mobile filter dialog can
   *  request the default (slightly roomier) layout. */
  density?: "compact" | "comfortable";
}

/**
 * Tag picker, "browser + cart" model.
 *
 *   ▲ Browser zone  (search → tabs → chip grid)
 *   ▼ Cart zone     (selected chips + summary line at the bottom)
 *
 * Chips in the browser zone carry their selection state visually (filled
 * when selected). The cart strip at the bottom recaps the current selection
 * with an inline `matching all ⇆` toggle that flips between AND and OR
 * without a separate abstract control.
 *
 * Tab indicators carry a dot when their axis has any selected tag, so the
 * user never loses context while browsing a different axis. During search
 * the same slot shows a numeric match badge instead of the dot.
 *
 * Shared between the sidebar rail and the mobile filter dialog — both
 * call into the same component with `setFilter`-backed handlers, so the
 * URL stays in sync via `history.replaceState` and toggles cost nothing.
 */
export function TagsFilterPanel({
  tagsByAxis,
  activeTags,
  tagsMode,
  onToggleTag,
  onClearTags,
  onSetTagsMode,
  density = "compact",
}: TagsFilterPanelProps) {
  const [axisTab, setAxisTab] = useState<TagAxis>("subject");
  const [query, setQuery] = useState("");

  const allTagsBySlug = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const axis of TAG_AXES) {
      for (const tag of tagsByAxis[axis]) map.set(tag.slug, tag);
    }
    return map;
  }, [tagsByAxis]);

  const selectedChips = useMemo(() => {
    const list: Tag[] = [];
    for (const slug of activeTags) {
      const tag = allTagsBySlug.get(slug);
      if (tag) list.push(tag);
    }
    return list;
  }, [activeTags, allTagsBySlug]);

  const selectedPerAxis = useMemo(() => {
    const counts: Record<TagAxis, number> = {
      subject: 0,
      style: 0,
      use_case: 0,
    };
    for (const tag of selectedChips) counts[tag.axis] += 1;
    return counts;
  }, [selectedChips]);

  const trimmedQuery = query.trim().toLowerCase();
  const filtering = trimmedQuery.length > 0;

  const matchCounts = useMemo(() => {
    if (!filtering) {
      return {
        subject: tagsByAxis.subject.length,
        style: tagsByAxis.style.length,
        use_case: tagsByAxis.use_case.length,
      } as Record<TagAxis, number>;
    }
    const counts: Record<TagAxis, number> = {
      subject: 0,
      style: 0,
      use_case: 0,
    };
    for (const axis of TAG_AXES) {
      for (const tag of tagsByAxis[axis]) {
        if (
          tag.name.toLowerCase().includes(trimmedQuery) ||
          tag.slug.includes(trimmedQuery)
        ) {
          counts[axis] += 1;
        }
      }
    }
    return counts;
  }, [filtering, trimmedQuery, tagsByAxis]);

  const items = useMemo(() => {
    const list = tagsByAxis[axisTab];
    if (!filtering) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(trimmedQuery) ||
        t.slug.includes(trimmedQuery),
    );
  }, [tagsByAxis, axisTab, filtering, trimmedQuery]);

  const otherMode = tagsMode === "all" ? "any" : "all";
  const onFlipMode = useCallback(() => {
    onSetTagsMode(otherMode);
  }, [onSetTagsMode, otherMode]);

  const otherAxesWithMatches = useMemo(() => {
    if (!filtering) return [];
    const out: { axis: TagAxis; count: number }[] = [];
    for (const axis of TAG_AXES) {
      if (axis === axisTab) continue;
      const count = matchCounts[axis];
      if (count > 0) out.push({ axis, count });
    }
    return out;
  }, [filtering, matchCounts, axisTab]);

  const sidePad = density === "comfortable" ? "px-1" : "px-2";
  const chipPad = density === "comfortable" ? "px-2.5 py-1" : "px-2 py-[3px]";
  const chipText = density === "comfortable" ? "text-[12px]" : "text-[11px]";

  return (
    <div className="flex flex-col gap-2">
      {/* ── BROWSER ZONE ────────────────────────────────────── */}

      <div className={sidePad}>
        <div className="flex items-center gap-1.5 rounded-[8px] border bg-surface px-2 py-1 focus-within:border-text-subtle">
          <Search
            className="h-3 w-3 shrink-0 text-text-subtle"
            strokeWidth={2}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a tag…"
            aria-label="Search tags"
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-text placeholder:text-text-subtle focus:outline-none"
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="grid h-4 w-4 place-items-center rounded text-text-subtle hover:bg-hover hover:text-text"
            >
              <X className="h-2.5 w-2.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Tag axis"
        className="flex items-stretch border-b px-1"
      >
        {TAG_AXES.map((axis) => {
          const active = axisTab === axis;
          const matchCount = matchCounts[axis];
          const selectedCount = selectedPerAxis[axis];
          return (
            <button
              key={axis}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setAxisTab(axis)}
              className={cn(
                "relative flex-1 py-1.5 text-[11px] font-medium transition-colors",
                active
                  ? "text-text"
                  : filtering && matchCount === 0
                    ? "text-text-subtle/40"
                    : "text-text-subtle hover:text-text-muted",
              )}
            >
              <span className="inline-flex items-center gap-1">
                {selectedCount > 0 && !filtering ? (
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-text"
                  />
                ) : null}
                {TAG_AXIS_LABEL[axis]}
                {filtering && matchCount > 0 && !active ? (
                  <span className="grid h-3 min-w-3 place-items-center rounded-full bg-text px-1 text-[8.5px] font-semibold tabular-nums leading-none text-surface">
                    {matchCount}
                  </span>
                ) : null}
              </span>
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-text"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className={cn("flex flex-wrap gap-1", sidePad)}>
        {items.length === 0 ? (
          <div className="w-full py-1 text-[10.5px] text-text-subtle">
            {filtering ? (
              <span>
                No matches in {TAG_AXIS_LABEL[axisTab]}
                {otherAxesWithMatches.length > 0 ? (
                  <>
                    {" — try "}
                    {otherAxesWithMatches.map((m, i) => (
                      <Fragment key={m.axis}>
                        {i > 0 ? " or " : ""}
                        <button
                          type="button"
                          onClick={() => setAxisTab(m.axis)}
                          className="font-medium text-text underline decoration-text-subtle decoration-dotted underline-offset-2 hover:decoration-text"
                        >
                          {TAG_AXIS_LABEL[m.axis]} ({m.count})
                        </button>
                      </Fragment>
                    ))}
                  </>
                ) : null}
                .
              </span>
            ) : (
              <span>No tags in this axis yet.</span>
            )}
          </div>
        ) : (
          items.map((tag) => {
            const active = activeTags.has(tag.slug);
            return (
              <button
                key={tag.slug}
                type="button"
                onClick={() => onToggleTag(tag.slug)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border font-medium leading-none transition-colors",
                  chipPad,
                  chipText,
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
          })
        )}
      </div>

      {/* ── FOOTER CONTROLS — minimal, only when there are selections ─
          Selected tags are already visually filled inside the chip grid
          above and flagged via tab dots, so the bottom row holds nothing
          but the two controls: the mode toggle (left, when 2+ tags) and
          Clear (right, always present once any tag is on). No restated
          chip strip, no "X selected" label — both were redundant readouts
          that pushed the controls into awkward corners. */}
      {selectedChips.length > 0 ? (
        <div
          className={cn(
            "mt-1 flex items-center justify-between gap-2 border-t pt-2 pb-1 text-[10px] font-medium text-text-subtle",
            sidePad,
          )}
        >
          {selectedChips.length >= 2 ? (
            <button
              type="button"
              onClick={onFlipMode}
              aria-label={`Match mode is ${tagsMode}; click to switch to ${otherMode}`}
              title={`Click to switch to "matching ${otherMode}"`}
              className="inline-flex items-center gap-1 text-text-muted transition-colors hover:text-text"
            >
              <span>matching {tagsMode}</span>
              <ArrowLeftRight
                className="h-2.5 w-2.5 opacity-60"
                strokeWidth={2.5}
              />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={onClearTags}
            className="uppercase tracking-[0.18em] transition-colors hover:text-text"
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
