"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Folder, FolderPlus, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  forced?: boolean;
  defaultMakeDefault?: boolean;
  onSubmit: (name: string, makeDefault: boolean) => Promise<void>;
}

export function FolderCreateDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  forced = false,
  defaultMakeDefault = true,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [makeDefault, setMakeDefault] = useState(defaultMakeDefault);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setMakeDefault(defaultMakeDefault);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, defaultMakeDefault]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed, makeDefault);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create folder");
    } finally {
      setBusy(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && forced && !busy) return;
    onOpenChange(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          className="pf-modal-content fixed left-1/2 top-1/2 z-[70] flex max-h-[100dvh] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border bg-surface shadow-2xl"
          aria-describedby="folder-create-desc"
          onEscapeKeyDown={(e) => {
            if (forced) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (forced) e.preventDefault();
          }}
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="flex items-start gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-text-muted">
                {forced ? (
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <FolderPlus className="h-4 w-4" strokeWidth={2} />
                )}
              </div>
              <div>
                <Dialog.Title className="text-[15px] font-semibold tracking-tight">
                  {title}
                </Dialog.Title>
                <p
                  id="folder-create-desc"
                  className="mt-0.5 text-[12px] text-text-muted"
                >
                  {description}
                </p>
              </div>
            </div>
            {!forced ? (
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-hover hover:text-text"
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </Dialog.Close>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 px-5 py-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
                Folder name
              </label>
              <div className="flex min-h-10 items-center gap-2 rounded-[10px] border bg-surface px-3 py-2.5 focus-within:border-border-strong">
                <Folder
                  className="h-4 w-4 shrink-0 text-text-subtle"
                  strokeWidth={1.8}
                />
                <input
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={48}
                  placeholder="e.g. Inspiration, Cinematic, Lighting refs"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-text placeholder:text-text-subtle focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[12px] text-text-muted">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-accent"
              />
              <span>Set as default folder for future saves</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t bg-surface px-5 py-3">
            {!forced ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-[10px] border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim() || busy}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4" strokeWidth={2} />
              )}
              {submitLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
