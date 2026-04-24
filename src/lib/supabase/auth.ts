import { createClient } from "./server";
import type { User } from "@supabase/supabase-js";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
