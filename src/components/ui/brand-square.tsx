import type { BrandVisual } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface Props {
  visual: BrandVisual;
  size?: number;
  className?: string;
}

export function BrandSquare({ visual, size = 22, className }: Props) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-[5px] border text-[11px] font-bold",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: visual.bg,
        color: visual.fg,
        borderColor: visual.borderColor ?? "var(--border)",
      }}
    >
      {visual.letter}
    </div>
  );
}
