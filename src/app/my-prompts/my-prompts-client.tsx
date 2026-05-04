"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Heart, Bookmark, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Post } from "@/types/domain";
import type { MyPostStats } from "@/lib/my-prompts";
import { prettyModel, prettyPlatform } from "@/lib/labels";
import { timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser";

interface Props {
  posts: Post[];
  stats: MyPostStats[];
}

export function MyPromptsClient({ posts, stats }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState<Post | null>(null);

  async function doDelete(post: Post) {
    setDeleting(post.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      toast.success("Prompt deleted");
      setConfirmPost(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(null);
    }
  }

  if (posts.length === 0) {
    return (
      <div className="grid place-items-center rounded-[12px] border bg-surface-2/40 py-20 text-center">
        <div className="flex max-w-[360px] flex-col items-center gap-2 px-6">
          <div className="text-[15px] font-semibold text-text">
            No prompts yet
          </div>
          <p className="text-[13px] text-text-muted">
            Publish your first prompt from the top bar — it&apos;ll show here
            with live engagement stats.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {posts.map((post, i) => {
          const s = stats[i] ?? { likes: 0, saves: 0 };
          return (
            <li
              key={post.id}
              className="flex flex-col items-stretch gap-3 rounded-[12px] border bg-surface p-3 transition-colors hover:bg-hover/40 sm:flex-row sm:items-stretch"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.thumbnail_url ?? post.media_url}
                alt={post.prompt.slice(0, 60)}
                className="h-20 w-20 shrink-0 rounded-[8px] object-cover sm:h-24 sm:w-24"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[11px] text-text-subtle">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium">
                    {prettyModel(post.model_slug)}
                  </span>
                  <span>·</span>
                  <span>{prettyPlatform(post.platform_slug)}</span>
                  <span>·</span>
                  <span>{timeAgo(post.posted_at)}</span>
                </div>
                <p className="line-clamp-2 text-[13px] text-text">
                  {post.prompt}
                </p>
                <div className="mt-1 flex items-center gap-4 text-[12px] text-text-muted">
                  <Stat icon={<Heart className="h-3.5 w-3.5" strokeWidth={1.8} />}>
                    {s.likes} likes
                  </Stat>
                  <Stat icon={<Bookmark className="h-3.5 w-3.5" strokeWidth={1.8} />}>
                    {s.saves} saves
                  </Stat>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmPost(post)}
                  aria-label="Delete prompt"
                  className="grid h-10 w-10 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 sm:h-9 sm:w-9"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog.Root
        open={Boolean(confirmPost)}
        onOpenChange={(o) => {
          if (!o) setConfirmPost(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm" />
          <Dialog.Content
            className="pf-modal-content fixed left-1/2 top-1/2 z-[70] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border bg-surface p-6 shadow-2xl"
            aria-describedby="delete-desc"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-500">
                <Trash2 className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <Dialog.Title className="text-[16px] font-semibold text-text">
                  Delete this prompt?
                </Dialog.Title>
                <Dialog.Description
                  id="delete-desc"
                  className="mt-1 text-[13px] text-text-muted"
                >
                  Your prompt and its image will be removed permanently. This
                  can&apos;t be undone.
                </Dialog.Description>
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
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPost(null)}
                className="rounded-[10px] border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmPost && doDelete(confirmPost)}
                disabled={deleting === confirmPost?.id}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-red-500 bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {deleting === confirmPost?.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function Stat({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      {icon}
      {children}
    </span>
  );
}
