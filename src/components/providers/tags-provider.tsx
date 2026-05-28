"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { TAG_AXES, type Tag, type TagsByAxis } from "@/types/domain";

interface TagsContextValue {
  tagsByAxis: TagsByAxis;
  /** Quick slug → Tag lookup for rendering pills from post.tag_slugs. */
  bySlug: ReadonlyMap<string, Tag>;
}

const EMPTY: TagsContextValue = {
  tagsByAxis: { subject: [], style: [], use_case: [] },
  bySlug: new Map(),
};

const TagsContext = createContext<TagsContextValue>(EMPTY);

interface ProviderProps {
  children: ReactNode;
  tagsByAxis: TagsByAxis;
}

export function TagsProvider({ children, tagsByAxis }: ProviderProps) {
  const value = useMemo<TagsContextValue>(() => {
    const map = new Map<string, Tag>();
    for (const axis of TAG_AXES) {
      for (const tag of tagsByAxis[axis]) map.set(tag.slug, tag);
    }
    return { tagsByAxis, bySlug: map };
  }, [tagsByAxis]);

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}

export function useTags(): TagsContextValue {
  return useContext(TagsContext);
}

/** Convenience: resolve a list of tag slugs to full Tag objects, dropping
 *  any unknown ones. Preserves input order. */
export function useResolveTags(slugs: readonly string[] | undefined): Tag[] {
  const { bySlug } = useTags();
  return useMemo(() => {
    if (!slugs || slugs.length === 0) return [];
    const out: Tag[] = [];
    for (const slug of slugs) {
      const tag = bySlug.get(slug);
      if (tag) out.push(tag);
    }
    return out;
  }, [slugs, bySlug]);
}
