"use client";

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string;
  /** Ordered list of fallback URLs to try if `src` 404s. Cards use this
   *  to handle CDN rounding quirks (e.g. YouMind's `-600x434` vs
   *  `-600x435`) by listing every plausible variant. The recorded
   *  original is expected at the end so the worst case still renders
   *  a (low-res) image. */
  fallbackSrcs?: readonly string[];
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
  fallbackSrcs,
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

  // Build the full candidate chain — primary src then any fallbacks. We
  // de-duplicate so the same URL isn't tried twice in a row when callers
  // pass a fallback that happens to equal the primary.
  const candidates = useMemo(() => {
    const list = [src, ...(fallbackSrcs ?? [])].filter(Boolean);
    const seen = new Set<string>();
    return list.filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });
  }, [src, fallbackSrcs]);

  const [attemptIdx, setAttemptIdx] = useState(0);
  const currentSrc = candidates[attemptIdx] ?? src;

  // Reset attempts whenever the candidate list changes.
  useEffect(() => {
    setAttemptIdx(0);
    setErrored(false);
    setLoaded(false);
  }, [candidates]);

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

  function tryNext() {
    if (attemptIdx + 1 < candidates.length) {
      setAttemptIdx(attemptIdx + 1);
    } else {
      setErrored(true);
    }
  }

  function handleLoad(e: SyntheticEvent<HTMLImageElement>) {
    // Some CDNs respond 200 with an empty body — treat the result as an
    // error and move to the next candidate so the user doesn't sit on a
    // permanent loading spinner.
    if (e.currentTarget.naturalWidth === 0) {
      tryNext();
      return;
    }
    setLoaded(true);
    onLoadComplete?.();
  }

  function handleError() {
    tryNext();
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
