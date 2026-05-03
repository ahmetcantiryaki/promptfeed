/**
 * JSON-aware helpers for the prompt body.
 *
 * Prompts are stored as plain text in `posts.prompt`. When the text is valid
 * JSON we render it as a code block, expose a "Copy as JSON" button, and let
 * authors beautify their own input on the way in.
 */

export function tryParseJson(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function isJsonPrompt(raw: string): boolean {
  return tryParseJson(raw) !== null;
}

export function prettifyJson(raw: string): string | null {
  const parsed = tryParseJson(raw);
  if (parsed === null) return null;
  try {
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}
