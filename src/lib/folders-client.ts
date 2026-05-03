"use client";

import { createClient } from "@/lib/supabase/browser";
import type { SaveFolder } from "@/types/domain";

export async function listFoldersForUser(
  userId: string,
): Promise<SaveFolder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("save_folders")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createFolder(
  _userId: string,
  name: string,
  isDefault: boolean,
): Promise<SaveFolder> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Folder name is required.");
  const supabase = createClient();
  // Atomic: clears existing default (if make_default) and inserts in one tx.
  const { data, error } = await supabase.rpc("create_save_folder", {
    folder_name: trimmed,
    make_default: isDefault,
  });
  if (error) throw error;
  if (!data) throw new Error("Could not create folder.");
  return data as unknown as SaveFolder;
}

export async function renameFolder(
  folderId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Folder name is required.");
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("save_folders")
    .update({ name: trimmed })
    .eq("id", folderId)
    .eq("user_id", u.user.id);
  if (error) throw error;
}

export async function setDefaultFolder(
  _userId: string,
  folderId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_default_save_folder", {
    target_folder_id: folderId,
  });
  if (error) throw error;
}

export async function deleteFolder(folderId: string): Promise<void> {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("save_folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", u.user.id);
  if (error) throw error;
}

export async function moveSaveToFolder(
  userId: string,
  postId: string,
  folderId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("post_saves")
    .update({ folder_id: folderId })
    .eq("user_id", userId)
    .eq("post_id", postId);
  if (error) throw error;
}
