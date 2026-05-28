"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import {
  MAX_TAGS_PER_POST,
  TAG_AXES,
  TAG_AXIS_LABEL,
  type Tag,
  type TagAxis,
  type TagsByAxis,
} from "@/types/domain";
import { cn } from "@/lib/utils";

interface Props {
  tagsByAxis: TagsByAxis;
  /** Selected tag slugs. Caller owns the Set; we never mutate it. */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Override the max (defaults to 5 — see MAX_TAGS_PER_POST). */
  max?: number;
  /** Optional axes the caller wants to render (default: all three). */
  axes?: readonly TagAxis[];
}

export function TagAxisPicker({
  tagsByAxis,
  selected,
  onChange,
  max = MAX_TAGS_PER_POST,
  axes = TAG_AXES,
}: Props) {
  const count = selected.size;
  const limitReached = count >= max;

  const allTagsBySlug = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const axis of TAG_AXES) {
      for (const tag of tagsByAxis[axis]) map.set(tag.slug, tag);
    }
    return map;
  }, [tagsByAxis]);

  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) {
      next.delete(slug);
    } else {
      if (next.size >= max) return;
      // Drop unknown selections so the parent never gets garbage.
      if (!allTagsBySlug.has(slug)) return;
      next.add(slug);
    }
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-text-muted">
        <span className="flex items-center gap-1.5">
          Tags<span className="text-red-500">*</span>
          <span className="text-[11px] font-normal text-text-subtle">
            pick 1–{max} across any axis
          </span>
        </span>
        <span
          className={cn(
            "tabular-nums text-[11px]",
            limitReached ? "text-amber-500" : "text-text-subtle",
          )}
        >
          {count} / {max}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 rounded-[10px] border bg-surface-2/40 p-3">
        {axes.map((axis) => {
          const tags = tagsByAxis[axis];
          if (tags.length === 0) return null;
          return (
            <div key={axis} className="flex flex-col gap-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                {TAG_AXIS_LABEL[axis]}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const isSelected = selected.has(tag.slug);
                  const isDisabled = !isSelected && limitReached;
                  return (
                    <button
                      key={tag.slug}
                      type="button"
                      onClick={() => toggle(tag.slug)}
                      disabled={isDisabled}
                      aria-pressed={isSelected}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                        isSelected
                          ? "border-text bg-text text-surface hover:opacity-90"
                          : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text",
                        isDisabled && "cursor-not-allowed opacity-40 hover:bg-surface hover:text-text-muted",
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      ) : null}
                      <span>{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
