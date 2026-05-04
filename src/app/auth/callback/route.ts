import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedRedirect, SITE_URL } from "@/lib/site";

/**
 * Handles redirects from Supabase auth flows (recovery, magic link, email
 * confirmation, OAuth). Exchanges the `?code=...` for a session cookie, then:
 *
 * - Default flow: 303 redirect to `?next=` (validated against site origin).
 * - Popup flow (`?popup=1`, used by GoogleButton): returns a tiny HTML page
 *   that posts a message to `window.opener` and closes itself. The opener
 *   reloads to pick up the new session cookie.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  const next = isAllowedRedirect(nextParam) ? nextParam! : "/";
  const isPopup = url.searchParams.get("popup") === "1";

  if (!code) {
    if (isPopup) return popupResponse({ success: false, error: "missing_code" });
    return NextResponse.redirect(
      `${SITE_URL}/login?error=missing_code`,
      { status: 303 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (isPopup) return popupResponse({ success: false, error: error.message });
    return NextResponse.redirect(
      `${SITE_URL}/login?error=${encodeURIComponent(error.message)}`,
      { status: 303 },
    );
  }

  if (isPopup) return popupResponse({ success: true });
  return NextResponse.redirect(`${SITE_URL}${next}`, { status: 303 });
}

interface PopupResult {
  success: boolean;
  error?: string;
}

function popupResponse({ success, error }: PopupResult): Response {
  // Inline the result into a small HTML page; script posts to opener and
  // closes the popup. JSON.stringify guards against script-injection in the
  // error string.
  const payload = JSON.stringify({
    type: "feedlens:oauth",
    success,
    error: error ?? null,
  });
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Signing in…</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
         color: #555; text-align: center; padding: 2rem; margin: 0; }
  .ring { width: 28px; height: 28px; margin: 0 auto 1rem;
          border: 3px solid rgba(0,0,0,.12); border-top-color: #555;
          border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="ring" aria-hidden="true"></div>
<p>Signing in…</p>
<script>
(function () {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(${payload}, window.location.origin);
    }
  } catch (e) {}
  // Close the popup. If the browser blocks programmatic close (rare), fall
  // back to a redirect to the home page so the user isn't stranded.
  setTimeout(function () {
    try { window.close(); } catch (e) {}
    setTimeout(function () {
      if (!window.closed) document.location.href = '/';
    }, 600);
  }, 80);
})();
</script>
</body>
</html>`;
  return new Response(html, {
    status: success ? 200 : 400,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
