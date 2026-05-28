import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { Model, Platform, Post } from "@/types/domain";
import { POSTS_WITH_TAGS_SELECT, flattenPostsWithTags } from "@/lib/posts";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

export interface TaxonomyRow {
  slug: string;
  name: string;
  icon_url: string | null;
  created_at: string;
  post_count: number;
}

export interface TaxonomyData {
  models: TaxonomyRow[];
  platforms: TaxonomyRow[];
}

export async function listTaxonomyForAdmin(): Promise<TaxonomyData> {
  const supabase = await createClient();
  const [modelsRes, platformsRes, postsRes] = await Promise.all([
    supabase
      .from("models")
      .select("slug, name, icon_url, created_at")
      .order("name"),
    supabase
      .from("platforms")
      .select("slug, name, icon_url, created_at")
      .order("name"),
    supabase.from("posts").select("model_slug, platform_slug"),
  ]);
  if (modelsRes.error) throw modelsRes.error;
  if (platformsRes.error) throw platformsRes.error;
  if (postsRes.error) throw postsRes.error;

  const modelCounts = new Map<string, number>();
  const platformCounts = new Map<string, number>();
  for (const row of postsRes.data ?? []) {
    modelCounts.set(row.model_slug, (modelCounts.get(row.model_slug) ?? 0) + 1);
    platformCounts.set(
      row.platform_slug,
      (platformCounts.get(row.platform_slug) ?? 0) + 1,
    );
  }

  const decorate = (
    rows: Pick<Model | Platform, "slug" | "name" | "icon_url" | "created_at">[],
    counts: Map<string, number>,
  ): TaxonomyRow[] =>
    rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      icon_url: r.icon_url,
      created_at: r.created_at,
      post_count: counts.get(r.slug) ?? 0,
    }));

  return {
    models: decorate(modelsRes.data ?? [], modelCounts),
    platforms: decorate(platformsRes.data ?? [], platformCounts),
  };
}

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
    .select(POSTS_WITH_TAGS_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return flattenPostsWithTags(data ?? []);
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
