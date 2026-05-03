import type { SVGProps } from "react";

export interface ModelBrand {
  /** Pretty name for tooltips/labels. */
  label: string;
  /** Background color for the badge square. */
  bg: string;
  /** Foreground (icon/letter) color. */
  fg: string;
  /** Optional border color override. */
  borderColor?: string;
  /** Inline SVG path (24x24 viewBox). When omitted, falls back to letter glyph. */
  path?: string;
  /** Letter glyph fallback (single character). */
  letter: string;
}

// simple-icons SVG paths (24x24 viewBox, fill currentColor)
const OPENAI_PATH =
  "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z";

// 4-point star for Google Gemini (Bard) family
const GEMINI_PATH =
  "M12 2 L13.6 8.8 C14 10.45 15.55 12 17.2 12.4 L24 14 L17.2 15.6 C15.55 16 14 17.55 13.6 19.2 L12 26 L10.4 19.2 C10 17.55 8.45 16 6.8 15.6 L0 14 L6.8 12.4 C8.45 12 10 10.45 10.4 8.8 Z";

// Midjourney mark (sail/boat shape) — simple-icons "midjourney"
const MIDJOURNEY_PATH =
  "M3 21 L21 21 L13.5 4 C13 3 11 3 10.5 4 Z M5 19 L11 19 C11 14 8 9 5 7 Z M13 19 L19 19 C18 13 15 9 13 7 Z";

export const MODEL_BRAND: Record<string, ModelBrand> = {
  // OpenAI family
  "gpt-image": {
    label: "OpenAI GPT Image",
    bg: "#10a37f",
    fg: "#ffffff",
    path: OPENAI_PATH,
    letter: "G",
  },
  "gpt-image-2": {
    label: "OpenAI GPT Image 2",
    bg: "#10a37f",
    fg: "#ffffff",
    path: OPENAI_PATH,
    letter: "G",
  },
  "dalle-3": {
    label: "DALL·E 3",
    bg: "#000000",
    fg: "#ffffff",
    path: OPENAI_PATH,
    letter: "D",
  },
  sora: {
    label: "Sora",
    bg: "#000000",
    fg: "#ffffff",
    path: OPENAI_PATH,
    letter: "S",
  },
  // Google family (Gemini star mark)
  "nano-banana-pro": {
    label: "Nano Banana Pro",
    bg: "#1f1f1f",
    fg: "#8ab4f8",
    path: GEMINI_PATH,
    letter: "G",
  },
  "nano-banana-2": {
    label: "Nano Banana 2",
    bg: "#1f1f1f",
    fg: "#8ab4f8",
    path: GEMINI_PATH,
    letter: "G",
  },
  veo: {
    label: "Google Veo",
    bg: "#1f1f1f",
    fg: "#8ab4f8",
    path: GEMINI_PATH,
    letter: "V",
  },
  // Midjourney
  midjourney: {
    label: "Midjourney",
    bg: "#000000",
    fg: "#ffffff",
    path: MIDJOURNEY_PATH,
    letter: "M",
  },
  // Kling — Kuaishou (no simple-icon, monogram)
  kling: {
    label: "Kling",
    bg: "#0b1f3a",
    fg: "#ffffff",
    letter: "K",
  },
  // Seedance — ByteDance (no simple-icon, monogram)
  seedance: {
    label: "Seedance",
    bg: "#1d4ed8",
    fg: "#ffffff",
    letter: "S",
  },
};

export function modelBrand(slug: string): ModelBrand {
  return (
    MODEL_BRAND[slug] ?? {
      label: slug,
      bg: "var(--surface-2)",
      fg: "var(--text)",
      letter: slug.charAt(0).toUpperCase() || "?",
    }
  );
}

interface GlyphProps extends SVGProps<SVGSVGElement> {
  path: string;
}

function ModelGlyph({ path, ...rest }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path d={path} />
    </svg>
  );
}

interface ModelBadgeProps {
  slug: string;
  size?: number;
  rounded?: number;
  className?: string;
}

/** Branded square badge for AI models. Mirrors PlatformBadge styling. */
export function ModelBadge({
  slug,
  size = 22,
  rounded = 5,
  className,
}: ModelBadgeProps) {
  const brand = modelBrand(slug);
  const glyphSize = Math.round(size * 0.62);
  return (
    <span
      className={className}
      title={brand.label}
      style={{
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: rounded,
        background: brand.bg,
        color: brand.fg,
        border: brand.borderColor ? `1px solid ${brand.borderColor}` : undefined,
        flexShrink: 0,
        fontSize: Math.round(size * 0.5),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {brand.path ? (
        <ModelGlyph path={brand.path} width={glyphSize} height={glyphSize} />
      ) : (
        <span>{brand.letter}</span>
      )}
    </span>
  );
}
