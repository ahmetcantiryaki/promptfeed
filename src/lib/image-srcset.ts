/**
 * URL transforms for upstream image CDNs. Used by card thumbnails where
 * the scraper recorded a low-resolution variant that looks blurry at
 * retina density, but the CDN serves a larger variant at a predictable
 * URL pattern.
 *
 * Two CDNs cover ~80% of the corpus and need an upgrade:
 *
 *   - YouMind (`cms-assets.youmind.com`) — recorded as `-300x...` thumbs.
 *     Swap to `-600x...` (dimensions doubled to preserve aspect ratio).
 *     Coverage is inconsistent; pair with `fallbackSrc`.
 *
 *   - Twitter (`pbs.twimg.com`) — default URL serves the "small" variant.
 *     Force `?name=large` (≈2048px max edge) to get the high-resolution
 *     copy. Always available.
 *
 * Other hosts (Reddit `preview.redd.it`, civitai, giz, etc.) carry
 * signature-protected query strings and can't be rewritten safely — left
 * as-is. Reddit's `i.redd.it` and most other hosts already serve the
 * original full-size image.
 */
export function upgradeThumbnailSrc(src: string): string {
  if (!src) return src;

  // YouMind CDN: -300x<H>.<ext> → -600x<2H>.<ext>
  if (src.includes("cms-assets.youmind.com")) {
    return src.replace(
      /-300x(\d+)\.(jpe?g|png|webp)$/i,
      (_match, h: string, ext: string) =>
        `-600x${parseInt(h, 10) * 2}.${ext}`,
    );
  }

  // Twitter: rewrite the query string to ?name=large for the biggest
  // standard variant. Drop any existing query so we don't double-up or
  // inherit a `name=small` from the scraper.
  if (src.includes("pbs.twimg.com")) {
    const base = src.split("?")[0] ?? src;
    return `${base}?name=large`;
  }

  return src;
}
