const PLATFORM_LABELS: Record<string, string> = {
  x: "X / Twitter",
  reddit: "Reddit",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Other / Web",
};

const MODEL_LABELS: Record<string, string> = {
  "gpt-image": "GPT Image",
  "gpt-image-2": "GPT Image 2",
  "nano-banana-pro": "Nano Banana Pro",
  "nano-banana-2": "Nano Banana 2",
  midjourney: "Midjourney",
  "midjourney-v8-1": "Midjourney v8.1",
  "dalle-3": "DALL·E 3",
  kling: "Kling",
  seedance: "Seedance",
};

export function prettyPlatform(slug: string): string {
  return PLATFORM_LABELS[slug] ?? slug;
}

export function prettyModel(slug: string): string {
  return MODEL_LABELS[slug] ?? slug;
}
