import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPostById } from "@/lib/post-lookup";
import { getOwnerProfiles } from "@/lib/posts";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfile, getSocialAccounts } from "@/lib/profiles";
import { getLikedPostIds } from "@/lib/interactions";
import { listFolderSummaries } from "@/lib/folders";
import { createClient } from "@/lib/supabase/server";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import { prettyModel, prettyPlatform } from "@/lib/labels";
import { DEFAULT_OG_IMAGE, DEFAULT_TWITTER_IMAGE } from "@/lib/site";
import { InteractionsProvider } from "@/components/providers/interactions-provider";
import { SaveFolderModalsHost } from "@/components/features/save-folders/save-folder-modals-host";
import { BannedScreen } from "@/components/features/banned/banned-screen";
import { PromptDetailView } from "./prompt-detail-view";

async function getSavesByFolder(
  userId: string,
): Promise<{ savedIds: string[]; mapping: Record<string, string> }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_saves")
    .select("post_id, folder_id")
    .eq("user_id", userId);
  if (error) throw error;
  const savedIds: string[] = [];
  const mapping: Record<string, string> = {};
  for (const row of data ?? []) {
    savedIds.push(row.post_id);
    mapping[row.post_id] = row.folder_id;
  }
  return { savedIds, mapping };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) {
    return {
      title: "Prompt not found",
      robots: { index: false, follow: false },
    };
  }
  const canonical = `/prompt/${post.id}`;
  const handle = post.external_creator_handle ?? post.source_user;
  const platform = prettyPlatform(post.platform_slug);
  const model = prettyModel(post.model_slug);
  const title = `${handle} on ${platform} — ${model} prompt`;
  const description = post.prompt.replace(/\s+/g, " ").trim().slice(0, 200);

  return {
    title,
    description,
    alternates: { canonical },
    // Not indexable in search engines (paylaşma akışını engellememek için
    // robots.txt /prompt/ allow → OG botları yine fetch edebilir).
    robots: { index: false, follow: false },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: [DEFAULT_OG_IMAGE],
      publishedTime: post.posted_at,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_TWITTER_IMAGE],
    },
  };
}

export default async function PromptPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  const ownerMap = post.owner_id
    ? await getOwnerProfiles([post.owner_id])
    : {};
  const owner = post.owner_id ? ownerMap[post.owner_id] ?? null : null;
  const ownerSocials = post.owner_id ? await getSocialAccounts(post.owner_id) : [];

  const user = await getCurrentUser();
  const [profile, likedIds, saves, folders, admin] = user
    ? await Promise.all([
        getProfile(user.id),
        getLikedPostIds(user.id),
        getSavesByFolder(user.id),
        listFolderSummaries(user.id),
        checkIsAdmin(user.id),
      ])
    : [
        null,
        [] as string[],
        { savedIds: [] as string[], mapping: {} as Record<string, string> },
        [],
        false,
      ];

  const isBanned = Boolean(user && profile?.is_banned);

  return (
    <InteractionsProvider
      userId={user?.id ?? null}
      currentHandle={profile?.handle ?? null}
      isAdmin={admin}
      initialLikedIds={likedIds}
      initialSavedIds={saves.savedIds}
      initialFolders={folders}
      initialSaveByPostId={saves.mapping}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1080px] flex-col gap-6 px-5 py-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-[10px] border bg-surface px-3 py-1.5 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Back to feed
          </Link>
          <Link
            href="/"
            className="text-[14px] font-semibold tracking-tight text-text"
          >
            PromptFeed
          </Link>
        </header>

        <PromptDetailView post={post} owner={owner} ownerSocials={ownerSocials} />
      </div>
      <SaveFolderModalsHost />
      {isBanned ? <BannedScreen /> : null}
    </InteractionsProvider>
  );
}
