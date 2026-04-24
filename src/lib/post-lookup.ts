import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/types/domain";

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}
