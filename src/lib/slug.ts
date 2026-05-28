/**
 * Slug + title utilities. Mirror the Postgres functions `slugify_text` and
 * `derive_title_from_prompt` (migration 0011) so the admin UI can preview
 * what the trigger will store. The DB remains the source of truth — these
 * helpers only shape user-facing previews and the optional explicit values
 * that get sent back to the trigger.
 *
 * Google's SERP title cap is ~60 chars; we use the same number for both
 * title and slug to keep URLs readable on social cards.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SLUG_MAX_LEN = 60;
export const TITLE_MAX_LEN = 60;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function slugify(input: string, maxLen: number = SLUG_MAX_LEN): string {
  if (!input) return "";
  const lowered = input.toLowerCase();
  const dashed = lowered.replace(/[^a-z0-9]+/g, "-");
  const trimmed = dashed.replace(/^-+|-+$/g, "");
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen).replace(/-+$/g, "");
}

/**
 * Pull a human-readable title from a prompt body. Mirrors the SQL function:
 *  - JSON-shaped input → first sufficiently long quoted string value
 *  - Otherwise → first sentence (split on `. `, `? `, `! `)
 *  - Hard-cap at maxLen chars
 */
export function deriveTitleFromPrompt(
  raw: string,
  maxLen: number = TITLE_MAX_LEN,
): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  let candidate = cleaned;
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    const match = cleaned.match(/:\s*"([^"]{4,})"/);
    if (match && match[1]) candidate = match[1];
  }

  const sentenceEnd = firstSentenceBreak(candidate);
  if (sentenceEnd > 0) candidate = candidate.slice(0, sentenceEnd);

  candidate = candidate.trim();
  if (candidate.length > maxLen) candidate = candidate.slice(0, maxLen).trim();
  return candidate;
}

function firstSentenceBreak(s: string): number {
  const candidates = [". ", "? ", "! "]
    .map((sep) => s.indexOf(sep))
    .filter((i) => i > 0);
  if (candidates.length === 0) return -1;
  return Math.min(...candidates);
}
