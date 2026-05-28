/**
 * Shared server-side data fetch + render shell for category routes
 * (`/[slug]` and `/[slug]/[platform]`). Like the root page, this pre-fetches
 * the full image dataset so the client can apply model/platform/tag/sort
 * filters in memory — no refetch on filter changes.
 */

import { HomeContent } from "@/components/features/feed/home-content";
import {
  getOwnerProfiles,
  listAllPostsForFeed,
  listModelsAndPlatforms,
  type OwnerMap,
} from "@/lib/posts";
import type { PostSort } from "@/types/domain";

export interface CategoryShellArgs {
  model?: string;
  platform?: string;
  tags?: string[];
  sort: PostSort;
  q?: string;
}

export async function CategoryShell(_args: CategoryShellArgs) {
  // The path filter (model / platform) and query-string filters (tag, sort,
  // q) are read by FeedFilterProvider from the URL and applied by the
  // HomeContent useMemo. Server only needs to ship the full corpus.
  const { models, platforms } = await listModelsAndPlatforms();
  const allPosts = await listAllPostsForFeed();
  const ownerIds = allPosts
    .map((p) => p.owner_id)
    .filter((id): id is string => Boolean(id));
  const allOwners: OwnerMap = await getOwnerProfiles(ownerIds);

  return (
    <HomeContent
      models={models}
      platforms={platforms}
      allPosts={allPosts}
      allOwners={allOwners}
      initialFolders={null}
      initialFolderDetail={null}
      initialLiked={null}
    />
  );
}
