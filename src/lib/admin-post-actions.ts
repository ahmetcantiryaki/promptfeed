"use client";

import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

export async function deletePostById(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

export interface UpdatePostInput {
  /** Human-readable title (≤60 chars). Empty/undefined → trigger derives
   *  one from the prompt's first sentence. */
  title?: string;
  /** URL slug. When empty/undefined the trigger derives + de-duplicates one
   *  from the title. Only sent when the admin explicitly edits it. */
  slug?: string;
  prompt?: string;
  /** Trust tier — "verified" | "reference" | "estimated" (migration 0016). */
  prompt_status?: string;
  model_slug?: string;
  platform_slug?: string;
  external_creator_handle?: string | null;
  external_creator_url?: string | null;
  external_creator_platform?: string | null;
  media_url?: string;
  thumbnail_url?: string | null;
  source_image_url?: string | null;
  extra_image_urls?: string[];
}

/**
 * Upload a replacement image to the current user's storage folder.
 * Returns the public URL.
 *
 * Storage RLS forces the path's first folder to be the uploader's auth uid,
 * which is why the admin's own id is used here even when editing another
 * user's post.
 */
export async function uploadReplacementImage(
  uploaderUserId: string,
  postId: string,
  tag: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${uploaderUserId}/${postId}-${tag}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("user-uploads")
    .upload(path, file, {
      contentType: file.type || "image/png",
      upsert: false,
    });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("user-uploads").getPublicUrl(path);
  return data.publicUrl;
}

export async function updatePost(
  id: string,
  patch: UpdatePostInput,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("posts").update(patch).eq("id", id);
  if (error) throw error;
}

/** Fetch the current set of tag slugs attached to a post. */
export async function getPostTagSlugs(postId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("post_tags")
    .select("tag_slug")
    .eq("post_id", postId);
  if (error) throw error;
  return (data ?? []).map((r) => r.tag_slug);
}

/**
 * Apply a tag-set change as the minimal diff: insert the new slugs, delete
 * the removed ones. Counter triggers update tags.post_count automatically.
 * The post owner (or admin) RLS policy lets either operate.
 */
export async function applyPostTagsDiff(
  postId: string,
  previous: ReadonlySet<string>,
  next: ReadonlySet<string>,
): Promise<void> {
  const toAdd = [...next].filter((s) => !previous.has(s));
  const toRemove = [...previous].filter((s) => !next.has(s));

  const supabase = createClient();

  if (toAdd.length > 0) {
    const rows = toAdd.map((tag_slug) => ({ post_id: postId, tag_slug }));
    const { error } = await supabase.from("post_tags").insert(rows);
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("post_tags")
      .delete()
      .eq("post_id", postId)
      .in("tag_slug", toRemove);
    if (error) throw error;
  }
}

/** Delete + toast wrapper. Caller should handle confirmation UI. */
export async function deletePostWithToast(
  id: string,
  onDone?: () => void,
): Promise<boolean> {
  try {
    await deletePostById(id);
    toast.success("Prompt deleted");
    onDone?.();
    return true;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Delete failed");
    return false;
  }
}
