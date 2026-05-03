"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  FolderPlus,
  ImageOff,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import type { SaveFolderSummary } from "@/types/domain";
import { useInteractions } from "@/components/providers/interactions-provider";
import { useFeedFilter } from "@/components/providers/feed-filter-provider";
import {
  deleteFolder,
  renameFolder,
  setDefaultFolder,
} from "@/lib/folders-client";
import { FolderCreateDialog } from "./folder-create-dialog";
import { cn, formatCount } from "@/lib/utils";

interface Props {
  folders: SaveFolderSummary[];
}

export function SavedFoldersGrid({ folders: initialFolders }: Props) {
  const router = useRouter();
  const { setFilter } = useFeedFilter();
  const { addFolder, setDefaultFolderClient, removeFolderFromState, renameFolderInState, userId } =
    useInteractions();
  const [folders, setFolders] = useState<SaveFolderSummary[]>(initialFolders);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SaveFolderSummary | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");

  function patchLocal(folderId: string, patch: Partial<SaveFolderSummary>) {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, ...patch } : f)),
    );
  }

  async function handleSetDefault(folderId: string) {
    if (!userId) return;
    try {
      await setDefaultFolder(userId, folderId);
      setFolders((prev) =>
        prev.map((f) => ({ ...f, is_default: f.id === folderId })),
      );
      setDefaultFolderClient(folderId);
      toast.success("Default folder updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update default");
    }
  }

  async function handleRename(folder: SaveFolderSummary) {
    setRenameTarget(folder);
    setRenameValue(folder.name);
  }

  async function commitRename() {
    if (!renameTarget) return;
    const newName = renameValue.trim();
    if (!newName || newName === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    try {
      await renameFolder(renameTarget.id, newName);
      patchLocal(renameTarget.id, { name: newName });
      renameFolderInState(renameTarget.id, newName);
      setRenameTarget(null);
      toast.success("Folder renamed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not rename");
    }
  }

  async function handleDelete(folder: SaveFolderSummary) {
    if (folder.is_default) {
      toast.error("Default folder can't be deleted");
      return;
    }
    const ok = window.confirm(
      `Delete folder "${folder.name}" and ${folder.post_count} saved ${folder.post_count === 1 ? "prompt" : "prompts"}?`,
    );
    if (!ok) return;
    try {
      await deleteFolder(folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      removeFolderFromState(folder.id);
      toast.success("Folder deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  return (
    <>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        }}
      >
        {folders.map((f) => (
          <div key={f.id} className="group relative">
            <button
              type="button"
              onClick={() => setFilter({ view: "saved", folder: f.id })}
              className="block w-full overflow-hidden rounded-[14px] border bg-surface-2 text-left transition-all hover:border-border-strong"
            >
              <CoverCollage urls={f.cover_urls} />
              <div className="flex items-start justify-between gap-2 px-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Folder
                      className="h-3.5 w-3.5 shrink-0 text-text-subtle"
                      strokeWidth={1.8}
                    />
                    <span className="truncate text-[13px] font-semibold text-text">
                      {f.name}
                    </span>
                    {f.is_default ? (
                      <Star
                        className="h-3 w-3 shrink-0 text-amber-500"
                        strokeWidth={2}
                        fill="currentColor"
                      />
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[11px] text-text-subtle">
                    {formatCount(f.post_count)}{" "}
                    {f.post_count === 1 ? "prompt" : "prompts"}
                  </div>
                </div>
              </div>
            </button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Folder options"
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/70 group-hover:opacity-100 focus:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-[80] min-w-[180px] overflow-hidden rounded-[10px] border bg-surface p-1 shadow-lg"
                >
                  <FolderMenuItem
                    icon={<Star className="h-3.5 w-3.5" strokeWidth={1.8} />}
                    label={f.is_default ? "Default folder" : "Set as default"}
                    disabled={f.is_default}
                    onSelect={() => handleSetDefault(f.id)}
                  />
                  <FolderMenuItem
                    icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />}
                    label="Rename"
                    onSelect={() => handleRename(f)}
                  />
                  <FolderMenuItem
                    icon={<Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />}
                    label="Delete"
                    danger
                    disabled={f.is_default}
                    onSelect={() => handleDelete(f)}
                  />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed bg-surface-2/40 text-text-muted transition-all hover:border-border-strong hover:bg-surface-2 hover:text-text"
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-surface text-text-muted shadow-surface transition-colors group-hover:text-text">
            <FolderPlus className="h-5 w-5" strokeWidth={1.6} />
          </div>
          <div className="text-[13px] font-semibold">New folder</div>
        </button>
      </div>

      <FolderCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New folder"
        description="Group future saves under this folder."
        submitLabel="Create folder"
        defaultMakeDefault={folders.length === 0}
        onSubmit={async (name, makeDefault) => {
          const created = await addFolder(name, makeDefault);
          setFolders((prev) => {
            const cleared = makeDefault
              ? prev.map((f) => ({ ...f, is_default: false }))
              : prev;
            const summary: SaveFolderSummary = {
              ...created,
              post_count: 0,
              cover_urls: [],
            };
            return [summary, ...cleared];
          });
        }}
      />

      {renameTarget ? (
        <RenameDialog
          name={renameValue}
          onChange={setRenameValue}
          onCancel={() => setRenameTarget(null)}
          onSubmit={commitRename}
        />
      ) : null}
    </>
  );
}

function CoverCollage({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <div className="grid aspect-square place-items-center bg-surface text-text-subtle">
        <ImageOff className="h-6 w-6" strokeWidth={1.6} />
      </div>
    );
  }
  if (urls.length === 1) {
    return (
      <div className="aspect-square overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[0]}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  if (urls.length === 2) {
    return (
      <div className="grid aspect-square grid-cols-2 gap-[2px] bg-black">
        {urls.slice(0, 2).map((u, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={i}
            src={u}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ))}
      </div>
    );
  }
  if (urls.length === 3) {
    return (
      <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-[2px] bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[0]}
          alt=""
          className="row-span-2 h-full w-full object-cover"
          loading="lazy"
        />
        {urls.slice(1, 3).map((u, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={i}
            src={u}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-[2px] bg-black">
      {urls.slice(0, 4).map((u, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={i}
          src={u}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ))}
    </div>
  );
}

interface FolderMenuItemProps {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

function FolderMenuItem({
  icon,
  label,
  disabled,
  danger,
  onSelect,
}: FolderMenuItemProps) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={(e) => {
        e.preventDefault();
        if (!disabled) onSelect();
      }}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12px] outline-none",
        disabled
          ? "cursor-not-allowed text-text-subtle opacity-60"
          : danger
            ? "text-red-500 hover:bg-red-500/10"
            : "text-text-muted hover:bg-hover hover:text-text",
      )}
    >
      {icon}
      {label}
    </DropdownMenu.Item>
  );
}

function RenameDialog({
  name,
  onChange,
  onCancel,
  onSubmit,
}: {
  name: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-[min(92vw,360px)] overflow-hidden rounded-[14px] border bg-surface shadow-2xl">
        <div className="border-b px-5 py-3.5">
          <div className="text-[14px] font-semibold">Rename folder</div>
        </div>
        <div className="px-5 py-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => onChange(e.target.value)}
            maxLength={48}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
              if (e.key === "Escape") onCancel();
            }}
            className="w-full rounded-[10px] border bg-surface px-3 py-2 text-[14px] focus:border-border-strong focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 border-t bg-surface px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border bg-surface px-3 py-1.5 text-[12px] font-medium text-text-muted hover:bg-hover hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!name.trim()}
            className="rounded-[10px] border border-accent bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
