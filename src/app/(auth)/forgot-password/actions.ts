"use server";

import { createClient } from "@/lib/supabase/server";
import { isAllowedRedirect, SITE_URL } from "@/lib/site";
import { rateLimit } from "@/lib/rate-limit";

export interface ForgotPasswordResult {
  success: boolean;
  error?: "invalid_email" | "rate_limited" | "unknown";
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a password reset email. Always returns success when the email is
 * syntactically valid — we never reveal whether an account exists, to prevent
 * user enumeration. The provided `redirectTo` is validated against the app
 * origin to prevent open redirects.
 */
export async function requestPasswordReset(
  email: string,
  redirectTo: string,
): Promise<ForgotPasswordResult> {
  const trimmed = (email ?? "").trim().toLowerCase();
  if (!trimmed || !EMAIL_RE.test(trimmed)) {
    return { success: false, error: "invalid_email" };
  }

  // Per-email rate limit: 10 reset requests / hour. The bucket is keyed by
  // the lowercased email so a user retrying from multiple devices/IPs is
  // throttled together, while different users on the same NAT are not.
  const limited = await rateLimit({
    bucket: "auth:forgot",
    limit: 10,
    windowSec: 60 * 60,
    identifier: trimmed,
  });
  if (!limited.ok) {
    return { success: false, error: "rate_limited" };
  }

  const safeRedirect = isAllowedRedirect(redirectTo)
    ? redirectTo
    : `${SITE_URL}/login`;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: safeRedirect,
    });
    if (error) {
      const msg = error.message ?? "";
      if (/rate/i.test(msg)) {
        return { success: false, error: "rate_limited", message: msg };
      }
      // Treat any other Supabase error as success to avoid enumeration leaks.
    }
  } catch {
    // Swallow errors here too — never reveal account existence to the caller.
  }

  return { success: true };
}
