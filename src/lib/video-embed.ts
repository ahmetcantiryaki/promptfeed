/**
 * Video iframe-embed helpers for the pure-embed architecture.
 *
 *   detectEmbedProvider(url) — classify any URL into a known provider.
 *   buildEmbedUrl(provider, sourceUrl) — derive the canonical iframe src.
 *
 * The renderer (PostDetailModal) calls `buildEmbedUrl` with whatever the
 * scraper recorded in `posts.embed_provider` and `posts.source_url`. When
 * the provider is missing we fall back to URL detection so a half-
 * populated row still renders.
 */

import { isEmbedProvider, type EmbedProvider } from "@/types/domain";

const PROVIDER_TESTS: { provider: EmbedProvider; test: RegExp }[] = [
  { provider: "youtube", test: /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)/i },
  { provider: "x", test: /(?:twitter\.com|x\.com)\/[^/]+\/status\//i },
  { provider: "tiktok", test: /tiktok\.com\/(?:@[^/]+\/video\/|embed\/v2\/|v\/)/i },
  { provider: "instagram", test: /instagram\.com\/(?:p|reel|reels|tv)\//i },
  { provider: "reddit", test: /reddit\.com\/r\/[^/]+\/comments\//i },
  { provider: "vimeo", test: /vimeo\.com\/(?:video\/)?\d/i },
];

export function detectEmbedProvider(sourceUrl: string | null | undefined): EmbedProvider | null {
  if (!sourceUrl) return null;
  for (const { provider, test } of PROVIDER_TESTS) {
    if (test.test(sourceUrl)) return provider;
  }
  return null;
}

/** Resolve a stored provider hint plus URL into the actual iframe src. */
export function buildEmbedUrl(
  provider: string | null | undefined,
  sourceUrl: string,
): string | null {
  const safeProvider: EmbedProvider | null = isEmbedProvider(provider)
    ? provider
    : detectEmbedProvider(sourceUrl);
  if (!safeProvider) return null;

  switch (safeProvider) {
    case "youtube": {
      const id = extractYouTubeId(sourceUrl);
      return id
        ? `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0&playsinline=1`
        : null;
    }
    case "x": {
      const id = extractXTweetId(sourceUrl);
      return id
        ? `https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark&hideCard=false&hideThread=true`
        : null;
    }
    case "tiktok": {
      const id = extractTikTokId(sourceUrl);
      return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
    }
    case "instagram": {
      const code = extractInstagramCode(sourceUrl);
      return code ? `https://www.instagram.com/p/${code}/embed/captioned/` : null;
    }
    case "reddit": {
      // Reddit's iframe wants the canonical comments URL with `?embed=true`.
      const cleaned = sourceUrl.split("?")[0]?.replace(/\/$/, "");
      return cleaned ? `${cleaned}/embed/?embed=true&showtitle=false&depth=1` : null;
    }
    case "vimeo": {
      const id = extractVimeoId(sourceUrl);
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    case "native":
      // Direct <video> file URL — caller can render natively.
      return sourceUrl;
  }
}

/** True when the source URL is one we know how to iframe-embed. */
export function isEmbeddable(provider: string | null | undefined, sourceUrl: string): boolean {
  return buildEmbedUrl(provider, sourceUrl) !== null;
}

// ── ID extractors ────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  // youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watch) return watch[1] ?? null;
  const youtu = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  if (youtu) return youtu[1] ?? null;
  const embed = url.match(/youtube\.com\/(?:embed|shorts)\/([a-zA-Z0-9_-]{6,})/i);
  if (embed) return embed[1] ?? null;
  return null;
}

function extractXTweetId(url: string): string | null {
  const m = url.match(/\/status\/(\d{6,})/);
  return m ? m[1] ?? null : null;
}

function extractTikTokId(url: string): string | null {
  const m =
    url.match(/\/video\/(\d{6,})/) ||
    url.match(/\/embed\/v2\/(\d{6,})/) ||
    url.match(/\/v\/(\d{6,})/);
  return m ? m[1] ?? null : null;
}

function extractInstagramCode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] ?? null : null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m ? m[1] ?? null : null;
}
