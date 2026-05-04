import type { PlatformSlug } from "@/types/domain";
import { PLATFORM_THEME } from "@/lib/platform-icon";

export interface ParsedSource {
  platform: PlatformSlug;
  handle: string | null;
  url: string;
  hostname: string;
}

const HOST_PATTERNS: Array<[RegExp, PlatformSlug]> = [
  [/(^|\.)(twitter\.com|x\.com)$/i, "x"],
  [/(^|\.)instagram\.com$/i, "instagram"],
  [/(^|\.)reddit\.com$/i, "reddit"],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, "youtube"],
  [/(^|\.)tiktok\.com$/i, "tiktok"],
];

export function parseSourceUrl(raw: string): ParsedSource | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let u: URL;
  try {
    u = new URL(normalized);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const hostname = u.hostname.replace(/^www\./i, "").toLowerCase();
  const platform =
    HOST_PATTERNS.find(([rx]) => rx.test(hostname))?.[1] ?? "web";
  const handle = extractHandle(platform, u);
  return { platform, handle, url: u.toString(), hostname };
}

function extractHandle(platform: PlatformSlug, u: URL): string | null {
  const segments = u.pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase() ?? "";
  const firstRaw = segments[0] ?? "";
  switch (platform) {
    case "x": {
      const skip = new Set([
        "i",
        "home",
        "search",
        "intent",
        "explore",
        "messages",
        "compose",
        "notifications",
        "settings",
      ]);
      if (!first || skip.has(first)) return null;
      return `@${firstRaw}`;
    }
    case "instagram": {
      const skip = new Set(["p", "reel", "reels", "explore", "stories", "tv"]);
      if (!first || skip.has(first)) return null;
      return `@${firstRaw.replace(/^@/, "")}`;
    }
    case "reddit": {
      if ((first === "user" || first === "u") && segments[1]) {
        return `u/${segments[1]}`;
      }
      if (first === "r" && segments[1]) {
        return `r/${segments[1]}`;
      }
      return null;
    }
    case "youtube": {
      if (firstRaw.startsWith("@")) return firstRaw;
      if ((first === "c" || first === "user") && segments[1]) {
        return `@${segments[1]}`;
      }
      return null;
    }
    case "tiktok": {
      if (firstRaw.startsWith("@")) return firstRaw;
      return null;
    }
    default:
      return null;
  }
}

export function sourceDisplayLabel(parsed: ParsedSource): string {
  if (parsed.handle) return parsed.handle;
  if (parsed.platform === "web") return parsed.hostname;
  return PLATFORM_THEME[parsed.platform].label;
}
