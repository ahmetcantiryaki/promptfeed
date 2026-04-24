export interface BrandVisual {
  letter: string;
  bg: string;
  fg: string;
  borderColor?: string;
}

// Single-letter square badges for models (not platforms — see platform-icon.tsx)
export const MODEL_BRAND: Record<string, BrandVisual> = {
  "gpt-image": { letter: "G", bg: "var(--surface-2)", fg: "var(--text)" },
  "gpt-image-2": { letter: "G", bg: "var(--surface-2)", fg: "var(--text)" },
  "nano-banana-pro": {
    letter: "🍌",
    bg: "#fef3c7",
    fg: "#92400e",
    borderColor: "#fcd34d",
  },
  "nano-banana-2": {
    letter: "🍌",
    bg: "#fef3c7",
    fg: "#92400e",
    borderColor: "#fcd34d",
  },
  midjourney: { letter: "M", bg: "var(--surface-2)", fg: "var(--text)" },
  "dalle-3": { letter: "D", bg: "var(--surface-2)", fg: "var(--text)" },
  kling: { letter: "K", bg: "var(--surface-2)", fg: "var(--text)" },
  seedance: { letter: "S", bg: "var(--surface-2)", fg: "var(--text)" },
};

export function modelVisual(slug: string): BrandVisual {
  return (
    MODEL_BRAND[slug] ?? {
      letter: slug.charAt(0).toUpperCase(),
      bg: "var(--surface-2)",
      fg: "var(--text)",
    }
  );
}
