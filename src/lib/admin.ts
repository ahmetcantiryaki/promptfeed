import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { Post } from "@/types/domain";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.is_admin);
}

export async function listAllProfiles(): Promise<ProfileRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAllPosts(limit = 200): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function listReports(): Promise<ReportRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export interface PlatformStats {
  users: number;
  prompts: number;
  userPrompts: number;
  likes: number;
  saves: number;
  follows: number;
  openReports: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createClient();
  const head = (table: string, filter?: (q: any) => any) => {
    let q = supabase.from(table as never).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    return q;
  };
  const [users, prompts, userPrompts, likes, saves, follows, reports] =
    await Promise.all([
      head("profiles"),
      head("posts"),
      head("posts", (q) => q.not("owner_id", "is", null)),
      head("post_likes"),
      head("post_saves"),
      head("follows"),
      head("reports", (q) => q.eq("status", "open")),
    ]);
  return {
    users: users.count ?? 0,
    prompts: prompts.count ?? 0,
    userPrompts: userPrompts.count ?? 0,
    likes: likes.count ?? 0,
    saves: saves.count ?? 0,
    follows: follows.count ?? 0,
    openReports: reports.count ?? 0,
  };
}
