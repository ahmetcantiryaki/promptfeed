import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tag, TagAxis, TagsByAxis } from "@/types/domain";

const EMPTY_TAGS_BY_AXIS: TagsByAxis = {
  subject: [],
  style: [],
  use_case: [],
};

function isTagAxis(value: string): value is TagAxis {
  return value === "subject" || value === "style" || value === "use_case";
}

/**
 * Loads the full tag vocabulary grouped by axis, ordered by display_order
 * then name. Server-only; cached per request so the (main) layout + any
 * downstream consumers share a single query.
 */
export const listTagsByAxis = cache(async function listTagsByAxis(): Promise<TagsByAxis> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("axis", { ascending: true })
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;

  const grouped: TagsByAxis = {
    subject: [],
    style: [],
    use_case: [],
  };
  for (const row of data ?? []) {
    if (!isTagAxis(row.axis)) continue;
    const tag: Tag = { ...row, axis: row.axis };
    grouped[row.axis].push(tag);
  }
  return grouped;
});

/** Flat list of every tag — useful for slug → display-name lookups. */
export async function listAllTags(): Promise<Tag[]> {
  const byAxis = await listTagsByAxis();
  return [...byAxis.subject, ...byAxis.style, ...byAxis.use_case];
}

export { EMPTY_TAGS_BY_AXIS };
