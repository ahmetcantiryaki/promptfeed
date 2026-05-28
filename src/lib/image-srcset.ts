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
  const { primary } = buildThumbCandidates(src);
  return primary;
}

export interface ThumbCandidates {
  /** Best-bet URL to try first. */
  primary: string;
  /** URLs to try in order if previous attempts 404. The recorded original
   *  is always last, so the worst case still shows a (low-res) image. */
  fallbacks: string[];
}

/**
 * Build an ordered list of thumbnail URL candidates for a given source.
 *
 * YouMind's resize pipeline rounds the 2x height by ±1 inconsistently
 * (e.g. `-300x217` resolves to `-600x435`, not the mathematically clean
 * `-600x434`). A single computed URL therefore 404s for a non-trivial
 * slice of posts. We try the exact double first, then ±1 to cover the
 * rounding cases, then fall back to the recorded `-300x...` original.
 *
 * Twitter just needs `?name=large` swapped in.
 */
export function buildThumbCandidates(src: string): ThumbCandidates {
  if (!src) return { primary: src, fallbacks: [] };

  if (src.includes("cms-assets.youmind.com")) {
    const match = src.match(/^(.+)-300x(\d+)\.(jpe?g|png|webp)$/i);
    if (!match) return { primary: src, fallbacks: [] };
    const [, base, hStr, ext] = match;
    const h = parseInt(hStr ?? "0", 10);
    return {
      primary: `${base}-600x${h * 2}.${ext}`,
      fallbacks: [
        `${base}-600x${h * 2 + 1}.${ext}`,
        `${base}-600x${h * 2 - 1}.${ext}`,
        src,
      ],
    };
  }

  if (src.includes("pbs.twimg.com")) {
    const base = src.split("?")[0] ?? src;
    return { primary: `${base}?name=large`, fallbacks: [src] };
  }

  return { primary: src, fallbacks: [] };
}
