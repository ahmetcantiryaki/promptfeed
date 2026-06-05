import type { PromptStatus } from "@/types/domain";
import { PROMPT_STATUS_META } from "@/lib/prompt-status";
import { cn } from "@/lib/utils";

/**
 * The prompt-status trust pill. Two tones, one source of truth:
 *   - `glass`  — over media (feed cards): dark scrim + white label, the colored
 *                dot is the only hue, matching the existing Remix / +N badges.
 *   - `tinted` — on surfaces (detail header, filters, stats): a soft tinted
 *                pill (border + bg + text) in the tier's semantic color.
 * The colored dot is the constant across both, so the three tiers stay
 * recognizable at a glance without shouting over the imagery.
 */
interface PromptStatusBadgeProps {
  status: PromptStatus;
  tone?: "glass" | "tinted";
  className?: string;
}

export function PromptStatusBadge({
  status,
  tone = "tinted",
  className,
}: PromptStatusBadgeProps) {
  const meta = PROMPT_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        tone === "glass"
          ? "bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur"
          : cn("border px-2 py-[3px] text-[11px]", meta.tintedClass),
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dotClass)}
      />
      {meta.label}
    </span>
  );
}
