"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  meta?: string;
}

interface PrettySelectProps<T extends string = string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/** Radix Select with our design tokens, icon + meta support. */
export function PrettySelect<T extends string = string>({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  disabled,
  className,
}: PrettySelectProps<T>) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      disabled={disabled}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-[10px] border bg-surface px-3 py-2.5 text-[13px] text-text transition-colors",
          "hover:bg-hover focus:outline-none focus:ring-2 focus:ring-accent/30",
          "data-[state=open]:border-border-strong",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        <Select.Value placeholder={placeholder}>
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              {selected.icon}
              <span className="truncate">{selected.label}</span>
            </span>
          ) : null}
        </Select.Value>
        <Select.Icon asChild>
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-text-subtle"
            strokeWidth={2}
          />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "z-[200] max-h-[60dvh] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1rem)] overflow-hidden",
            "rounded-[10px] border bg-surface shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
          )}
        >
          <Select.Viewport className="p-1">
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-2 rounded-[6px] py-2 pl-2 pr-8 text-[13px] text-text-muted outline-none",
                  "data-[highlighted]:bg-hover data-[highlighted]:text-text",
                  "data-[state=checked]:bg-surface-2 data-[state=checked]:text-text data-[state=checked]:font-medium",
                )}
              >
                {o.icon}
                <Select.ItemText>{o.label}</Select.ItemText>
                {o.meta ? (
                  <span className="ml-auto text-[11px] text-text-subtle">
                    {o.meta}
                  </span>
                ) : null}
                <Select.ItemIndicator className="absolute right-2 text-text">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
