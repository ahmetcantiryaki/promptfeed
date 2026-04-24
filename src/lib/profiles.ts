import { createClient } from "@/lib/supabase/server";
import type { Profile, SocialAccount } from "@/types/domain";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

export async function getSocialAccounts(
  profileId: string,
): Promise<SocialAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("profile_id", profileId);
  if (error) throw error;
  return data ?? [];
}

export function isProfileComplete(profile: Profile | null): boolean {
  return Boolean(profile?.display_name && profile?.handle);
}
