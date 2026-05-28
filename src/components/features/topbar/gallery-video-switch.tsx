"use client";

import { useFeedFilter } from "@/components/providers/feed-filter-provider";
import { LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/types/domain";

interface Props {
  /** Compact variant for mobile: drops the logo, smaller type. */
  compact?: boolean;
}

/**
 * Top-center brand switcher: "Feedlens Gallery" ⟷ "Feedlens Video".
 *
 * The Feedlens logo carries the brand half ("Feedlens"); the mode words
 * ("Gallery" / "Video") are set in a serif italic so they read as a
 * distinct, attention-drawing label against the system-sans UI — clicking
 * one switches the whole feed between images and videos (browser-tab feel).
 *
 * Gallery == image (the default), Video == video. Selecting a tab forces
 * the feed view, so it also works as a jump-back from Liked/Saved.
 */
export function GalleryVideoSwitch({ compact = false }: Props) {
  const { state, setFilter } = useFeedFilter();
  const onFeed = state.view === "feed";
  const active: MediaType = onFeed ? state.mediaType ?? "image" : "image";

  const Tab = ({ value, label }: { value: MediaType; label: string }) => {
    const isActive = onFeed && active === value;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() =>
          setFilter({ view: "feed", mediaType: value, model: undefined })
        }
        className={cn(
          "group relative font-serif italic leading-none transition-colors",
          compact ? "text-[15px]" : "text-[17px]",
          isActive
            ? "font-semibold text-text"
            : "font-medium text-text-subtle hover:text-text-muted",
        )}
      >
        {label}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-1.5 left-0 right-0 h-[2px] origin-center rounded-full bg-accent transition-transform duration-200 ease-out",
            isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50",
          )}
        />
      </button>
    );
  };

  return (
    <div
      role="tablist"
      aria-label="Gallery or Video"
      className={cn("inline-flex items-center", compact ? "gap-2.5" : "gap-3")}
    >
      {compact ? null : (
        <LogoMark height={22} width={103} className="shrink-0" noShimmer />
      )}
      <Tab value="image" label="Gallery" />
      <span aria-hidden="true" className="text-[15px] text-text-subtle/50">
        /
      </span>
      <Tab value="video" label="Video" />
    </div>
  );
}
