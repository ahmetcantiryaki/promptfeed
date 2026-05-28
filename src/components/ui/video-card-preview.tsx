"use client";

import { Play } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";

interface Props {
  poster: string;
  /** Width / height ratio. Used for aspect-ratio reserve so masonry
   *  doesn't reflow when the poster loads. Default 16/9. */
  aspectRatio?: number | null;
  /** Total length in seconds — drives the "1:23" badge. Optional. */
  durationSeconds?: number | null;
  alt: string;
}

/**
 * Static card representation for a video prompt. We deliberately don't
 * load the iframe here — embedding 30+ provider players in the masonry
 * would crater the page. The card shows the recorded poster, an inset
 * play overlay, and a duration badge; opening the detail modal loads
 * the actual iframe player.
 */
export function VideoCardPreview({
  poster,
  aspectRatio,
  durationSeconds,
  alt,
}: Props) {
  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 16 / 9;
  return (
    <div className="relative w-full">
      <LazyImage
        src={poster}
        alt={alt}
        aspectRatio={`${ratio}`}
        minHeight={200}
        imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16">
          <Play
            className="h-6 w-6 translate-x-[2px] fill-white sm:h-7 sm:w-7"
            strokeWidth={0}
          />
        </span>
      </div>
      {durationSeconds && durationSeconds > 0 ? (
        <span className="pointer-events-none absolute bottom-2 right-2 z-30 inline-flex items-center rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur">
          {formatDuration(durationSeconds)}
        </span>
      ) : null}
    </div>
  );
}

function formatDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${String(mm).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
