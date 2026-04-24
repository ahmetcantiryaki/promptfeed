"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Heart,
  Copy,
  ExternalLink,
  Bookmark,
  UserPlus,
  UserCheck,
  Wand2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import type { Post } from "@/types/domain";
import type { OwnerInfo } from "@/lib/posts";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import { modelVisual } from "@/lib/brand";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { prettyModel, prettyPlatform } from "@/lib/labels";
import { BrandSquare } from "@/components/ui/brand-square";
import { useInteractions } from "@/components/providers/interactions-provider";
import { RemixCurtain } from "./remix-curtain";
import { DetailImageSlider } from "./detail-image-slider";

interface Props {
  post: Post | null;
  owner: OwnerInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostDetailModal({
  post,
  owner: _owner,
  open,
  onOpenChange,
}: Props) {
  const {
    liked,
    saved,
    followedHandles,
    currentHandle,
    toggleLike,
    toggleSave,
    toggleFollow,
  } = useInteractions();
  const isLiked = post ? liked.has(post.id) : false;
  const isSaved = post ? saved.has(post.id) : false;

  const sourceUser = post?.source_user ?? null;
  const isSelf =
    !!sourceUser && !!currentHandle && sourceUser === `@${currentHandle}`;
  const canFollow = Boolean(sourceUser) && !isSelf;
  const isFollowingOwner = Boolean(
    sourceUser && followedHandles.has(sourceUser),
  );

  const likeCount = (post?.likes ?? 0) + (isLiked ? 1 : 0);
  const saveCount = (post?.shares ?? 0) + (isSaved ? 1 : 0);

  async function copyPrompt() {
    if (!post) return;
    try {
      await navigator.clipboard.writeText(post.prompt);
      toast.success("Prompt copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function copyLink() {
    if (!post) return;
    try {
      const url = `${window.location.origin}/prompt/${post.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl" />
        <Dialog.Content
          className="pf-modal-content fixed left-1/2 top-1/2 z-[70] grid h-[96vh] w-[96vw] max-w-[1440px] -translate-x-1/2 -translate-y-1/2 grid-cols-1 overflow-hidden rounded-[16px] outline-none md:grid-cols-[70%_30%]"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">
            {post?.prompt.slice(0, 80) ?? "Post detail"}
          </Dialog.Title>

          {post ? (
            <>
              {/* LEFT — 70% — image area, centered, object-contain */}
              <div className="relative flex items-center justify-center overflow-hidden bg-black">
                {post.prompt_type === "remix" && post.source_image_url ? (
                  <RemixCurtain
                    inputUrl={post.source_image_url}
                    outputUrl={post.media_url}
                    alt={post.prompt.slice(0, 80)}
                    fit="contain"
                  />
                ) : (post.extra_image_urls?.length ?? 0) > 0 ? (
                  <DetailImageSlider
                    images={[post.media_url, ...(post.extra_image_urls ?? [])]}
                    alt={post.prompt.slice(0, 80)}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={post.media_url}
                    alt={post.prompt.slice(0, 80)}
                    className="max-h-full max-w-full object-contain"
                  />
                )}

                {post.prompt_type === "remix" ? (
                  <div className="pointer-events-none absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur">
                    <Wand2 className="h-3 w-3" strokeWidth={2} />
                    Remix
                  </div>
                ) : null}

                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </Dialog.Close>
              </div>

              {/* RIGHT — 30% — details panel (only the prompt text scrolls) */}
              <aside className="flex min-w-0 flex-col overflow-hidden border-l bg-surface">
                <div className="flex shrink-0 items-start justify-between gap-2 border-b px-5 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-text">
                      {post.source_user}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-subtle">
                      {isPlatformSlug(post.platform_slug) ? (
                        <PlatformBadge
                          platform={post.platform_slug}
                          size={12}
                          rounded={3}
                        />
                      ) : null}
                      <span>{prettyPlatform(post.platform_slug)}</span>
                      <span>·</span>
                      <span>{timeAgo(post.posted_at)}</span>
                    </div>
                  </div>
                  {canFollow && sourceUser ? (
                    <button
                      type="button"
                      onClick={() => toggleFollow(sourceUser)}
                      aria-pressed={isFollowingOwner}
                      className={cn(
                        "inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold transition-all active:scale-95",
                        isFollowingOwner
                          ? "border-transparent bg-surface-2 text-text hover:bg-hover"
                          : "border-accent bg-accent text-accent-fg hover:opacity-90",
                      )}
                    >
                      {isFollowingOwner ? (
                        <>
                          <UserCheck className="h-3 w-3" strokeWidth={2} />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3" strokeWidth={2} />
                          Follow
                        </>
                      )}
                    </button>
                  ) : null}
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-5 px-5 py-5">
                  <div className="shrink-0">
                    <Field label="Model">
                      <div className="flex items-center gap-2">
                        <BrandSquare
                          visual={modelVisual(post.model_slug)}
                          size={22}
                        />
                        <span className="text-[14px] font-semibold text-text">
                          {prettyModel(post.model_slug)}
                        </span>
                      </div>
                    </Field>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                      Prompt
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto rounded-[10px] border bg-surface-2 p-3">
                      <p className="whitespace-pre-wrap text-[13px] leading-[1.6] text-text">
                        {post.prompt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyPrompt}
                      className="inline-flex w-fit items-center gap-1.5 rounded-[8px] border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Copy prompt
                    </button>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 border-y py-3">
                    <ToggleStat
                      active={isLiked}
                      activeClass="bg-red-500 text-white hover:bg-red-600"
                      onClick={() => toggleLike(post.id)}
                      icon={
                        <Heart
                          className="h-4 w-4"
                          strokeWidth={2}
                          fill={isLiked ? "currentColor" : "none"}
                        />
                      }
                      count={likeCount}
                    />
                    <ToggleStat
                      active={isSaved}
                      activeClass="bg-text text-bg hover:bg-text"
                      onClick={() => toggleSave(post.id)}
                      icon={
                        <Bookmark
                          className="h-4 w-4"
                          strokeWidth={2}
                          fill={isSaved ? "currentColor" : "none"}
                        />
                      }
                      count={saveCount}
                    />
                    <button
                      type="button"
                      onClick={copyLink}
                      aria-label="Copy link"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-surface px-3 text-[12px] font-semibold text-text-muted transition-colors hover:bg-hover hover:text-text active:scale-95"
                    >
                      <Share2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>

                  {post.external_creator_handle &&
                  post.external_creator_platform ? (
                    <div className="shrink-0">
                    <Field label="Original creator">
                      <a
                        href={post.external_creator_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex w-fit items-center gap-2 rounded-[8px] border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-text transition-colors hover:bg-hover"
                      >
                        {isPlatformSlug(post.external_creator_platform) ? (
                          <PlatformBadge
                            platform={post.external_creator_platform}
                            size={14}
                            rounded={4}
                          />
                        ) : null}
                        <span>{post.external_creator_handle}</span>
                        <ExternalLink
                          className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
                          strokeWidth={2}
                        />
                      </a>
                    </Field>
                    </div>
                  ) : null}

                  {post.source_url ? (
                    <div className="shrink-0">
                      <Field label="Source">
                        <a
                          href={post.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 break-all text-[12px] text-text-muted hover:text-text"
                        >
                          <ExternalLink
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={1.8}
                          />
                          {post.source_url}
                        </a>
                      </Field>
                    </div>
                  ) : null}
                </div>
              </aside>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        {label}
      </div>
      {children}
    </div>
  );
}

function ToggleStat({
  icon,
  count,
  active,
  activeClass,
  onClick,
}: {
  icon: React.ReactNode;
  count: number;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold tabular-nums transition-all active:scale-95",
        active
          ? `border-transparent ${activeClass}`
          : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text",
      )}
    >
      {icon}
      <span>{formatCount(count)}</span>
    </button>
  );
}
