"use client";

import { useGridSize } from "@/hooks/use-grid-size";
import { cn } from "@/lib/utils";

const OPTIONS = [2, 3, 4, 5] as const;

export function GridSizeSelector() {
  const { cols, setCols } = useGridSize();

  return (
    <div className="hidden overflow-hidden rounded-[10px] border md:inline-flex">
      {OPTIONS.map((n, i) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} columns`}
          aria-pressed={cols === n}
          onClick={() => setCols(n)}
          className={cn(
            "grid h-8 w-[34px] place-items-center bg-surface text-text-muted transition-colors hover:bg-hover hover:text-text",
            i < OPTIONS.length - 1 && "border-r",
            cols === n && "bg-surface-2 text-text",
          )}
        >
          <GridIcon n={n} />
        </button>
      ))}
    </div>
  );
}

function GridIcon({ n }: { n: number }) {
  const dots = Array.from({ length: n });
  return (
    <div className="flex items-center gap-[2px]">
      {dots.map((_, i) => (
        <span
          key={i}
          className="h-[10px] w-[2px] rounded-[1px] bg-current"
        />
      ))}
    </div>
  );
}
