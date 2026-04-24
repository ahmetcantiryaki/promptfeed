import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPostById } from "@/lib/post-lookup";
import { getOwnerProfiles } from "@/lib/posts";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/profiles";
import { getLikedPostIds, getSavedPostIds } from "@/lib/interactions";
import { getFollowedHandles } from "@/lib/follows";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import { InteractionsProvider } from "@/components/providers/interactions-provider";
import { PromptDetailView } from "./prompt-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return { title: "Prompt not found — PromptFeed" };
  return {
    title: `${post.source_user} on ${post.platform_slug} — PromptFeed`,
    description: post.prompt.slice(0, 160),
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

  const user = await getCurrentUser();
  const [profile, likedIds, savedIds, followed, admin] = user
    ? await Promise.all([
        getProfile(user.id),
        getLikedPostIds(user.id),
        getSavedPostIds(user.id),
        getFollowedHandles(user.id),
        checkIsAdmin(user.id),
      ])
    : [null, [], [] as string[], [] as string[], false];

  return (
    <InteractionsProvider
      userId={user?.id ?? null}
      currentHandle={profile?.handle ?? null}
      isAdmin={admin}
      initialLikedIds={likedIds}
      initialSavedIds={savedIds}
      initialFollowedHandles={followed}
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

        <PromptDetailView post={post} owner={owner} />
      </div>
    </InteractionsProvider>
  );
}
