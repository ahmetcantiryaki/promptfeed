/**
 * Display helpers for direct-file video posts.
 *
 * Architecture (decided 2026-05): video posts are **direct files** — the
 * playable .mp4/.webm lives in `posts.media_url`, never an iframe embed.
 * A post has two flavours, derived (no extra column) from whether an input
 * image is present:
 *
 *   image-to-video → `source_image_url` set (the image that produced the
 *                    clip, same field image remixes use). Card poster = it.
 *   text-to-video  → no `source_image_url`. Card poster = `thumbnail_url`
 *                    when an admin recorded one, else null so the card
 *                    renders the first frame straight from the video file.
 */

import type { Post } from "@/types/domain";
import { safeImageSrc } from "@/lib/safe-url";

export type VideoKind = "image_to_video" | "text_to_video";

type VideoPosterFields = Pick<Post, "source_image_url" | "thumbnail_url">;

/** True when the post is an image-to-video clip (carries an input image). */
export function isImageToVideo(
  post: Pick<Post, "source_image_url">,
): boolean {
  return Boolean(post.source_image_url);
}

export function videoKind(post: Pick<Post, "source_image_url">): VideoKind {
  return isImageToVideo(post) ? "image_to_video" : "text_to_video";
}

/**
 * Poster image for the card / the `<video poster>` before playback.
 * image-to-video → the input image; text-to-video → an explicit poster if
 * recorded, else null (caller renders the first video frame instead).
 * Both candidates pass through `safeImageSrc` so a malicious stored URL
 * never reaches an `<img src>`.
 */
export function videoPosterUrl(post: VideoPosterFields): string | null {
  return (
    safeImageSrc(post.source_image_url) ??
    safeImageSrc(post.thumbnail_url) ??
    null
  );
}

// Direct video file extensions we recognise. Signed CDN URLs sometimes omit
// an extension, so this is a *soft* hint (used to warn in the add form), not
// the security gate — that is `safeVideoSrc`.
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|ogg)(?:$|[?#])/i;

export function looksLikeVideoUrl(raw: string): boolean {
  return VIDEO_EXT_RE.test(raw.trim());
}

/**
 * Append a tiny media-fragment so browsers seek to (and paint) the first
 * frame when a `<video>` is used purely as a still poster — without this,
 * some engines show a blank box until playback starts. Returns null when
 * the URL fails the SSRF/protocol guard so the caller can omit the element.
 */
export function firstFrameSrc(safeUrl: string | null): string | null {
  if (!safeUrl) return null;
  // Don't double-append if a fragment is already present.
  if (safeUrl.includes("#")) return safeUrl;
  return `${safeUrl}#t=0.1`;
}
