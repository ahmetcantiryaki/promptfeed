import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];

export async function listNotifications(
  userId: string,
  limit = 20,
): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function unreadNotificationCount(
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}
