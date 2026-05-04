"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import {
  Bookmark,
  Check,
  ChevronDown,
  Folder,
  FolderPlus,
  Loader2,
  X,
} from "lucide-react";
import type { Post, SaveFolder } from "@/types/domain";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post | null;
  folders: readonly SaveFolder[];
  initialFolderId: string | null;
  onSave: (folderId: string) => Promise<void>;
  onCreateNew: () => void;
}

export function SaveDialog({
  open,
  onOpenChange,
  post,
  folders,
  initialFolderId,
  onSave,
  onCreateNew,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialFolderId);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedId(initialFolderId ?? folders[0]?.id ?? null);
      setPopoverOpen(false);
      setBusy(false);
    }
  }, [open, initialFolderId, folders]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedId) ?? null,
    [folders, selectedId],
  );

  async function handleSave() {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      await onSave(selectedId);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = post?.thumbnail_url || post?.media_url || null;
  const isVideoPreview =
    !post?.thumbnail_url && post?.media_type === "video" && post?.media_url;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          className="pf-modal-content fixed left-1/2 top-1/2 z-[70] flex max-h-[100dvh] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border bg-surface shadow-2xl"
          aria-describedby="save-dialog-desc"
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-[15px] font-semibold tracking-tight">
                Save to folder
              </Dialog.Title>
              <p
                id="save-dialog-desc"
                className="mt-0.5 text-[12px] text-text-muted"
              >
                Pick a folder or create a new one.
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

          {post ? (
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-surface-2">
                {previewUrl ? (
                  isVideoPreview ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      src={previewUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <Bookmark
                    className="h-5 w-5 text-text-subtle"
                    strokeWidth={1.6}
                  />
                )}
              </div>
              <p className="line-clamp-3 min-w-0 flex-1 text-[13px] leading-snug text-text-muted">
                {post.prompt}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t bg-surface px-3 py-3">
            <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  disabled={busy || folders.length === 0}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border bg-surface px-3 py-2.5 text-left text-[13px] font-semibold text-text transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Folder
                    className="h-4 w-4 shrink-0 text-text-muted"
                    strokeWidth={1.8}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {selectedFolder?.name ?? "Select folder"}
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-text-muted"
                    strokeWidth={1.8}
                  />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="start"
                  side="bottom"
                  sideOffset={6}
                  className="z-[80] flex max-h-[60dvh] w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[12px] border bg-surface shadow-2xl sm:max-h-[280px]"
                >
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
                    {folders.map((f) => {
                      const active = f.id === selectedId;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(f.id);
                            setPopoverOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors",
                            active
                              ? "bg-surface-2 font-semibold text-text"
                              : "text-text hover:bg-hover",
                          )}
                        >
                          <Folder
                            className="h-4 w-4 shrink-0 text-text-muted"
                            strokeWidth={1.8}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {f.name}
                          </span>
                          {f.is_default ? (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-text-subtle">
                              Default
                            </span>
                          ) : null}
                          {active ? (
                            <Check
                              className="h-4 w-4 text-accent"
                              strokeWidth={2.2}
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPopoverOpen(false);
                        onCreateNew();
                      }}
                      className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] font-semibold text-text-muted transition-colors hover:bg-hover hover:text-text"
                    >
                      <FolderPlus className="h-4 w-4" strokeWidth={1.8} />
                      New folder
                    </button>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedId || busy}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bookmark className="h-4 w-4" strokeWidth={2} fill="currentColor" />
              )}
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
