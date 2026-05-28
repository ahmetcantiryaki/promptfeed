"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { safeHref, safeImageSrc, safeVideoSrc } from "@/lib/safe-url";

interface Props {
  /** Direct video file URL (posts.media_url). */
  videoUrl: string;
  /** Poster shown before playback (input image for image-to-video, or a
   *  recorded poster). */
  posterUrl?: string | null;
  /** Width / height ratio — only used to size the fallback box. */
  aspectRatio?: number | null;
  /** Original social post URL — drives the "open at source" fallback when
   *  the file can't be played. */
  sourceUrl?: string | null;
  alt: string;
}

/**
 * Native `<video>` player for the detail modal. We host nothing — the src
 * is a direct file URL, re-sanitised here (the DB is untrusted at render).
 * Autoplays muted so the clip starts on open without tripping the browser
 * autoplay policy; the user unmutes via the native controls. Falls back to
 * a poster + "open at source" link when the URL fails the SSRF guard.
 */
export function VideoPlayer({
  videoUrl,
  posterUrl,
  aspectRatio,
  sourceUrl,
  alt,
}: Props) {
  const src = useMemo(() => safeVideoSrc(videoUrl), [videoUrl]);
  const poster = safeImageSrc(posterUrl) ?? undefined;

  if (!src) {
    const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 16 / 9;
    const externalHref = safeHref(sourceUrl);
    return (
      <div
        className="relative flex w-full items-center justify-center bg-black"
        style={{ aspectRatio: `${ratio}` }}
      >
        {poster ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={poster}
            alt={alt}
            className="absolute inset-0 h-full w-full object-contain opacity-70"
          />
        ) : null}
        {externalHref ? (
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[13px] font-semibold text-black shadow-lg backdrop-blur transition-opacity hover:opacity-90"
          >
            <span>Open at source</span>
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        ) : (
          <span className="relative z-10 text-[13px] text-white/80">
            Video unavailable
          </span>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={src}
      poster={poster}
      controls
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={alt}
      className="block h-auto max-h-[60vh] w-full bg-black object-contain md:max-h-[96vh] md:w-auto md:max-w-full"
    />
  );
}
