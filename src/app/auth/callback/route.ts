import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedRedirect, SITE_URL } from "@/lib/site";

/**
 * Handles the redirect from Supabase auth emails (recovery, magic link,
 * email confirmation). Exchanges the `?code=...` for a session cookie, then
 * sends the user to `?next=` (validated against the site origin).
 *
 * Flow:
 *   email link → /auth/callback?code=...&next=/auth/reset-password
 *               → exchange code → set cookies → redirect to next
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  const next = isAllowedRedirect(nextParam) ? nextParam! : "/";

  if (!code) {
    return NextResponse.redirect(
      `${SITE_URL}/login?error=missing_code`,
      { status: 303 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${SITE_URL}/login?error=${encodeURIComponent(error.message)}`,
      { status: 303 },
    );
  }

  return NextResponse.redirect(`${SITE_URL}${next}`, { status: 303 });
}
