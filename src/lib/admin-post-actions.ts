"use client";

import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

export async function deletePostById(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

export interface UpdatePostInput {
  prompt?: string;
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
