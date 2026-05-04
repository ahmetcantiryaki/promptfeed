import type { Metadata } from "next";
import { HomeContent } from "@/components/features/feed/home-content";
import {
  getOwnerProfiles,
  listModelsAndPlatforms,
  listPostsPaged,
  type OwnerMap,
  type PostsCursor,
} from "@/lib/posts";
import {
  getFolderById,
  getUserFoldersAndSaves,
  listFolderSummaries,
  listSavedPostsInFolder,
} from "@/lib/folders";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  canonicalQuery,
  DEFAULT_OG_IMAGE,
  DEFAULT_TWITTER_IMAGE,
} from "@/lib/site";
import { prettyModel, prettyPlatform } from "@/lib/labels";
import type {
  Post,
  PostSort,
  SaveFolder,
  SaveFolderSummary,
} from "@/types/domain";

interface SearchParams {
  model?: string;
  platform?: string;
  sort?: string;
  view?: string;
  folder?: string;
  q?: string;
}

function parseSort(raw?: string): PostSort {
  if (raw === "top") return "top";
  if (raw === "oldest") return "oldest";
  return "newest";
}

function encodeCursor(cursor: PostsCursor | null): string | null {
  if (!cursor) return null;
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64");
}

const HOME_CANONICAL_PARAMS = ["model", "platform", "sort"] as const;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isSavedView = params.view === "saved";
  if (isSavedView) {
    return {
      title: "Saved",
      robots: { index: false, follow: false },
      alternates: { canonical: "/" },
    };
  }
  const canonical = `/${canonicalQuery(
    params as Record<string, string | undefined>,
    HOME_CANONICAL_PARAMS,
  )}`;
  const segments: string[] = [];
  if (params.model) segments.push(prettyModel(params.model));
  if (params.platform) segments.push(prettyPlatform(params.platform));
  if (params.sort === "top") segments.push("Trend");
  const title =
    segments.length > 0
      ? `${segments.join(" · ")} prompts — discover example images`
      : "Discover, copy, and remix AI image prompts";
  const description =
    segments.length > 0
      ? `Discover, copy, and remix prompts behind AI images made with ${segments.join(", ")}. A curated archive of the best examples from social media.`
      : "Discover prompts behind AI images from social media in one feed. Thousands of curated prompts from GPT Image, Midjourney, Nano Banana, Flux, Sora, and more — copy and remix.";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      title,
      description,
      card: "summary_large_image",
      images: [DEFAULT_TWITTER_IMAGE],
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const isSavedView = params.view === "saved";
  const activeFolderId = isSavedView ? params.folder ?? null : null;

  const user = await getCurrentUser();
  const { models, platforms } = await listModelsAndPlatforms();

  let initialFeed: {
    posts: Post[];
    owners: OwnerMap;
    nextCursor: string | null;
  } | null = null;
  let initialFolders: SaveFolderSummary[] | null = null;
  let initialFolderDetail:
    | { folder: SaveFolder; posts: Post[]; owners: OwnerMap }
    | null = null;

  if (isSavedView && user) {
    if (activeFolderId) {
      const folder = await getFolderById(user.id, activeFolderId);
      if (folder) {
        const posts = await listSavedPostsInFolder(user.id, folder.id, 120);
        const ownerIds = posts
          .map((p) => p.owner_id)
          .filter((id): id is string => Boolean(id));
        const owners = await getOwnerProfiles(ownerIds);
        initialFolderDetail = { folder, posts, owners };
      } else {
        const data = await getUserFoldersAndSaves(user.id);
        initialFolders = await listFolderSummaries(user.id, data);
      }
    } else {
      const data = await getUserFoldersAndSaves(user.id);
      initialFolders = await listFolderSummaries(user.id, data);
    }
  } else if (!isSavedView) {
    const { posts, nextCursor } = await listPostsPaged({
      model: params.model,
      platform: params.platform,
      mediaType: "image",
      sort: parseSort(params.sort),
      limit: 30,
      q: params.q?.trim() ? params.q.trim().slice(0, 80) : undefined,
    });
    const ownerIds = posts
      .map((p) => p.owner_id)
      .filter((id): id is string => Boolean(id));
    const owners = await getOwnerProfiles(ownerIds);
    initialFeed = {
      posts,
      owners,
      nextCursor: encodeCursor(nextCursor),
    };
  }

  return (
    <HomeContent
      models={models}
      platforms={platforms}
      initialFeed={initialFeed}
      initialFolders={initialFolders}
      initialFolderDetail={initialFolderDetail}
    />
  );
}
