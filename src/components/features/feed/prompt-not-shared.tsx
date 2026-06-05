import { EyeOff, Info } from "lucide-react";
import type { PromptStatus } from "@/types/domain";
import { PROMPT_STATUS_META } from "@/lib/prompt-status";

/**
 * Empty-state shown in place of the prompt body for tiers that have no
 * copyable prompt (Visual Reference). Deliberately neutral — no semantic color
 * — so it reads as "there is nothing to copy here" rather than an error or a
 * second-class prompt. The trust signal stays on the colored status badge.
 */
interface PromptNotSharedProps {
  status: PromptStatus;
}

export function PromptNotShared({ status }: PromptNotSharedProps) {
  const meta = PROMPT_STATUS_META[status];
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed bg-surface-2/60 p-6 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full border bg-surface text-text-subtle">
        <EyeOff className="h-5 w-5" strokeWidth={1.6} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-[14px] font-semibold text-text">
          {meta.emptyTitle ?? "Prompt not shared"}
        </div>
        <p className="mx-auto max-w-[280px] text-[12.5px] leading-[1.5] text-text-muted">
          {meta.helper}
        </p>
      </div>
      {meta.caveat ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-subtle">
          <Info className="h-3 w-3" strokeWidth={2} />
          {meta.caveat}
        </span>
      ) : null}
    </div>
  );
}
