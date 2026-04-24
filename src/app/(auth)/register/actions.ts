"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

export async function registerAction(
  email: string,
  password: string,
): Promise<RegisterResult> {
  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
