"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  Bookmark,
  Wand2,
  Images,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import type { Post } from "@/types/domain";
import type { OwnerInfo } from "@/lib/posts";
import { cn, formatCount } from "@/lib/utils";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { LazyImage } from "@/components/ui/lazy-image";
import { prettyModel } from "@/lib/labels";
import { buildThumbCandidates } from "@/lib/image-srcset";
import { useInteractions } from "@/components/providers/interactions-provider";
import { PostCardMenu } from "./post-card-menu";
import { RemixCurtain } from "./remix-curtain";
import { PostContextMenuWrapper } from "./post-context-menu";
import { safeHref } from "@/lib/safe-url";

function externalSourceUrl(post: Post): string | null {
  // Always points to the original source post — never the creator's profile.
  const candidate = post.source_url ?? null;
  if (!candidate) return null;
  if (candidate.startsWith("promptfeed://")) return null;
  return safeHref(candidate);
}

interface Props {
  post: Post;
  owner: OwnerInfo | null;
  onOpen: () => void;
}

export function PostCard({ post, owner: _owner, onOpen }: Props) {
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
  const viewCount = (post as Post & { views?: number | null }).views ?? 0;

  const isRemix =
    post.prompt_type === "remix" && Boolean(post.source_image_url);
  const extraImages = useMemo(
    () => post.extra_image_urls ?? [],
    [post.extra_image_urls],
  );
  const hasExtras = !isRemix && extraImages.length > 0;

  // Recorded thumbnail (`-300x...` for YouMind-sourced posts, default
  // small variant for Twitter posts) is too low-res for 2x DPR cards.
  // buildThumbCandidates returns the best-bet URL plus an ordered list
  // of fallbacks LazyImage will iterate through on error — needed because
  // YouMind's height rounding is inconsistent (`H*2 ± 1`).
  const baseThumb = post.thumbnail_url ?? post.media_url;
  const thumbCandidates = useMemo(
    () => buildThumbCandidates(baseThumb),
    [baseThumb],
  );

  const allImages = useMemo(() => {
    if (isRemix) return [] as string[];
    return [thumbCandidates.primary, ...extraImages];
  }, [isRemix, thumbCandidates.primary, extraImages]);

  return (
    <PostContextMenuWrapper post={post} onOpenDetail={onOpen}>
      <article className="group relative overflow-hidden rounded-[12px] bg-surface-2">
      {isRemix ? (
        <RemixCurtain
          inputUrl={post.source_image_url as string}
          outputUrl={post.media_url}
          alt={post.prompt.slice(0, 80)}
          onClickArea={onOpen}
        />
      ) : hasExtras ? (
        <AutoSlider
          images={allImages}
          firstFallbacks={thumbCandidates.fallbacks}
          alt={post.prompt.slice(0, 80)}
        />
      ) : (
        <LazyImage
          src={thumbCandidates.primary}
          fallbackSrcs={thumbCandidates.fallbacks}
          alt={post.prompt.slice(0, 80)}
          minHeight={200}
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      )}

      {/* Top-left compact badge — Remix OR +N images (never both) */}
      <div className="pointer-events-none absolute left-2 top-2 z-30 flex items-center gap-1.5">
        {isRemix ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur">
            <Wand2 className="h-3 w-3" strokeWidth={2} />
            Remix
          </span>
        ) : hasExtras ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur">
            <Images className="h-3 w-3" strokeWidth={2} />
            {allImages.length}
          </span>
        ) : null}
      </div>

      {/* Click-to-open overlay (skipped on remix — curtain owns its own overlay) */}
      {!isRemix ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open detail"
          className="absolute inset-0 z-10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/90"
        />
      ) : null}

      {/* Bottom action bar — always visible <md (touch); slides on hover/focus md+. */}
      <div className="pf-card-bar absolute inset-x-0 bottom-0 z-20 max-md:!translate-y-0 max-md:!opacity-100 max-md:!pointer-events-auto bg-gradient-to-t from-black/90 via-black/55 to-transparent px-2 pb-2 pt-6 text-white sm:px-3 sm:pb-3 sm:pt-10">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden min-w-0 flex-1 sm:block">
            <div className="truncate text-[12px] font-semibold leading-tight">
              {post.source_user}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/75">
              {isPlatformSlug(post.platform_slug) ? (
                <PlatformBadge
                  platform={post.platform_slug}
                  size={11}
                  rounded={3}
                />
              ) : null}
              <span className="truncate">{prettyModel(post.model_slug)}</span>
            </div>
          </div>

          <div className="pf-card-actions ml-auto flex shrink-0 items-center gap-1 max-md:!pointer-events-auto sm:gap-1.5">
            <ActionBtn
              label={isLiked ? "Unlike" : "Like"}
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
            >
              {formatCount(likeCount)}
            </ActionBtn>
            <ActionBtn
              label={isSaved ? "Unsave" : "Save"}
              active={isSaved}
              activeClass="bg-white text-black hover:bg-white"
              onClick={() => toggleSave(post)}
              icon={
                <Bookmark
                  className="h-4 w-4"
                  strokeWidth={2}
                  fill={isSaved ? "currentColor" : "none"}
                />
              }
            >
              {formatCount(saveCount)}
            </ActionBtn>
            <ViewChip count={viewCount} />
            <SourceBtn url={externalSourceUrl(post)} />
            <PostCardMenu post={post} tone="dark" />
          </div>
        </div>
      </div>
      </article>
    </PostContextMenuWrapper>
  );
}

