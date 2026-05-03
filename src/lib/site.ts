/**
 * Canonical site origin used for absolute URLs in metadata, sitemaps, and robots.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. "https://promptfeed.app").
 */
export const SITE_URL: string = (() => {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
})();

export const SITE_NAME = "PromptFeed";
export const DEFAULT_DESCRIPTION =
  "Twitter, Reddit, Instagram, YouTube ve TikTok'taki AI üretimi içerikleri, onları üreten prompt ile yan yana keşfedin.";

/** Build an absolute URL from a path. */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Returns true when `target` is the site origin or a same-origin path.
 * Used to block open-redirect via untrusted client-supplied URLs.
 */
export function isAllowedRedirect(target: string | undefined | null): boolean {
  if (!target || typeof target !== "string") return false;
  if (target.startsWith("/") && !target.startsWith("//")) return true;
  try {
    const u = new URL(target);
    const site = new URL(SITE_URL);
    return u.origin === site.origin;
  } catch {
    return false;
  }
}

/** Coerce a possibly-untrusted redirect target to a safe absolute URL. */
export function safeRedirect(target: string | undefined | null): string {
  if (!isAllowedRedirect(target)) return SITE_URL;
  if (target!.startsWith("/")) return absoluteUrl(target!);
  return target!;
}

/** Build a canonical search-string from a whitelist of params, sorted alphabetically. */
export function canonicalQuery(
  params: Record<string, string | undefined>,
  whitelist: readonly string[],
): string {
  const entries: Array<[string, string]> = [];
  for (const key of whitelist) {
    const v = params[key];
    if (typeof v === "string" && v.length > 0) entries.push([key, v]);
  }
  if (entries.length === 0) return "";
  entries.sort(([a], [b]) => a.localeCompare(b));
  const sp = new URLSearchParams(entries);
  return `?${sp.toString()}`;
}
