"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string;
  /** Lower-resolution URL to swap in when `src` fails to load. Used by
   *  the masonry cards to upgrade thumbnails to a 2x-density variant
   *  while still serving the recorded original on a 404. */
  fallbackSrc?: string;
  alt: string;
  /** Wrapper class. The wrapper is the layout-driving element. */
  className?: string;
  /** Class merged onto the inner <img>. */
  imgClassName?: string;
  /** CSS aspect-ratio (e.g. "4 / 5"). Reserves exact space when known. */
  aspectRatio?: string;
  /** Fallback min height (px) while no dimensions are known. */
  minHeight?: number;
  /** Forwarded to the <img>. Defaults to "lazy". */
  loading?: "eager" | "lazy";
  /** Pointer-events-none container style flag (rarely needed). */
  draggable?: boolean;
  onLoadComplete?: () => void;
}

export function LazyImage({
  src,
  fallbackSrc,
  alt,
  className,
  imgClassName,
  aspectRatio,
  minHeight = 200,
  loading = "lazy",
  draggable,
  onLoadComplete,
}: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  // Track which URL the <img> is actually attempting. Starts with `src`
  // and gets swapped to `fallbackSrc` on a 404 (one-shot, no retry loop).
  const [currentSrc, setCurrentSrc] = useState(src);
  const triedFallbackRef = useRef(false);

  // Reset attempt state whenever the caller passes a different `src`
  // (post-cards reuse the same component across feed changes).
  useEffect(() => {
    triedFallbackRef.current = false;
    setCurrentSrc(src);
    setErrored(false);
    setLoaded(false);
  }, [src]);

  // If the image is already cached/decoded by the time React mounts, the
  // `onLoad` event will never fire — flip to loaded synchronously.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      onLoadComplete?.();
    }
  }, [currentSrc, onLoadComplete]);

  function handleLoad(e: SyntheticEvent<HTMLImageElement>) {
    if (e.currentTarget.naturalWidth === 0) return;
    setLoaded(true);
    onLoadComplete?.();
  }

  function handleError() {
    if (fallbackSrc && !triedFallbackRef.current && fallbackSrc !== currentSrc) {
      triedFallbackRef.current = true;
      setCurrentSrc(fallbackSrc);
      return;
    }
    setErrored(true);
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={
        aspectRatio
          ? { aspectRatio }
          : !loaded
            ? { minHeight }
            : undefined
      }
    >
      {!loaded ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-surface-2">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-2 via-surface to-surface-2" />
          {!errored ? (
            <span
              aria-label="Loading image"
              role="status"
              className="relative h-10 w-10 rounded-full border-[3px] border-text-subtle/20 border-t-text animate-spin"
            />
          ) : (
            <span className="relative text-[11px] text-text-subtle">
              Image unavailable
            </span>
          )}
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={loading}
        draggable={draggable}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "block h-auto w-full transition-opacity duration-500 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
    </div>
  );
}
