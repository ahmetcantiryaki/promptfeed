"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { cn } from "@/lib/utils";
import { safeVideoSrc } from "@/lib/safe-url";
import { firstFrameSrc } from "@/lib/video";

interface Props {
  /** Direct video file URL (posts.media_url). */
  videoUrl: string;
  /** Poster image: the input image for image-to-video, or a recorded
   *  poster for text-to-video. Null → render the first frame from the
   *  video file itself. */
  posterUrl: string | null;
  /** Width / height ratio — reserves masonry space so the card doesn't
   *  reflow when the poster/frame loads. Default 16/9. */
  aspectRatio?: number | null;
  alt: string;
}

/**
 * Static card visual for a video prompt. We deliberately never autoplay in
 * the masonry (bandwidth + visual noise) — the card is a still poster with
 * a small top-right play badge that signals "this is a video," and the
 * surrounding PostCard overlay handles click-to-open. The real <video>
 * plays in the detail modal.
 *
 *   image-to-video → poster is the input image (an <img>).
 *   text-to-video  → poster is a recorded thumbnail when present, otherwise
 *                    a muted, metadata-only <video> seeked to its first
 *                    frame (so we still show "the first second" with no
 *                    separate poster asset).
 */
export function VideoCardPreview({
  videoUrl,
  posterUrl,
  aspectRatio,
  alt,
}: Props) {
  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 16 / 9;

  return (
    <div className="relative w-full">
      {posterUrl ? (
        <LazyImage
          src={posterUrl}
          alt={alt}
          aspectRatio={`${ratio}`}
          minHeight={200}
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <FirstFrameVideo videoUrl={videoUrl} aspectRatio={ratio} alt={alt} />
      )}

      {/* Top-right play badge — a clean circular control that reads as
          "video" identically on every card (no duration → no inconsistency). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-2.5 z-30 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white shadow-sm ring-1 ring-white/20 backdrop-blur-md transition-transform duration-300 ease-out group-hover:scale-105"
      >
        <Play className="h-4 w-4 translate-x-[1px] fill-white" strokeWidth={0} />
      </span>
    </div>
  );
}

/**
 * Renders the first frame of a direct video file as a still, lazily — the
 * <video> is only mounted once the card nears the viewport, and loads just
 * metadata + the seeked-to frame (`#t=0.1`). Mirrors LazyImage's skeleton
 * behaviour so a feed of text-to-video posts doesn't fetch dozens of files
 * at once.
 */
function FirstFrameVideo({
  videoUrl,
  aspectRatio,
  alt,
}: {
  videoUrl: string;
  aspectRatio: number;
  alt: string;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);

  const src = firstFrameSrc(safeVideoSrc(videoUrl));

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-hidden bg-surface-2"
      style={{ aspectRatio: `${aspectRatio}` }}
    >
      {!ready && !errored && src ? (
        <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-br from-surface-2 via-surface to-surface-2" />
      ) : null}
      {inView && src && !errored ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-label={alt}
          // Safari doesn't reliably fire `loadeddata` for a preload=metadata
          // frame seek, so flip ready on metadata too; `error` falls back to
          // the unavailable state instead of a permanent skeleton.
          onLoadedMetadata={() => setReady(true)}
          onLoadedData={() => setReady(true)}
          onError={() => setErrored(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.04]",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
      {src === null || errored ? (
        <div className="absolute inset-0 z-10 grid place-items-center text-[11px] text-text-subtle">
          Video unavailable
        </div>
      ) : null}
    </div>
  );
}
