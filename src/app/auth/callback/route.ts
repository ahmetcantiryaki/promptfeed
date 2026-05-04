import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedRedirect, SITE_URL } from "@/lib/site";

/**
 * Handles redirects from Supabase auth email links (recovery, magic link,
 * email confirmation). Exchanges the `?code=...` for a session cookie, then
 * redirects to `?next=` (validated against the site origin).
 *
 * Note: Google sign-in does NOT use this route — it goes through the GIS
 * popup + `signInWithIdToken` and never leaves the originating page.
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
