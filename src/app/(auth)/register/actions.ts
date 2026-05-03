"use server";

import { createClient } from "@/lib/supabase/server";
import { isAllowedRedirect, SITE_URL } from "@/lib/site";
import { validatePassword } from "@/lib/password-policy";
import { rateLimit } from "@/lib/rate-limit";

export interface RegisterResult {
  ok: boolean;
  error?: string;
  needsConfirmation?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a new account via Supabase auth. Triggers an email confirmation
 * flow when the project requires it (do not bypass with admin client). The
 * returned `needsConfirmation` flag tells the UI whether the user must click
 * the email link before signing in.
 */
export async function registerAction(
  email: string,
  password: string,
  emailRedirectTo?: string,
): Promise<RegisterResult> {
  const trimmed = (email ?? "").trim().toLowerCase();
  if (!trimmed || !EMAIL_RE.test(trimmed)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const limited = await rateLimit({
    bucket: "auth:register",
    limit: 5,
    windowSec: 60 * 60,
  });
  if (!limited.ok) {
    return {
      ok: false,
      error: "Too many attempts. Please try again in an hour.",
    };
  }

  const passCheck = validatePassword(password);
  if (!passCheck.ok) {
    return { ok: false, error: passCheck.message };
  }

  const safeRedirect = isAllowedRedirect(emailRedirectTo)
    ? emailRedirectTo!
    : `${SITE_URL}/login`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: trimmed,
    password,
    options: { emailRedirectTo: safeRedirect },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    needsConfirmation: !data.session,
  };
}
