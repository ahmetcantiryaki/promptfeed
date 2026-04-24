import type { Database } from "./database";

export type MediaType = "image" | "video";
export type PlatformSlug =
  | "x"
  | "reddit"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "other";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Model = Database["public"]["Tables"]["models"]["Row"];
export type Platform = Database["public"]["Tables"]["platforms"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SocialAccount =
  Database["public"]["Tables"]["social_accounts"]["Row"];

export type PostSort = "newest" | "top";

export interface PostFilters {
  model?: string;
  platform?: string;
  mediaType?: MediaType;
  sort?: PostSort;
  limit?: number;
}

// react-nice-avatar config shape
export interface AvatarConfig {
  sex?: "man" | "woman";
  faceColor?: string;
  earSize?: "small" | "big";
  eyeStyle?: "circle" | "oval" | "smile";
  noseStyle?: "short" | "long" | "round";
  mouthStyle?: "laugh" | "smile" | "peace";
  shirtStyle?: "hoody" | "short" | "polo";
  glassesStyle?: "none" | "round" | "square";
  hairColor?: string;
  hairStyle?: "normal" | "thick" | "mohawk" | "womanLong" | "womanShort";
  hatStyle?: "none" | "beanie" | "turban";
  hatColor?: string;
  eyeBrowStyle?: "up" | "upWoman";
  shirtColor?: string;
  bgColor?: string;
}
