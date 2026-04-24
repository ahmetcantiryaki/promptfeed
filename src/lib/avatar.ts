import { toBlob } from "html-to-image";
import type { AvatarConfig } from "@/types/domain";

// Option sets mirror react-nice-avatar enums
export const FACE_COLORS = [
  "#F9C9B6",
  "#FFD2B6",
  "#F8D4B8",
  "#EAB08A",
  "#D08B5B",
  "#C68642",
  "#AC6651",
  "#8D5524",
  "#6D3E13",
  "#4E2A06",
] as const;

export const HAIR_COLORS = [
  "#000000",
  "#222222",
  "#4A2C14",
  "#77311D",
  "#A0522D",
  "#C68642",
  "#DAA520",
  "#F4D738",
  "#C0C0C0",
  "#FFFFFF",
  "#FF6B6B",
  "#FF9FF3",
  "#6BD9E9",
  "#9287FF",
] as const;

export const SHIRT_COLORS = [
  "#18181b",
  "#3f3f46",
  "#FFFFFF",
  "#F4D738",
  "#FF9500",
  "#FF6B6B",
  "#E4405F",
  "#9287FF",
  "#5856D6",
  "#6BD9E9",
  "#34C759",
  "#77311D",
] as const;

// NOTE: pure white is intentionally excluded — avatars on a white background
// disappear against the dialog surface in light mode.
export const BG_COLORS = [
  "#F4D738",
  "#FF9500",
  "#FF6B6B",
  "#E4405F",
  "#9287FF",
  "#5856D6",
  "#6BD9E9",
  "#34C759",
  "#D2EFF3",
  "#FDE68A",
  "#FDD7B0",
  "#18181b",
  "#a1a1aa",
] as const;

export const HAIR_STYLES_MAN = ["normal", "thick", "mohawk"] as const;
export const HAIR_STYLES_WOMAN = ["womanLong", "womanShort"] as const;
export const HAT_STYLES = ["none", "beanie", "turban"] as const;
export const EYE_STYLES = ["circle", "oval", "smile"] as const;
export const EYEBROW_STYLES = ["up", "upWoman"] as const;
export const GLASSES_STYLES = ["none", "round", "square"] as const;
export const NOSE_STYLES = ["short", "long", "round"] as const;
export const MOUTH_STYLES = ["laugh", "smile", "peace"] as const;
export const SHIRT_STYLES = ["hoody", "short", "polo"] as const;
export const EAR_SIZES = ["small", "big"] as const;

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(arr: readonly T[], rand: () => number): T {
  const item = arr[Math.floor(rand() * arr.length)];
  if (item === undefined) throw new Error("empty palette");
  return item;
}

export function configFromSeed(seed: number): AvatarConfig {
  const rand = mulberry32(seed);
  const sex: "man" | "woman" = rand() < 0.5 ? "man" : "woman";
  return {
    sex,
    faceColor: pickFrom(FACE_COLORS, rand),
    earSize: pickFrom(EAR_SIZES, rand),
    eyeStyle: pickFrom(EYE_STYLES, rand),
    noseStyle: pickFrom(NOSE_STYLES, rand),
    mouthStyle: pickFrom(MOUTH_STYLES, rand),
    shirtStyle: pickFrom(SHIRT_STYLES, rand),
    glassesStyle: rand() < 0.55 ? "none" : pickFrom(GLASSES_STYLES, rand),
    hairColor: pickFrom(HAIR_COLORS, rand),
    hairStyle:
      sex === "woman"
        ? pickFrom(HAIR_STYLES_WOMAN, rand)
        : pickFrom(HAIR_STYLES_MAN, rand),
    hatStyle: rand() < 0.7 ? "none" : pickFrom(HAT_STYLES, rand),
    hatColor: pickFrom(SHIRT_COLORS, rand),
    eyeBrowStyle: sex === "woman" ? "upWoman" : "up",
    shirtColor: pickFrom(SHIRT_COLORS, rand),
    bgColor: pickFrom(BG_COLORS, rand),
  };
}

export function randomAvatarConfig(): AvatarConfig {
  return configFromSeed(Math.floor(Math.random() * 1_000_000));
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function configForUser(username: string): AvatarConfig {
  return configFromSeed(hashString(username || "anonymous"));
}

// Pure Math.random-driven palette picker for preset generation.
function pickRandom<T>(arr: readonly T[]): T {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) throw new Error("empty palette");
  return item;
}

/** Generate a random config constrained to a specific sex. */
export function randomConfigForSex(sex: "man" | "woman"): AvatarConfig {
  return {
    sex,
    faceColor: pickRandom(FACE_COLORS),
    earSize: pickRandom(EAR_SIZES),
    eyeStyle: pickRandom(EYE_STYLES),
    noseStyle: pickRandom(NOSE_STYLES),
    mouthStyle: pickRandom(MOUTH_STYLES),
    shirtStyle: pickRandom(SHIRT_STYLES),
    glassesStyle: Math.random() < 0.7 ? "none" : pickRandom(GLASSES_STYLES),
    hairColor: pickRandom(HAIR_COLORS),
    hairStyle:
      sex === "woman"
        ? pickRandom(HAIR_STYLES_WOMAN)
        : pickRandom(HAIR_STYLES_MAN),
    hatStyle: Math.random() < 0.78 ? "none" : pickRandom(HAT_STYLES),
    hatColor: pickRandom(SHIRT_COLORS),
    eyeBrowStyle: sex === "woman" ? "upWoman" : "up",
    shirtColor: pickRandom(SHIRT_COLORS),
    bgColor: pickRandom(BG_COLORS),
  };
}

/** 6 men + 6 women, shuffled. Regenerated each call. */
export function generatePresets(): AvatarConfig[] {
  const men = Array.from({ length: 6 }, () => randomConfigForSex("man"));
  const women = Array.from({ length: 6 }, () => randomConfigForSex("woman"));
  const all = [...men, ...women];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = all[i] as AvatarConfig;
    all[i] = all[j] as AvatarConfig;
    all[j] = tmp;
  }
  return all;
}

/**
 * Rasterize the avatar preview to a PNG Blob.
 *
 * html-to-image takes a DOM snapshot at the element's rendered size and
 * scales by `pixelRatio`. We compute pixelRatio so the output is at least
 * `outputSize` pixels — supersampling a small preview up to 512 yields a
 * pixelated result, but sampling the live DOM at 3× gives a crisp PNG that
 * downscales cleanly when shown in the avatar menu (36px) or post cards.
 */
export async function rasterizeAvatar(
  hostEl: HTMLElement,
  outputSize: number = 512,
): Promise<Blob> {
  const displaySize =
    Math.max(hostEl.offsetWidth, hostEl.offsetHeight) || outputSize;
  const pixelRatio = Math.max(outputSize / displaySize, 2);
  const blob = await toBlob(hostEl, {
    pixelRatio,
    cacheBust: true,
    // Keep transparent corners so the circular clip from CSS isn't filled.
    backgroundColor: undefined,
  });
  if (!blob) throw new Error("rasterizeAvatar: toBlob returned null");
  return blob;
}
