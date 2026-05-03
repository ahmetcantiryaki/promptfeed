/**
 * Render-time URL guards. The DB may contain legacy or malicious values
 * (e.g. javascript:, data:, internal IPs) — never trust stored URLs at
 * render. Use these helpers anywhere a user-supplied URL becomes an
 * `href` or `src`.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Returns the URL only when it parses cleanly and uses http/https. Anything
 * else (javascript:, data:, vbscript:, mailto: outside of context, malformed
 * input, etc.) becomes `null` so the caller can omit the link entirely.
 */
export function safeHref(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (!ALLOWED_PROTOCOLS.has(u.protocol)) return null;
  return u.toString();
}

/**
 * Validates a URL intended for `<img src>`. In addition to safeHref's
 * protocol check, rejects private/loopback/metadata IPv4 ranges to prevent
 * SSRF when the URL is used by Next.js Image optimization or any server-side
 * fetch.
 */
export function safeImageSrc(raw: string | null | undefined): string | null {
  const href = safeHref(raw);
  if (!href) return null;
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  if (isUnsafeHost(u.hostname)) return null;
  return href;
}

const PRIVATE_IPV4_RE = /^(?:10|127|0|169\.254|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.|$)/;

function isUnsafeHost(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === "localhost") return true;
  if (lower === "::1") return true;
  if (lower === "0.0.0.0") return true;
  if (lower.endsWith(".local")) return true;
  if (lower.endsWith(".internal")) return true;
  // Cloud metadata endpoints
  if (lower === "169.254.169.254" || lower === "metadata.google.internal") {
    return true;
  }
  if (PRIVATE_IPV4_RE.test(lower)) return true;
  // Bare IPv6 in private ranges (fc00::/7, fe80::/10)
  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe8")) {
    if (lower.includes(":")) return true;
  }
  return false;
}
