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
}

/**
 * Flat pill row — no axis labels, just the selected tags side-by-side.
 * Used inside the modal's "Tags" field where space is tight and the axis
 * grouping adds noise. Tags are sorted subject → style → use_case so the
 * implicit ordering still reads consistently.
 */
export function TagPillsRow({ slugs, className }: RowProps) {
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
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} aria-label="Tags">
      {ordered.map((tag) => (
        <span
          key={tag.slug}
          className="inline-flex items-center rounded-full border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text"
        >
          {tag.name}
        </span>
      ))}
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
