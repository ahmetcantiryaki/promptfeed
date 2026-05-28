import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { resolvePostHandle } from "@/lib/post-lookup";
import { getOwnerProfiles } from "@/lib/posts";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfile, getSocialAccounts } from "@/lib/profiles";
import { getLikedPostIds } from "@/lib/interactions";
import { listFolderSummaries } from "@/lib/folders";
import { createClient } from "@/lib/supabase/server";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import { prettyModel, prettyPlatform } from "@/lib/labels";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
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
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolvePostHandle(slug);
  if (!resolved) {
    return {
      title: "Prompt not found",
      robots: { index: false, follow: false },
    };
  }
  const { post } = resolved;
  const canonical = `/prompt/${post.slug}`;
  const handle = post.external_creator_handle ?? post.source_user;
  const platform = prettyPlatform(post.platform_slug);
  const model = prettyModel(post.model_slug);
  const heroTitle = post.title || `${handle} on ${platform}`;
  const title = `${heroTitle} — ${model} prompt`;
  const description = post.prompt.replace(/\s+/g, " ").trim().slice(0, 200);

  return {
    title,
    description,
    alternates: { canonical },
    // Each prompt is its own indexable landing page — that's the SEO core of
    // a prompt-archive site. The OG image is the post's own media so social
    // unfurls show the actual generated image, not a generic logo.
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: [
        {
          url: post.media_url,
          alt: heroTitle,
        },
      ],
      publishedTime: post.posted_at,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [post.media_url],
    },
  };
}

export default async function PromptPage({ params }: PageProps) {
  const { slug } = await params;
  const resolved = await resolvePostHandle(slug);
  if (!resolved) notFound();

  const { post, redirectSlug } = resolved;
  // UUID share-link path → consolidate link equity by 308-redirecting.
  if (redirectSlug && redirectSlug !== slug) {
    permanentRedirect(`/prompt/${redirectSlug}`);
  }

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

  const jsonLd = buildPromptJsonLd(post);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1080px] flex-col gap-6 px-4 py-6 sm:px-5 sm:py-8">
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
            Feedlens.ai
          </Link>
        </header>

        <h1 className="sr-only">{post.title}</h1>
        <PromptDetailView post={post} owner={owner} ownerSocials={ownerSocials} />
      </div>
      <SaveFolderModalsHost />
      {isBanned ? <BannedScreen /> : null}
    </InteractionsProvider>
  );
}

function buildPromptJsonLd(post: {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  media_url: string;
  posted_at: string;
  created_at: string;
  model_slug: string;
  platform_slug: string;
  external_creator_handle: string | null;
  external_creator_url: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": absoluteUrl(`/prompt/${post.slug}`),
    name: post.title,
    headline: post.title,
    description: post.prompt.replace(/\s+/g, " ").trim().slice(0, 300),
    url: absoluteUrl(`/prompt/${post.slug}`),
    datePublished: post.posted_at,
    dateCreated: post.created_at,
    image: {
      "@type": "ImageObject",
      url: post.media_url,
      contentUrl: post.media_url,
    },
    keywords: [
      prettyModel(post.model_slug),
      prettyPlatform(post.platform_slug),
      "AI prompt",
    ].join(", "),
    creator: post.external_creator_handle
      ? {
          "@type": "Person",
          name: post.external_creator_handle,
          ...(post.external_creator_url
            ? { url: post.external_creator_url }
            : {}),
        }
      : { "@type": "Organization", name: SITE_NAME },
    isBasedOn: post.external_creator_url ?? undefined,
  };
}
