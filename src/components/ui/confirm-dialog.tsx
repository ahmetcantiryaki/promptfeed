"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual tone of the confirm button. */
  tone?: "danger" | "primary";
  icon?: ReactNode;
  /** Async action; dialog closes automatically on success. */
  onConfirm: () => Promise<void> | void;
}

/**
 * Reusable confirm dialog matching the sign-out modal style.
 * Caller controls open state; we handle in-flight spinner and auto-close.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  tone = "danger",
  icon,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[100] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border bg-surface p-6 shadow-2xl outline-none"
          aria-describedby={description ? "confirm-desc" : undefined}
        >
          <div className="flex items-start gap-3">
            {icon ? (
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                  tone === "danger"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-accent/15 text-accent",
                )}
              >
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-semibold text-text">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description
                  id="confirm-desc"
                  className="mt-1 text-[13px] text-text-muted"
                >
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="rounded-[10px] border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[10px] border px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60",
                tone === "danger"
                  ? "border-red-500 bg-red-500"
                  : "border-accent bg-accent text-accent-fg",
              )}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
