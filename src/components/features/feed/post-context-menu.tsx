"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  Copy,
  ExternalLink,
  Share2,
  Bookmark,
  Flag,
  MaximizeIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Post } from "@/types/domain";
import { useInteractions } from "@/components/providers/interactions-provider";
import { deletePostWithToast } from "@/lib/admin-post-actions";
import { EditPostDialog } from "@/components/features/admin/edit-post-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  post: Post;
  children: React.ReactNode;
  onOpenDetail: () => void;
}

/**
 * Right-click wrapper for a post card. Shows the same actions as the
 * bottom-bar 3-dot menu — Copy prompt, Open source, Share, Save, Report —
 * plus a quick "Open detail" shortcut. Admins also see Edit/Delete.
 */
export function PostContextMenuWrapper({ post, children, onOpenDetail }: Props) {
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
    try {
      const url = `${window.location.origin}/prompt/${post.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function onDelete() {
    await deletePostWithToast(post.id, () => router.refresh());
  }

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content
            className="z-[80] min-w-[200px] overflow-hidden rounded-[10px] border bg-surface p-1 shadow-2xl"
          >
            <Item
              onSelect={onOpenDetail}
              icon={<MaximizeIcon className="h-3.5 w-3.5" />}
            >
              Open detail
            </Item>
            <ContextMenu.Separator className="my-1 h-px bg-border" />
            <Item onSelect={copyPrompt} icon={<Copy className="h-3.5 w-3.5" />}>
              Copy prompt
            </Item>
            <Item
              onSelect={() =>
                window.open(post.source_url, "_blank", "noopener,noreferrer")
              }
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
                <ContextMenu.Separator className="my-1 h-px bg-border" />
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
                <ContextMenu.Separator className="my-1 h-px bg-border" />
                <Item
                  onSelect={() => toast("Reported. Thanks for the heads up.")}
                  icon={<Flag className="h-3.5 w-3.5" />}
                  danger
                >
                  Report
                </Item>
              </>
            )}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

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
    <ContextMenu.Item
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={
        "flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] outline-none " +
        (danger
          ? "text-red-500 data-[highlighted]:bg-red-500/10"
          : "text-text-muted data-[highlighted]:bg-hover data-[highlighted]:text-text")
      }
    >
      {icon}
      {children}
    </ContextMenu.Item>
  );
}
