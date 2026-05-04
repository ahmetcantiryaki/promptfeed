// Fire-and-forget client helper for posting a view to /api/views.
// The server-side endpoint deduplicates per-IP per-minute, so callers
// only need to invoke this once per detail-open.
//
// Uses navigator.sendBeacon when available for non-blocking delivery,
// otherwise falls back to fetch with keepalive. Errors are swallowed —
// view tracking is best-effort and must never disrupt the UI.

export function trackPostView(postId: string): void {
  if (typeof window === "undefined") return;
  if (!postId) return;

  const url = "/api/views";
  const payload = JSON.stringify({ postId });

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
  } catch {
    // fall through to fetch
  }

  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      cache: "no-store",
    }).catch(() => {
      // swallow
    });
  } catch {
    // swallow
  }
}
