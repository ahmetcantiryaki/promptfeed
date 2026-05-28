/**
 * Changelog data. Single source of truth — read by /changelog page and by
 * the opengraph-image generator. Sorted newest-first.
 *
 * Each release is rendered as an "issue" in the editorial layout, so the
 * issue number doubles as the marketing number visible on the page cover.
 */

export type ItemKind = "new" | "improved" | "fixed";

export interface ChangelogItem {
  kind: ItemKind;
  text: string;
}

export interface ChangelogEntry {
  /** Numeric issue, used for typography ("012"). */
  issue: number;
  /** Marketing version (kept for href anchors + future per-issue routes). */
  version: string;
  /** ISO date — drives the dateline + sort order. */
  date: string;
  /** Single-line, ≤ 7 words. Sets the cover headline. */
  headline: string;
  /** Optional sub-headline; one line, magazine "deck". */
  dek?: string;
  /** Two-three sentence editorial copy. */
  body: string;
  /** Per-release atomic bullets. */
  items: ChangelogItem[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    issue: 12,
    version: "0.12",
    date: "2026-05-28",
    headline: "Three axes, one taxonomy.",
    dek: "Multi-tag arrives in the feed.",
    body: "Every prompt now carries up to five tags across Subject, Style, and Use case. The sidebar runs an axis-switcher with selected tags pinned above the tabs, so stacking filters — food + photoreal + editorial — reads instantly. Discover pre-fetches in one query and filters client-side; chip toggles return in a frame, not a round-trip.",
    items: [
      { kind: "new", text: "Subject / Style / Use-case taxonomy with thirty seeded tags" },
      { kind: "new", text: "Axis tab switcher in the left rail — no scroll, no overflow" },
      { kind: "new", text: "Multi-tag URL state (?tag=food,photoreal) — AND-intersected" },
      { kind: "improved", text: "Discover loads the full dataset once; every filter runs in memory" },
    ],
  },
  {
    issue: 11,
    version: "0.11",
    date: "2026-05-26",
    headline: "Liked, but live.",
    dek: "A liked view that actually feels owned.",
    body: "Unliking a card drops it from the Liked grid instantly without a refetch. The top progress bar got thicker with a shimmer sheen and lost its glow shadow — the kind of small thing you only notice when it stops feeling wrong.",
    items: [
      { kind: "new", text: "Dedicated Liked view with sidebar entry and sign-in-then-replay nav" },
      { kind: "improved", text: "Instant unlike removal, no network round-trip" },
      { kind: "fixed", text: "End-of-feed footer no longer appears in scoped views" },
    ],
  },
  {
    issue: 10,
    version: "0.10",
    date: "2026-05-22",
    headline: "Sort, finally.",
    dek: "Latest, Oldest, Top, Most viewed.",
    body: "The feed now orders by Feedlens insert time instead of source post-date, so newly-added prompts surface first. Four sort modes — Latest is the new default, Top liked and Most viewed for browsing through engagement, Oldest for archaeologists.",
    items: [
      { kind: "new", text: "Most Viewed sort, backed by per-viewer deduped counts" },
      { kind: "improved", text: "Latest / Oldest / Top filter — sorted by Feedlens insert time" },
    ],
  },
  {
    issue: 9,
    version: "0.9",
    date: "2026-05-15",
    headline: "One-tap sign in.",
    dek: "Google Identity Services lands in the modal.",
    body: "Sign in with Google now lives directly inside the in-page sign-in modal — no redirect, no roundtrip. Email and password still work for users who want them.",
    items: [
      { kind: "new", text: "Google sign-in via Identity Services + signInWithIdToken" },
      { kind: "fixed", text: "CSP allows accounts.google.com for the identity widget" },
    ],
  },
];

export function getLatestEntry(): ChangelogEntry {
  const first = CHANGELOG[0];
  if (!first) throw new Error("Changelog is empty");
  return first;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format an ISO date as "MAY 28, 2026" — the editorial dateline. */
export function formatDateline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = MONTHS[d.getUTCMonth()] ?? "";
  return `${month.toUpperCase()} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Format the issue number as "012" — magazine cover treatment. */
export function formatIssueNumber(issue: number): string {
  return issue.toString().padStart(3, "0");
}

const ITEM_LABELS: Record<ItemKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

export function itemLabel(kind: ItemKind): string {
  return ITEM_LABELS[kind];
}
