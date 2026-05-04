"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  meta?: number;
}

interface Props {
  activeValue?: string;
  allLabel: string;
  options: FilterOption[];
  onChange: (next: string | undefined) => void;
}

export function FilterDropdown({
  activeValue,
  allLabel,
  options,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function apply(next?: string) {
    onChange(next);
    setOpen(false);
  }

  const active = options.find((o) => o.value === activeValue);
  const currentLabel = active?.label ?? allLabel;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[10px] border bg-surface px-3 py-2 text-[13px] font-medium transition-colors hover:bg-hover hover:text-text",
          active ? "text-text" : "text-text-muted",
        )}
      >
        <span className="max-w-[140px] truncate">{currentLabel}</span>
        <ChevronDown
          className="h-3 w-3 opacity-50"
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-auto top-[calc(100%+4px)] z-20 min-w-[200px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[10px] border bg-surface shadow-surface sm:left-0 sm:max-w-[280px]">
          <button
            type="button"
            onClick={() => apply(undefined)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-muted hover:bg-hover hover:text-text"
          >
            <span className="w-4">
              {!activeValue ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
              ) : null}
            </span>
            <span className="flex-1">{allLabel}</span>
          </button>
          <div className="border-t" />
          <div className="max-h-[60vh] overflow-y-auto">
            {options.map((o) => {
              const isActive = o.value === activeValue;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => apply(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-hover hover:text-text",
                    isActive ? "text-text" : "text-text-muted",
                  )}
                >
                  <span className="w-4">
                    {isActive ? (
                      <Check
                        className="h-3.5 w-3.5"
                        strokeWidth={2.2}
                      />
                    ) : null}
                  </span>
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.meta !== undefined ? (
                    <span className="tabular-nums text-[11px] text-text-subtle">
                      {formatCount(o.meta)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
