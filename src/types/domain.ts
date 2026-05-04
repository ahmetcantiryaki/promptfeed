import type { Database } from "./database";

export type MediaType = "image" | "video";
export type PlatformSlug =
  | "x"
  | "reddit"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "web";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Model = Database["public"]["Tables"]["models"]["Row"];
export type Platform = Database["public"]["Tables"]["platforms"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SocialAccount =
  Database["public"]["Tables"]["social_accounts"]["Row"];
export type SaveFolder = Database["public"]["Tables"]["save_folders"]["Row"];

export interface SaveFolderSummary extends SaveFolder {
  post_count: number;
  cover_urls: string[];
}

export type PostSort = "newest" | "oldest" | "top";

export interface PostFilters {
  model?: string;
  platform?: string;
  mediaType?: MediaType;
  sort?: PostSort;
  limit?: number;
  /** Free-text search across prompt body, source_user, and external creator handle/url. */
  q?: string;
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
