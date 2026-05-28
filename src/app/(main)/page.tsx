import type { Metadata } from "next";
import { HomeContent } from "@/components/features/feed/home-content";
import {
  getOwnerProfiles,
  listAllPostsForFeed,
  listModelsAndPlatforms,
  type OwnerMap,
} from "@/lib/posts";
import {
  getFolderById,
  getUserFoldersAndSaves,
  listFolderSummaries,
  listSavedPostsInFolder,
} from "@/lib/folders";
import { listLikedPosts } from "@/lib/interactions";
import { getCurrentUser } from "@/lib/supabase/auth";
import { DEFAULT_OG_IMAGE, DEFAULT_TWITTER_IMAGE } from "@/lib/site";
import type {
  Post,
  SaveFolder,
  SaveFolderSummary,
} from "@/types/domain";

interface SearchParams {
  sort?: string;
  view?: string;
  folder?: string;
  q?: string;
  tag?: string;
}

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isSavedView = params.view === "saved";
  const isLikedView = params.view === "liked";
  if (isSavedView) {
    return {
      title: "Saved",
      robots: { index: false, follow: false },
      alternates: { canonical: "/" },
    };
  }
  if (isLikedView) {
    return {
      title: "Liked",
      robots: { index: false, follow: false },
      alternates: { canonical: "/" },
    };
  }
  const sort = params.sort === "top" ? "top" : params.sort === "oldest" ? "oldest" : params.sort === "viewed" ? "viewed" : "newest";
  const canonical = sort === "newest" ? "/" : `/?sort=${sort}`;
  const title =
    sort === "top"
      ? "Top AI image prompts — discover examples"
      : "Discover, copy, and remix AI image prompts";
  const description =
    "Discover prompts behind AI images from social media in one feed. Thousands of curated prompts from GPT Image, Midjourney, Nano Banana, Flux, Sora, and more — copy and remix.";
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
  const isLikedView = params.view === "liked";
  const activeFolderId = isSavedView ? params.folder ?? null : null;

  const user = await getCurrentUser();
  const { models, platforms } = await listModelsAndPlatforms();

  let initialAllPosts: Post[] = [];
  let initialAllOwners: OwnerMap = {};
  let initialFolders: SaveFolderSummary[] | null = null;
  let initialFolderDetail:
    | { folder: SaveFolder; posts: Post[]; owners: OwnerMap }
    | null = null;
  let initialLiked: {
    posts: Post[];
    owners: OwnerMap;
    nextCursor: string | null;
  } | null = null;

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
  } else if (isLikedView && user) {
    const { posts, nextCursor } = await listLikedPosts(user.id, 60, null);
    const ownerIds = posts
      .map((p) => p.owner_id)
      .filter((id): id is string => Boolean(id));
    const owners = await getOwnerProfiles(ownerIds);
    initialLiked = {
      posts,
      owners,
      nextCursor: nextCursor
        ? Buffer.from(JSON.stringify(nextCursor), "utf8").toString("base64")
        : null,
    };
  } else if (!isSavedView && !isLikedView) {
    // Discover view: fetch every image post in a single query. The client
    // then runs filter / sort / search in memory via useMemo so toggling
    // chips feels instant. The cap inside listAllPostsForFeed keeps the
    // payload bounded if the corpus grows.
    const all = await listAllPostsForFeed();
    const ownerIds = all
      .map((p) => p.owner_id)
      .filter((id): id is string => Boolean(id));
    initialAllPosts = all;
    initialAllOwners = await getOwnerProfiles(ownerIds);
  }

  const heading =
    isLikedView
      ? "Liked prompts"
      : isSavedView
        ? "Saved prompts"
        : "Discover AI image prompts";

  return (
    <>
      <h1 className="sr-only">{heading}</h1>
      <HomeContent
        models={models}
        platforms={platforms}
        allPosts={initialAllPosts}
        allOwners={initialAllOwners}
        initialFolders={initialFolders}
        initialFolderDetail={initialFolderDetail}
        initialLiked={initialLiked}
      />
    </>
  );
}
