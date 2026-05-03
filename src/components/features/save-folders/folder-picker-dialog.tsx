"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Folder, FolderPlus, Loader2, X } from "lucide-react";
import type { SaveFolder } from "@/types/domain";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: readonly SaveFolder[];
  currentFolderId: string | null;
  onPick: (folderId: string) => Promise<void>;
  onCreateNew: () => void;
}

export function FolderPickerDialog({
  open,
  onOpenChange,
  folders,
  currentFolderId,
  onPick,
  onCreateNew,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function pick(folderId: string) {
    if (busyId) return;
    if (folderId === currentFolderId) {
      onOpenChange(false);
      return;
    }
    setBusyId(folderId);
    try {
      await onPick(folderId);
      onOpenChange(false);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          className="pf-modal-content fixed left-1/2 top-1/2 z-[70] flex max-h-[80vh] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border bg-surface shadow-2xl"
          aria-describedby="folder-picker-desc"
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-[15px] font-semibold tracking-tight">
                Move to folder
              </Dialog.Title>
              <p
                id="folder-picker-desc"
                className="mt-0.5 text-[12px] text-text-muted"
              >
                Pick a folder for this save.
              </p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
            {folders.map((f) => {
              const active = f.id === currentFolderId;
              const busy = busyId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => pick(f.id)}
                  disabled={Boolean(busyId)}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors",
                    active
                      ? "bg-surface-2"
                      : "hover:bg-hover disabled:opacity-50",
                  )}
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-surface-2 text-text-muted">
                    <Folder className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-semibold text-text">
                      {f.name}
                    </span>
                    {f.is_default ? (
                      <span className="text-[11px] text-text-subtle">
                        Default folder
                      </span>
                    ) : null}
                  </div>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                  ) : active ? (
                    <Check className="h-4 w-4 text-accent" strokeWidth={2.2} />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="border-t bg-surface px-3 py-3">
            <button
              type="button"
              onClick={onCreateNew}
              className="flex w-full items-center gap-2 rounded-[10px] border border-dashed bg-surface px-3 py-2.5 text-[13px] font-semibold text-text-muted transition-colors hover:border-border-strong hover:bg-hover hover:text-text"
            >
              <FolderPlus className="h-4 w-4" strokeWidth={1.8} />
              New folder
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
