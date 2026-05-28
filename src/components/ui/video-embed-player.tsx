"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { buildEmbedUrl } from "@/lib/video-embed";
import { safeHref } from "@/lib/safe-url";

interface Props {
  /** Source URL of the original post — drives both the iframe and the
   *  "open at source" fallback link. */
  sourceUrl: string;
  /** Scraper-recorded provider hint; falls back to URL pattern detection
   *  inside `buildEmbedUrl` when null or unknown. */
  provider: string | null;
  /** Poster shown before the iframe loads (and the only thing rendered
   *  if the URL isn't embeddable). */
  poster?: string | null;
  /** Width / height ratio for the iframe slot. Default 16/9. */
  aspectRatio?: number | null;
  alt: string;
}

/**
 * iframe-based video player for the detail modal. Loading is gated by a
 * tap on the poster so we don't pay third-party JS overhead just by
 * opening the modal — many providers (YouTube, X) inject heavy widgets
 * the moment the iframe is in the DOM, which would otherwise stall the
 * modal's open animation.
 */
export function VideoEmbedPlayer({
  sourceUrl,
  provider,
  poster,
  aspectRatio,
  alt,
}: Props) {
  const embedUrl = useMemo(
    () => buildEmbedUrl(provider, sourceUrl),
    [provider, sourceUrl],
  );
  const externalHref = safeHref(sourceUrl);
  const [showEmbed, setShowEmbed] = useState(false);

  // Reset gating whenever the source changes (modal switched to another post).
  useEffect(() => {
    setShowEmbed(false);
  }, [sourceUrl]);

  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 16 / 9;
  const wrapperStyle = { aspectRatio: `${ratio}` };

  if (!embedUrl) {
    return (
      <div
        className="relative flex w-full items-center justify-center bg-black"
        style={wrapperStyle}
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
        ) : null}
      </div>
    );
  }

  if (!showEmbed) {
    return (
      <button
        type="button"
        onClick={() => setShowEmbed(true)}
        aria-label="Play video"
        className="group relative block w-full overflow-hidden bg-black"
        style={wrapperStyle}
      >
        {poster ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={poster}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : null}
        <span
          aria-hidden="true"
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/25"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/65 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20">
            <Play
              className="h-7 w-7 translate-x-[2px] fill-white sm:h-9 sm:w-9"
              strokeWidth={0}
            />
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-black" style={wrapperStyle}>
      <iframe
        src={embedUrl}
        title={alt}
        loading="lazy"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; clipboard-write"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