function AutoSlider({
  images,
  firstFallbacks,
  alt,
}: {
  images: string[];
  firstFallbacks?: readonly string[];
  alt: string;
}) {
  const [idx, setIdx] = useState(0);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (hover || images.length <= 1) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [hover, images.length]);

  const [first, ...rest] = images;

  return (
    <div
      className="group/slider relative w-full"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {/* Base image — drives the card height */}
      <LazyImage
        src={first ?? ""}
        fallbackSrcs={firstFallbacks}
        alt={alt}
        minHeight={200}
        imgClassName={cn(
          "transition-all duration-700 ease-out group-hover:scale-[1.04]",
          images.length > 1 && idx !== 0 && "opacity-0",
        )}
      />
      {rest.map((src, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={i}
          src={src}
          alt={alt}
          loading="lazy"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out group-hover:scale-[1.04]",
            idx === i + 1 ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {/* Slider dots — top-right, compact */}
      {images.length > 1 ? (
        <div className="pointer-events-none absolute right-2 top-2 z-30 flex gap-1 rounded-full bg-black/55 px-1.5 py-1 backdrop-blur">
          {images.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-4 rounded-full transition-colors",
                i === idx ? "bg-white" : "bg-white/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface ActionBtnProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}

function ViewChip({ count }: { count: number }) {
  return (
    <span
      aria-label={`Views: ${count}`}
      className="inline-flex h-8 items-center gap-1 rounded-full bg-black/55 px-2 text-[11px] font-semibold tabular-nums text-white backdrop-blur-md sm:px-2.5"
    >
      <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
      <span>{formatCount(count)}</span>
    </span>
  );
}

function SourceBtn({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open source in new tab"
      onClick={(e) => e.stopPropagation()}
      className="hidden h-9 items-center gap-1 rounded-full bg-black/55 px-2 text-white backdrop-blur-md transition-all hover:bg-black/75 active:scale-95 sm:inline-flex sm:h-8"
    >
      <ExternalLink className="h-4 w-4" strokeWidth={2} />
    </a>
  );
}

function ActionBtn({
  label,
  icon,
  children,
  active,
  activeClass,
  onClick,
}: ActionBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full px-2 text-[11px] font-semibold tabular-nums backdrop-blur-md transition-all active:scale-95 sm:h-8 sm:px-2.5",
        active ? activeClass : "bg-black/55 text-white hover:bg-black/75",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}
