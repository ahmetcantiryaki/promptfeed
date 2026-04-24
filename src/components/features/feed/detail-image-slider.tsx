"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  images: string[];
  alt: string;
}

/**
 * Manual slider for the detail modal/page when a post has multiple images.
 * All images are absolutely stacked + object-contain so they always center
 * inside the slider's parent box regardless of aspect ratio.
 */
export function DetailImageSlider({ images, alt }: Props) {
  const [idx, setIdx] = useState(0);
  const total = images.length;

  const go = (next: number) => {
    setIdx(((next % total) + total) % total);
  };

  return (
    <div
      className="relative h-full w-full select-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(idx - 1);
        else if (e.key === "ArrowRight") go(idx + 1);
      }}
    >
      {images.map((src, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={i}
          src={src}
          alt={alt}
          draggable={false}
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 m-auto h-full w-full object-contain transition-opacity duration-300 ease-out",
            i === idx ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />
      ))}

      {total > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              go(idx - 1);
            }}
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              go(idx + 1);
            }}
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>

          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/55 px-2 py-1 backdrop-blur">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
