import type { Database } from "./database";

export type MediaType = "image" | "video";
export type PlatformSlug =
  | "x"
  | "reddit"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "web";

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
export interface Post extends PostRow {
  /** Tags attached to this post. Populated only when the caller explicitly
   *  selects `post_tags(tag_slug)` in the supabase query (see lib/posts.ts
   *  and lib/interactions.ts). Undefined when the caller didn't ask, so
   *  components must treat `post.tag_slugs ?? []` as the safe access. */
  tag_slugs?: string[];
}
export type Model = Database["public"]["Tables"]["models"]["Row"];
export type Platform = Database["public"]["Tables"]["platforms"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SocialAccount =
  Database["public"]["Tables"]["social_accounts"]["Row"];
export type SaveFolder = Database["public"]["Tables"]["save_folders"]["Row"];

// Tag taxonomy v1 — three axes (subject, style, use_case) over one tags table.
// The DB stores `axis` as `text` with a CHECK constraint; we narrow at the
// type boundary so the UI can switch on it exhaustively.
export type TagAxis = "subject" | "style" | "use_case";

type TagRow = Database["public"]["Tables"]["tags"]["Row"];
export interface Tag extends Omit<TagRow, "axis"> {
  axis: TagAxis;
}

export interface TagsByAxis {
  subject: Tag[];
  style: Tag[];
  use_case: Tag[];
}

export const TAG_AXES: readonly TagAxis[] = ["subject", "style", "use_case"];
export const MAX_TAGS_PER_POST = 5;
export const MIN_TAGS_PER_POST = 1;

export const TAG_AXIS_LABEL: Record<TagAxis, string> = {
  subject: "Subject",
  style: "Style",
  use_case: "Use case",
};

export interface SaveFolderSummary extends SaveFolder {
  post_count: number;
  cover_urls: string[];
}

export type PostSort = "newest" | "oldest" | "top" | "viewed";

export interface PostFilters {
  model?: string;
  platform?: string;
  /** When set, restrict feed to posts that carry ALL of these tag slugs
   *  (AND intersection). Empty/undefined disables the filter. */
  tags?: string[];
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
