"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Heart,
  Bookmark,
  Share2,
  Copy,
  ExternalLink,
  Wand2,
  Braces,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import type { Post, SocialAccount } from "@/types/domain";
import type { OwnerInfo } from "@/lib/posts";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import { ModelBadge } from "@/lib/model-icon";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { prettyModel, prettyPlatform } from "@/lib/labels";
import { useInteractions } from "@/components/providers/interactions-provider";
import { tryParseJson, prettifyJson } from "@/lib/prompt-format";
import { safeHref } from "@/lib/safe-url";
import { trackPostView } from "@/lib/track-view";
import { RemixCurtain } from "@/components/features/feed/remix-curtain";
import { DetailImageSlider } from "@/components/features/feed/detail-image-slider";

interface Props {
  post: Post;
  owner: OwnerInfo | null;
  ownerSocials?: SocialAccount[];
}

export function PromptDetailView({ post, owner, ownerSocials = [] }: Props) {
  const { liked, saved, toggleLike, toggleSave } = useInteractions();
  const isLiked = liked.has(post.id);
  const isSaved = saved.has(post.id);

  // post.likes/shares already include the user's interaction (DB trigger),
  // so adjust the display only by the delta from the initial server state.
  const initialLikedRef = useRef(isLiked);
  const initialSavedRef = useRef(isSaved);
  const likeCount =
    post.likes + (isLiked ? 1 : 0) - (initialLikedRef.current ? 1 : 0);
  const saveCount =
    post.shares + (isSaved ? 1 : 0) - (initialSavedRef.current ? 1 : 0);
  const isRemix = post.prompt_type === "remix" && Boolean(post.source_image_url);
  const hasExtras = !isRemix && (post.extra_image_urls?.length ?? 0) > 0;

  const parsedJson = useMemo(() => tryParseJson(post.prompt), [post.prompt]);
  const isJson = parsedJson !== null;

  const viewCount = (post as Post & { views?: number | null }).views ?? 0;

  // Fire view-tracking exactly once per post on mount.
  const trackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (trackedRef.current === post.id) return;
    trackedRef.current = post.id;
    trackPostView(post.id);
  }, [post.id]);

  const ownerXUrl =
    owner?.xUrl ?? ownerSocials.find((s) => s.platform === "x")?.url ?? null;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(post.prompt);
      toast.success("Prompt copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function copyPromptAsJson() {
    const pretty = prettifyJson(post.prompt) ?? post.prompt;
    try {
      await navigator.clipboard.writeText(pretty);
      toast.success("JSON copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <article className="grid h-[calc(100dvh-96px)] min-h-[400px] grid-cols-1 overflow-hidden rounded-[14px] border bg-black lg:min-h-[560px] lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="relative flex items-center justify-center overflow-hidden bg-black">
        {isRemix && post.source_image_url ? (
          <RemixCurtain
            inputUrl={post.source_image_url}
            outputUrl={post.media_url}
            alt={post.prompt.slice(0, 80)}
            fit="contain"
          />
        ) : hasExtras ? (
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
        {isRemix ? (
          <div className="pointer-events-none absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur">
            <Wand2 className="h-3 w-3" strokeWidth={2} />
            Remix
          </div>
        ) : null}
      </div>

      <aside className="flex min-w-0 flex-col overflow-hidden border-l bg-surface">
        <DetailHeader post={post} />

        <div className="flex min-h-0 flex-1 flex-col gap-5 px-5 py-5">
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
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                Prompt
              </div>
              {isJson ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-[1px] text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-600">
                  <Braces className="h-2.5 w-2.5" strokeWidth={2.2} />
                  JSON
                </span>
              ) : null}
            </div>
            {isJson ? (
              <pre
                className="min-h-0 flex-1 overflow-auto rounded-[10px] border bg-surface-2 p-3 font-mono text-[12px] leading-[1.55] text-text"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {JSON.stringify(parsedJson, null, 2)}
              </pre>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto rounded-[10px] border bg-surface-2 p-3">
                <p className="whitespace-pre-wrap text-[13px] leading-[1.6] text-text">
                  {post.prompt}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
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
              icon={<BarChart3 className="h-4 w-4" strokeWidth={2} />}
              count={viewCount}
              label="Views"
            />
            <button
              type="button"
              onClick={copyLink}
              aria-label="Copy link"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border bg-surface px-3 text-[12px] font-semibold text-text-muted transition-colors hover:bg-hover hover:text-text active:scale-95 sm:h-9"
            >
              <Share2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

        </div>

        <EditorFooter owner={owner} fallbackXUrl={ownerXUrl} />
      </aside>
    </article>
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

function EditorFooter({
  owner,
  fallbackXUrl,
}: {
  owner: OwnerInfo | null;
  fallbackXUrl: string | null;
}) {
  if (!owner) return null;
  const handle = owner.handle ?? owner.displayName ?? "editor";
  const xUrl = owner.xUrl ?? fallbackXUrl;
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
        "inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold tabular-nums transition-all active:scale-95 sm:h-9",
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
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[12px] font-semibold tabular-nums text-text-muted sm:h-9"
    >
      {icon}
      <span>{formatCount(count)}</span>
    </span>
  );
}
