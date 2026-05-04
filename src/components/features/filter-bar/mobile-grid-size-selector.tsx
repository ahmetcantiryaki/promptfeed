"use client";

import { useGridSize } from "@/hooks/use-grid-size";
import { cn } from "@/lib/utils";

const OPTIONS = [1, 2] as const;

/** 1- vs 2-column grid picker, only visible below md (mobile/narrow tablets). */
export function MobileGridSizeSelector() {
  const { mobileCols, setMobileCols } = useGridSize();

  return (
    <div className="inline-flex h-9 shrink-0 overflow-hidden rounded-[10px] border md:hidden">
      {OPTIONS.map((n, i) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} column${n === 1 ? "" : "s"}`}
          aria-pressed={mobileCols === n}
          onClick={() => setMobileCols(n)}
          className={cn(
            "grid w-9 place-items-center bg-surface text-text-muted transition-colors hover:bg-hover hover:text-text",
            i < OPTIONS.length - 1 && "border-r",
            mobileCols === n && "bg-surface-2 text-text",
          )}
        >
          <GridIcon n={n} />
        </button>
      ))}
    </div>
  );
}

function GridIcon({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="h-[10px] w-[2px] rounded-[1px] bg-current"
        />
      ))}
    </div>
  );
}
