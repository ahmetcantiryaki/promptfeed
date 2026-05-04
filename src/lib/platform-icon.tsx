import type { SVGProps } from "react";
import type { PlatformSlug } from "@/types/domain";

export interface PlatformTheme {
  bg: string;
  fg: string;
  label: string;
  urlPrefix: string;
}

export const PLATFORM_THEME: Record<PlatformSlug, PlatformTheme> = {
  x: {
    bg: "#000000",
    fg: "#ffffff",
    label: "X / Twitter",
    urlPrefix: "https://x.com/",
  },
  reddit: {
    bg: "#ff4500",
    fg: "#ffffff",
    label: "Reddit",
    urlPrefix: "https://reddit.com/user/",
  },
  instagram: {
    bg: "#E4405F",
    fg: "#ffffff",
    label: "Instagram",
    urlPrefix: "https://instagram.com/",
  },
  youtube: {
    bg: "#ff0000",
    fg: "#ffffff",
    label: "YouTube",
    urlPrefix: "https://youtube.com/@",
  },
  tiktok: {
    bg: "#000000",
    fg: "#ffffff",
    label: "TikTok",
    urlPrefix: "https://tiktok.com/@",
  },
  web: {
    bg: "#111827",
    fg: "#ffffff",
    label: "Web",
    urlPrefix: "",
  },
};

// simple-icons SVG paths (filled, viewBox 0 0 24 24)
const PATHS: Record<PlatformSlug, string> = {
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  reddit:
    "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.983 0 1.78.797 1.78 1.78 0 .767-.487 1.43-1.174 1.667.054.305.087.61.087.924 0 3.015-3.447 5.455-7.705 5.455-4.258 0-7.705-2.44-7.705-5.455 0-.314.033-.62.087-.924C3.095 13.473 2.608 12.81 2.608 12.043c0-.983.797-1.78 1.78-1.78.477 0 .899.182 1.207.49 1.207-.856 2.863-1.419 4.688-1.486l.906-4.252c.066-.328.396-.536.54-.473l2.915.617c.221-.419.656-.705 1.165-.705zm-5.01 4.51c-2.303 0-4.175 1.314-4.175 2.933 0 1.62 1.872 2.931 4.175 2.931 2.302 0 4.174-1.311 4.174-2.93 0-1.62-1.872-2.933-4.174-2.933zm-4.74 2.21c-.791 0-1.43.642-1.43 1.43 0 .791.639 1.432 1.43 1.432.79 0 1.431-.64 1.431-1.431 0-.79-.64-1.43-1.431-1.43zm9.48 0c-.791 0-1.432.642-1.432 1.43 0 .791.64 1.432 1.432 1.432.79 0 1.431-.64 1.431-1.431 0-.79-.64-1.43-1.431-1.43zm-4.878 4.023a.498.498 0 0 0-.335.109 3.4 3.4 0 0 1-2.018.656 3.4 3.4 0 0 1-2.018-.656.496.496 0 1 0-.593.796 4.392 4.392 0 0 0 2.611.843 4.391 4.391 0 0 0 2.611-.843.496.496 0 0 0-.258-.905z",
  instagram:
    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  tiktok:
    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  // Globe (web) — solid filled style to match other platform glyphs
  web:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93C7.05 19.44 4 16.08 4 12c0-.62.08-1.21.21-1.79L9 15v1a2 2 0 0 0 2 2v1.93zM17.9 17.39A1.99 1.99 0 0 0 16 16h-1v-3a1 1 0 0 0-1-1H8v-2h2a1 1 0 0 0 1-1V7h2a2 2 0 0 0 2-2v-.41C17.93 5.78 20 8.65 20 12c0 2.08-.8 3.97-2.1 5.39z",
};

export function isPlatformSlug(slug: string): slug is PlatformSlug {
  return slug in PLATFORM_THEME;
}

interface PlatformIconProps extends SVGProps<SVGSVGElement> {
  platform: PlatformSlug;
}

export function PlatformGlyph({ platform, ...rest }: PlatformIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[platform]} />
    </svg>
  );
}

interface BadgeProps {
  platform: PlatformSlug;
  size?: number;
  rounded?: number;
  className?: string;
}

/** Branded square badge: platform color bg, glyph in fg. */
export function PlatformBadge({
  platform,
  size = 18,
  rounded = 5,
  className,
}: BadgeProps) {
  const theme = PLATFORM_THEME[platform];
  const isWeb = platform === "web";
  const glyphSize = Math.round(size * (isWeb ? 1 : 0.62));
  return (
    <span
      className={className}
      style={{
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: isWeb ? 0 : rounded,
        background: isWeb ? "transparent" : theme.bg,
        color: isWeb ? "var(--text)" : theme.fg,
        flexShrink: 0,
      }}
    >
      <PlatformGlyph
        platform={platform}
        width={glyphSize}
        height={glyphSize}
      />
    </span>
  );
}
