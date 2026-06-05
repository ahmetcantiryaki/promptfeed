"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { BadgeCheck, ChevronDown } from "lucide-react";
import type { PromptStatus } from "@/types/domain";
import { PROMPT_STATUSES } from "@/types/domain";
import { PROMPT_STATUS_META } from "@/lib/prompt-status";
import { useFeedFilter } from "@/components/providers/feed-filter-provider";
import { cn, formatCount } from "@/lib/utils";

export type PromptStatusCounts = Record<PromptStatus, number>;

/**
 * Toggle a tier in/out of the included set, keeping it canonical:
 *   - empty set  → no filter (every tier shown)
 *   - all three  → collapses back to empty (same meaning, cleaner URL)
 * Mirrors the encode/decode rules in `category-url.ts`.
 */
export function nextStatusSet(
  current: readonly PromptStatus[],
  toggled: PromptStatus,
): PromptStatus[] {
  const set = new Set(current);
  if (set.has(toggled)) set.delete(toggled);
  else set.add(toggled);
  if (set.size >= PROMPT_STATUSES.length) return [];
  return PROMPT_STATUSES.filter((s) => set.has(s));
}

/** One-line summary of what the current selection shows. */
export function promptStatusHelper(selected: readonly PromptStatus[]): string {
  if (selected.length === 0) {
    return "Showing all prompt tiers — verified, references and estimated.";
  }
  const labels = PROMPT_STATUSES.filter((s) => selected.includes(s)).map(
    (s) => PROMPT_STATUS_META[s].countLabel,
  );
  return `Showing only ${labels.join(" & ")}.`;
}

interface PromptStatusChipsProps {
  selected: readonly PromptStatus[];
  counts: PromptStatusCounts;
  onToggle: (status: PromptStatus) => void;
}

/**
 * The three trust-tier toggle chips + a live helper line. Active chips adopt
 * the tier's tinted color so they read as the same signal as the card / detail
 * badge; inactive chips stay neutral with just the colored dot. Shared by the
 * standalone dropdown, the Browse-tags panel, and the mobile filter sheet.
 */
export function PromptStatusChips({
  selected,
  counts,
  onToggle,
}: PromptStatusChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PROMPT_STATUSES.map((s) => {
          const meta = PROMPT_STATUS_META[s];
          const active = selected.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => onToggle(s)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium leading-none transition-colors",
                active
                  ? meta.tintedClass
                  : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dotClass)}
              />
              <span>{meta.label}</span>
              <span
                className={cn(
                  "tabular-nums text-[9.5px] leading-none",
                  active ? "opacity-70" : "text-text-subtle",
                )}
              >
                {formatCount(counts[s])}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] leading-[1.4] text-text-subtle">
        {promptStatusHelper(selected)}
      </p>
    </div>
  );
}

/**
 * Standalone "Prompt status" dropdown for the desktop filter bar (mockup 01),
 * sitting next to the Browse-tags "Filters" trigger. Writes straight to the
 * feed filter so the grid updates live behind the open panel.
 */
export function PromptStatusDropdown({ counts }: { counts: PromptStatusCounts }) {
  const { state, setFilter } = useFeedFilter();
  const [open, setOpen] = useState(false);
  const selected = state.promptStatus;
  const count = selected.length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Prompt status"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] border bg-surface px-3 py-2 text-[13px] font-medium transition-colors hover:bg-hover hover:text-text",
            count > 0 || open ? "text-text" : "text-text-muted",
          )}
        >
          <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Prompt status</span>
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
          className="z-[60] w-[min(380px,calc(100vw-1.5rem))] overflow-hidden rounded-[14px] border bg-surface shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold tracking-tight text-text">
                Prompt status
              </div>
              <div className="truncate text-[11.5px] text-text-subtle">
                Filter by how the prompt was sourced.
              </div>
            </div>
            {count > 0 ? (
              <button
                type="button"
                onClick={() => setFilter({ promptStatus: [] })}
                className="shrink-0 rounded-[8px] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-text-subtle transition-colors hover:bg-hover hover:text-text"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="p-4">
            <PromptStatusChips
              selected={selected}
              counts={counts}
              onToggle={(s) =>
                setFilter({ promptStatus: nextStatusSet(selected, s) })
              }
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
