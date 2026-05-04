"use client";

import { useEffect, useMemo, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Heart,
  Copy,
  ExternalLink,
  Bookmark,
  Wand2,
  Share2,
  Braces,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import type { Post } from "@/types/domain";
import type { OwnerInfo } from "@/lib/posts";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import { ModelBadge } from "@/lib/model-icon";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { prettyModel, prettyPlatform } from "@/lib/labels";
import { useInteractions } from "@/components/providers/interactions-provider";
import { tryParseJson, prettifyJson } from "@/lib/prompt-format";
import { safeHref } from "@/lib/safe-url";
import { trackPostView } from "@/lib/track-view";
import { RemixCurtain } from "./remix-curtain";
import { DetailImageSlider } from "./detail-image-slider";

interface Props {
  post: Post | null;
  owner: OwnerInfo | null;
  /** Viewport-relative click origin (px). Drives the mobile scale-from-card
   *  open animation via CSS variables (--pf-origin-x/y). */
  origin?: { x: number; y: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostDetailModal({
  post,
  owner,
  origin,
  open,
  onOpenChange,
}: Props) {
  const { liked, saved, toggleLike, toggleSave } = useInteractions();
  const isLiked = post ? liked.has(post.id) : false;
  const isSaved = post ? saved.has(post.id) : false;

  // post.likes/shares already include the user's interaction (DB trigger),
  // so adjust the display only by the delta from the initial server state.
  // Reset the snapshot whenever the modal switches to a different post.
  const snapshotRef = useRef<{
    id: string | null;
    liked: boolean;
    saved: boolean;
  }>({ id: null, liked: false, saved: false });
  if (post && snapshotRef.current.id !== post.id) {
    snapshotRef.current = { id: post.id, liked: isLiked, saved: isSaved };
  }
  const likeCount =
    (post?.likes ?? 0) +
    (isLiked ? 1 : 0) -
    (snapshotRef.current.liked ? 1 : 0);
  const saveCount =
    (post?.shares ?? 0) +
    (isSaved ? 1 : 0) -
    (snapshotRef.current.saved ? 1 : 0);

  const parsedJson = useMemo(
    () => (post ? tryParseJson(post.prompt) : null),
    [post],
  );
  const isJson = parsedJson !== null;

  // Fire view-tracking exactly once per (post, open) transition.
  const lastTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !post) return;
    if (lastTrackedRef.current === post.id) return;
    lastTrackedRef.current = post.id;
    trackPostView(post.id);
  }, [open, post]);

  const viewCount = post
    ? (post as Post & { views?: number | null }).views ?? 0
    : 0;

  async function copyPrompt() {
    if (!post) return;
    try {
      await navigator.clipboard.writeText(post.prompt);
      toast.success("Prompt copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function copyPromptAsJson() {
    if (!post) return;
    const pretty = prettifyJson(post.prompt) ?? post.prompt;
    try {
      await navigator.clipboard.writeText(pretty);
      toast.success("JSON copied");
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
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] h-[100dvh] bg-black/85 backdrop-blur-xl" />
        <Dialog.Content
          className="pf-modal-content fixed inset-x-0 top-0 z-[70] flex h-[100dvh] flex-col overflow-y-auto overflow-x-hidden bg-bg pb-[env(safe-area-inset-bottom)] outline-none md:inset-auto md:left-1/2 md:top-1/2 md:grid md:h-[96vh] md:w-[96vw] md:max-w-[1440px] md:-translate-x-1/2 md:-translate-y-1/2 md:grid-cols-[70%_30%] md:overflow-hidden md:rounded-[16px] md:pb-0"
          style={
            origin
              ? ({
                  ["--pf-origin-x"]: `${origin.x}px`,
                  ["--pf-origin-y"]: `${origin.y}px`,
                } as React.CSSProperties)
              : undefined
          }
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">
            {post?.prompt.slice(0, 80) ?? "Post detail"}
          </Dialog.Title>

          {post ? (
            <>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="fixed right-3 top-3 z-40 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75 md:absolute"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </Dialog.Close>

              {/* LEFT — image area */}
              <div className="relative w-full bg-black md:flex md:items-center md:justify-center md:overflow-hidden">
                {post.prompt_type === "remix" && post.source_image_url ? (
                  <>
                    <div className="block md:hidden">
                      <RemixCurtain
                        inputUrl={post.source_image_url}
                        outputUrl={post.media_url}
                        alt={post.prompt.slice(0, 80)}
                        fit="natural"
                      />
                    </div>
                    <div className="hidden md:block md:h-full md:w-full">
                      <RemixCurtain
                        inputUrl={post.source_image_url}
                        outputUrl={post.media_url}
                        alt={post.prompt.slice(0, 80)}
                        fit="contain"
                      />
                    </div>
                  </>
                ) : (post.extra_image_urls?.length ?? 0) > 0 ? (
                  <div className="h-[60vh] w-full md:h-full">
                    <DetailImageSlider
                      images={[
                        post.media_url,
                        ...(post.extra_image_urls ?? []),
                      ]}
                      alt={post.prompt.slice(0, 80)}
                    />
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={post.media_url}
                    alt={post.prompt.slice(0, 80)}
                    className="block h-auto w-full md:max-h-full md:w-auto md:max-w-full md:object-contain"
                  />
                )}

                {post.prompt_type === "remix" ? (
                  <div className="pointer-events-none absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur">
                    <Wand2 className="h-3 w-3" strokeWidth={2} />
                    Remix
                  </div>
                ) : null}
              </div>

              {/* RIGHT — details panel (stacks below image on mobile) */}
              <aside className="flex min-w-0 flex-col bg-surface md:overflow-hidden md:border-l">
                <DetailHeader post={post} />

                <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-5 sm:py-5">
                  <div className="shrink-0">
                    <Field label="Model">
                      <div className="flex items-center gap-2">
                        <ModelBadge slug={post.model_slug} size={22} />
                        <span className="text-[14px] font-semibold text-text">
                          {prettyModel(post.model_slug)}
                        </span>
                      </div>
                    </Field>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                        Prompt
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isJson ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-[1px] text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-600">
                            <Braces className="h-2.5 w-2.5" strokeWidth={2.2} />
                            JSON
                          </span>
                        ) : null}
                        {/* Mobile-only inline copy — desktop has labelled buttons below */}
                        <button
                          type="button"
                          onClick={copyPrompt}
                          aria-label="Copy prompt"
                          className="inline-flex h-7 items-center gap-1 rounded-[7px] border bg-surface-2 px-2 text-[11px] font-semibold text-text-muted transition-colors hover:bg-hover hover:text-text md:hidden"
                        >
                          <Copy className="h-3 w-3" strokeWidth={2} />
                          Copy
                        </button>
                      </div>
                    </div>
                    <PromptBody post={post} parsedJson={parsedJson} />
                    <div className="hidden items-center gap-2 md:flex">
                      <button
                        type="button"
                        onClick={copyPrompt}
                        className="inline-flex items-center gap-1.5 rounded-[8px] border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Copy prompt
                      </button>
                      {isJson ? (
                        <button
                          type="button"
                          onClick={copyPromptAsJson}
                          className="inline-flex items-center gap-1.5 rounded-[8px] border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
                        >
                          <Braces className="h-3.5 w-3.5" strokeWidth={1.8} />
                          Copy as JSON
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 border-t py-3 md:border-y">
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
                      onClick={() => toggleSave(post)}
                      icon={
                        <Bookmark
                          className="h-4 w-4"
                          strokeWidth={2}
                          fill={isSaved ? "currentColor" : "none"}
                        />
                      }
                      count={saveCount}
                    />
                    <StaticStat
                      icon={
                        <BarChart3 className="h-4 w-4" strokeWidth={2} />
                      }
                      count={viewCount}
                      label="Views"
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

                </div>

                <EditorFooter owner={owner} />
              </aside>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DetailHeader({ post }: { post: Post }) {
  // Header always links to the original source post — never to the
  // creator's profile, even when external_creator_url is present.
  const sourceUrl = safeHref(
    post.source_url && !post.source_url.startsWith("promptfeed://")
      ? post.source_url
      : null,
  );
  const platform = post.external_creator_platform ?? post.platform_slug;
  const handle = post.external_creator_handle;
  const label = handle ?? "Source post";

  const inner = (
    <>
      {isPlatformSlug(platform) ? (
        <PlatformBadge platform={platform} size={18} rounded={5} />
      ) : null}
      <span className="min-w-0 truncate text-[14px] font-semibold text-text">
        {label}
      </span>
      {sourceUrl ? (
        <ExternalLink
          className="h-3.5 w-3.5 shrink-0 text-text-subtle transition-colors group-hover:text-text"
          strokeWidth={2}
        />
      ) : null}
    </>
  );

  return (
    <div className="flex shrink-0 items-start justify-between gap-2 border-b px-5 py-4">
      <div className="min-w-0">
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex max-w-full items-center gap-2 rounded-[8px] border bg-surface-2 px-3 py-1.5 transition-colors hover:bg-hover"
          >
            {inner}
          </a>
        ) : (
          <div className="inline-flex max-w-full items-center gap-2 rounded-[8px] border bg-surface-2 px-3 py-1.5">
            {inner}
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-subtle">
          <span>on {prettyPlatform(post.platform_slug)}</span>
          <span>·</span>
          <span>{timeAgo(post.posted_at)}</span>
        </div>
      </div>
    </div>
  );
}

function PromptBody({ post, parsedJson }: { post: Post; parsedJson: unknown | null }) {
  if (parsedJson !== null) {
    const pretty = JSON.stringify(parsedJson, null, 2);
    return (
      <pre className="h-[220px] overflow-auto whitespace-pre-wrap break-words rounded-[10px] border bg-surface-2 p-3 font-mono text-[12px] leading-[1.55] text-text md:h-auto md:min-h-0 md:flex-1 md:whitespace-pre">
        {pretty}
      </pre>
    );
  }
  return (
    <div className="h-[220px] overflow-y-auto rounded-[10px] border bg-surface-2 p-3 md:h-auto md:min-h-0 md:flex-1">
      <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.6] text-text">
        {post.prompt}
      </p>
    </div>
  );
}

function EditorFooter({ owner }: { owner: OwnerInfo | null }) {
  if (!owner) return null;
  const handle = owner.handle ?? owner.displayName ?? "editor";
  const xUrl = owner.xUrl;
  const inner = (
    <>
      <span className="text-text-subtle">Curator</span>
      <span className="font-semibold text-text">{handle}</span>
      {xUrl ? (
        <ExternalLink
          className="h-3 w-3 text-text-subtle transition-colors group-hover:text-text"
          strokeWidth={2}
        />
      ) : null}
    </>
  );
  return (
    <div className="flex shrink-0 items-center border-t bg-surface-2/40 px-5 py-3">
      {xUrl ? (
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-[8px] border bg-surface px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-hover"
        >
          {inner}
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-[8px] border bg-surface px-2.5 py-1.5 text-[12px] font-medium">
          {inner}
        </span>
      )}
    </div>
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

function StaticStat({
  icon,
  count,
  label,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
}) {
  return (
    <span
      aria-label={`${label}: ${count}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[12px] font-semibold tabular-nums text-text-muted"
    >
      {icon}
      <span>{formatCount(count)}</span>
    </span>
  );
}
