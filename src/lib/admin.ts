import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { Post } from "@/types/domain";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

export interface ProfileWithEmail extends ProfileRow {
  email: string | null;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
}

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

/** Profiles joined with auth.users (email, last_sign_in_at, confirmed). Admin-only. */
export async function listAllProfilesWithEmail(): Promise<ProfileWithEmail[]> {
  const profiles = await listAllProfiles();
  if (profiles.length === 0) return [];

  const admin = createAdminClient();
  const emailById = new Map<
    string,
    { email: string | null; last_sign_in_at: string | null; confirmed: boolean }
  >();

  // Auth Admin API paginates; pull up to ~5k users in pages of 1000.
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      emailById.set(u.id, {
        email: u.email ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        confirmed: Boolean(u.email_confirmed_at),
      });
    }
    if (users.length < 1000) break;
  }

  return profiles.map((p) => {
    const meta = emailById.get(p.id);
    return {
      ...p,
      email: meta?.email ?? null,
      last_sign_in_at: meta?.last_sign_in_at ?? null,
      email_confirmed: Boolean(meta?.confirmed),
    };
  });
}

export async function listAllPosts(limit = 200): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
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
  openReports: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createClient();
  const [users, prompts, userPrompts, likes, saves, reports] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .not("owner_id", "is", null),
      supabase.from("post_likes").select("*", { count: "exact", head: true }),
      supabase.from("post_saves").select("*", { count: "exact", head: true }),
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
    ]);
  return {
    users: users.count ?? 0,
    prompts: prompts.count ?? 0,
    userPrompts: userPrompts.count ?? 0,
    likes: likes.count ?? 0,
    saves: saves.count ?? 0,
    openReports: reports.count ?? 0,
  };
}
