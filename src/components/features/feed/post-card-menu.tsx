"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  MoreHorizontal,
  Copy,
  ExternalLink,
  Share2,
  Flag,
  Bookmark,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Post } from "@/types/domain";
import { cn } from "@/lib/utils";
import { useInteractions } from "@/components/providers/interactions-provider";
import { deletePostWithToast } from "@/lib/admin-post-actions";
import { EditPostDialog } from "@/components/features/admin/edit-post-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  post: Post;
  tone?: "light" | "dark";
}

export function PostCardMenu({ post, tone = "light" }: Props) {
  const { isAdmin } = useInteractions();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(post.prompt);
      toast.success("Prompt copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function share() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/prompt/${post.id}`
        : post.source_url;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function onDelete() {
    await deletePostWithToast(post.id, () => router.refresh());
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="More"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              tone === "dark"
                ? "bg-black/55 text-white hover:bg-black/75"
                : "text-text-muted hover:bg-hover hover:text-text",
            )}
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-[180px] overflow-hidden rounded-[10px] border bg-surface p-1 shadow-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <Item onSelect={copyPrompt} icon={<Copy className="h-3.5 w-3.5" />}>
              Copy prompt
            </Item>
            <Item
              onSelect={() => {
                window.open(post.source_url, "_blank", "noopener,noreferrer");
              }}
              icon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Open source
            </Item>
            <Item onSelect={share} icon={<Share2 className="h-3.5 w-3.5" />}>
              Share
            </Item>
            <Item
              onSelect={() => toast("Saved to your library")}
              icon={<Bookmark className="h-3.5 w-3.5" />}
            >
              Save
            </Item>

            {isAdmin ? (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <Item
                  onSelect={() => setEditOpen(true)}
                  icon={<Pencil className="h-3.5 w-3.5" />}
                >
                  Edit prompt
                </Item>
                <Item
                  onSelect={() => setDeleteOpen(true)}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  danger
                >
                  Delete
                </Item>
              </>
            ) : (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <Item
                  onSelect={() => toast("Reported. Thanks for the heads up.")}
                  icon={<Flag className="h-3.5 w-3.5" />}
                  danger
                >
                  Report
                </Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {isAdmin && editOpen ? (
        <EditPostDialog
          post={post}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => router.refresh()}
        />
      ) : null}
      {isAdmin && deleteOpen ? (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Bu promptu silmek istiyor musun?"
          description="Prompt ve ona bağlı görsel/like/save kayıtları kalıcı olarak silinir. Bu işlem geri alınamaz."
          confirmLabel="Sil"
          cancelLabel="Vazgeç"
          tone="danger"
          icon={<Trash2 className="h-5 w-5" strokeWidth={2} />}
          onConfirm={onDelete}
        />
      ) : null}
    </>
  );
}

function Item({
  children,
  icon,
  onSelect,
  danger,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] outline-none data-[highlighted]:bg-hover",
        danger
          ? "text-red-500 data-[highlighted]:bg-red-500/10"
          : "text-text-muted data-[highlighted]:text-text",
      )}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}
