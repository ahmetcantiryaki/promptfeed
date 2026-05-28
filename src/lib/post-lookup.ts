import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/types/domain";
import { isUuid } from "@/lib/slug";
import { POSTS_WITH_TAGS_SELECT, flattenPostTags } from "@/lib/posts";

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POSTS_WITH_TAGS_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data ? flattenPostTags(data) : null;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POSTS_WITH_TAGS_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) return null;
  return data ? flattenPostTags(data) : null;
}

/**
 * Resolve a `/prompt/[handle]` route param. The route accepts both:
 *   - canonical slug ("nano-banana-cyberpunk-cat")
 *   - legacy UUID (we still serve old shared links)
 *
 * Returns the post + a `redirectSlug` when the param was a UUID — caller
 * should 308-redirect to `/prompt/{redirectSlug}` to consolidate link equity.
 */
export async function resolvePostHandle(
  handle: string,
): Promise<{ post: Post; redirectSlug: string | null } | null> {
  if (isUuid(handle)) {
    const post = await getPostById(handle);
    if (!post) return null;
    return { post, redirectSlug: post.slug };
  }
  const post = await getPostBySlug(handle);
  if (!post) return null;
  return { post, redirectSlug: null };
}
