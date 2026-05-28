"use client";

import type { Tag, TagAxis } from "@/types/domain";
import { TAG_AXES, TAG_AXIS_LABEL } from "@/types/domain";
import { useResolveTags } from "@/components/providers/tags-provider";
import { cn } from "@/lib/utils";

interface CompactProps {
  slugs: readonly string[] | undefined;
  max?: number;
  /** "badge" matches the dark Remix/+N badges (top-left of cards); "default"
   *  matches the light surface backgrounds (admin tables etc.). */
  tone?: "badge" | "default";
  /** When true, pills wrap to a new line; otherwise the row is single-line
   *  and may clip — used in tight spots like inline meta. */
  wrap?: boolean;
  className?: string;
}

/**
 * Compact pill row — designed for the top-left "image annotation" zone on
 * cards (alongside Remix / +N badges). Renders up to `max` chips then a "+N"
 * overflow chip; nothing when the post has no tags. Uses the same dark-blur
 * background as the Remix badge so it's readable on any image.
 */
export function TagPillsCompact({
  slugs,
  max = 3,
  tone = "badge",
  wrap = true,
  className,
}: CompactProps) {
  const resolved = useResolveTags(slugs);
  if (resolved.length === 0) return null;
  const visible = resolved.slice(0, max);
  const overflow = resolved.length - visible.length;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1",
        wrap && "flex-wrap",
        className,
      )}
      aria-label="Tags"
    >
      {visible.map((tag) => (
        <span
          key={tag.slug}
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] leading-none backdrop-blur",
            tone === "badge"
              ? "bg-black/70 text-white"
              : "bg-surface-2 text-text-muted",
          )}
        >
          {tag.name}
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] leading-none tabular-nums backdrop-blur",
            tone === "badge"
              ? "bg-black/55 text-white/90"
              : "bg-surface-2 text-text-subtle",
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

interface RowProps {
  slugs: readonly string[] | undefined;
  className?: string;
  /** When provided, each pill becomes a button that fires the handler. The
   *  modal uses this to apply the tag filter and close itself in one click. */
  onTagClick?: (slug: string) => void;
}

/**
 * Flat pill row — no axis labels, just the selected tags side-by-side.
 * Used inside the modal's "Tags" field where space is tight and the axis
 * grouping adds noise. Tags are sorted subject → style → use_case so the
 * implicit ordering still reads consistently.
 *
 * Each pill is rendered as a `<button>` when `onTagClick` is supplied so the
 * user can jump from "what tagged this image" straight into the filtered
 * feed; otherwise pills render as inert `<span>`s.
 */
export function TagPillsRow({ slugs, className, onTagClick }: RowProps) {
  const resolved = useResolveTags(slugs);
  if (resolved.length === 0) return null;
  const axisOrder: Record<TagAxis, number> = {
    subject: 0,
    style: 1,
    use_case: 2,
  };
  const ordered = [...resolved].sort(
    (a, b) => axisOrder[a.axis] - axisOrder[b.axis],
  );
  const baseClass =
    "inline-flex items-center rounded-full border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text";
  const interactiveClass =
    "transition-colors hover:border-text hover:bg-text hover:text-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} aria-label="Tags">
      {ordered.map((tag) =>
        onTagClick ? (
          <button
            key={tag.slug}
            type="button"
            onClick={() => onTagClick(tag.slug)}
            title={`Browse posts tagged ${tag.name}`}
            className={cn(baseClass, interactiveClass)}
          >
            {tag.name}
          </button>
        ) : (
          <span key={tag.slug} className={baseClass}>
            {tag.name}
          </span>
        ),
      )}
    </div>
  );
}

interface AxisProps {
  slugs: readonly string[] | undefined;
  className?: string;
}

/**
 * Full axis-grouped pill list — used inside the detail modal so the user can
 * see the complete categorisation at a glance. Each axis renders only when
 * it has at least one selected tag.
 */
export function TagPillsByAxis({ slugs, className }: AxisProps) {
  const resolved = useResolveTags(slugs);
  if (resolved.length === 0) return null;

  const buckets: Record<TagAxis, Tag[]> = {
    subject: [],
    style: [],
    use_case: [],
  };
  for (const tag of resolved) {
    if (tag.axis in buckets) buckets[tag.axis].push(tag);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {TAG_AXES.map((axis) => {
        const items = buckets[axis];
        if (items.length === 0) return null;
        return (
          <div key={axis} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
              {TAG_AXIS_LABEL[axis]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((tag) => (
                <span
                  key={tag.slug}
                  className="inline-flex items-center rounded-full border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
