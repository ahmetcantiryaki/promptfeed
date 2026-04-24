"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  inputUrl: string;
  outputUrl: string;
  alt: string;
  /**
   * Click anywhere outside the divider handle fires this.
   * Omit for detail views where the whole thing is already open.
   */
  onClickArea?: () => void;
  /**
   * "natural"  → back image dictates height (cards in the feed).
   * "contain"  → fills the parent box and object-contains both images
   *              centered (detail modal / standalone page).
   */
  fit?: "natural" | "contain";
}

export function RemixCurtain({
  inputUrl,
  outputUrl,
  alt,
  onClickArea,
  fit = "natural",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      e.preventDefault();
      updateFromClientX(e.clientX);
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, updateFromClientX]);

  const isContain = fit === "contain";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative select-none overflow-hidden",
        isContain ? "h-full w-full" : "w-full",
      )}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      {/* Back layer: output */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={outputUrl}
        alt={alt}
        draggable={false}
        loading="lazy"
        className={cn(
          isContain
            ? "absolute inset-0 m-auto h-full w-full object-contain"
            : "block h-auto w-full",
        )}
      />
      {/* Front layer: input clipped from the right */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={inputUrl}
        alt={alt}
        draggable={false}
        loading="lazy"
        className={cn(
          "absolute inset-0 m-auto h-full w-full",
          isContain ? "object-contain" : "object-cover",
        )}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      {/* Click overlay — everywhere except the handle opens the modal */}
      {onClickArea ? (
        <button
          type="button"
          onClick={onClickArea}
          aria-label="Open detail"
          className="absolute inset-0 z-10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/90"
        />
      ) : null}

      {/* Divider + drag hit-zone (32px wide) */}
      <div
        role="slider"
        aria-label="Before / after divider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 2));
          else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 2));
        }}
        className={cn(
          "absolute inset-y-0 z-20 w-8 -translate-x-1/2 cursor-ew-resize",
          "touch-none",
        )}
        style={{ left: `${pos}%` }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.45)]",
          )}
        />
        <div
          className={cn(
            "absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-xl ring-1 ring-black/10 transition-transform duration-150",
            dragging && "scale-110 ring-black/20",
            !dragging && hovering && "scale-105",
          )}
        >
          <span className="flex gap-[3px]">
            <span className="block h-3.5 w-[2px] rounded-full bg-black/35" />
            <span className="block h-3.5 w-[2px] rounded-full bg-black/35" />
          </span>
        </div>
      </div>
    </div>
  );
}
