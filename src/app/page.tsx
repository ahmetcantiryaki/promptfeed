import { Bookmark, Users } from "lucide-react";
import { Sidebar, type SidebarRoute } from "@/components/features/sidebar/sidebar";
import { Topbar } from "@/components/features/topbar/topbar";
import { FilterBar } from "@/components/features/filter-bar/filter-bar";
import { FeedGrid } from "@/components/features/feed/feed-grid";
import { ProfileSetupTrigger } from "@/components/features/profile/profile-setup-trigger";
import { InteractionsProvider } from "@/components/providers/interactions-provider";
import {
  getOwnerProfiles,
  listModels,
  listPlatforms,
  listPosts,
} from "@/lib/posts";
import {
  getLikedPostIds,
  getSavedPostIds,
  listSavedPosts,
} from "@/lib/interactions";
import { getFollowedHandles, listFollowingPosts } from "@/lib/follows";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfile, getSocialAccounts, isProfileComplete } from "@/lib/profiles";
import {
  listNotifications,
  unreadNotificationCount,
} from "@/lib/notifications";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import type { AvatarConfig, PostSort } from "@/types/domain";

interface SearchParams {
  model?: string;
  platform?: string;
  sort?: string;
  tab?: string;
  view?: string;
}

function parseSort(raw?: string): PostSort {
  return raw === "top" ? "top" : "newest";
}

function parseTab(raw?: string): "for-you" | "following" {
  return raw === "following" ? "following" : "for-you";
}

function resolveRoute(params: SearchParams): SidebarRoute {
  if (params.view === "saved") return "saved";
  if (params.tab === "following") return "following";
  if (params.sort === "top") return "trending";
  if (params.sort === "newest") return "recent";
  if (!params.model && !params.platform && !params.sort && !params.tab) {
    return "discover";
  }
  return null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeModel = params.model;
  const activePlatform = params.platform;
  const activeSort = parseSort(params.sort);
  const activeTab = parseTab(params.tab);
  const activeRoute = resolveRoute(params);
  const isSavedView = params.view === "saved";
  const isFollowingView = activeTab === "following";

  const user = await getCurrentUser();

  const [models, platforms] = await Promise.all([listModels(), listPlatforms()]);

  const [
    profile,
    socials,
    likedIds,
    savedIds,
    followedHandles,
    notifications,
    unread,
    admin,
  ] = user
    ? await Promise.all([
        getProfile(user.id),
        getSocialAccounts(user.id),
        getLikedPostIds(user.id),
        getSavedPostIds(user.id),
        getFollowedHandles(user.id),
        listNotifications(user.id, 20),
        unreadNotificationCount(user.id),
        checkIsAdmin(user.id),
      ])
    : [
        null,
        [],
        [] as string[],
        [] as string[],
        [] as string[],
        [],
        0,
        false,
      ];

  let posts;
  if (isSavedView && user) {
    posts = await listSavedPosts(user.id, 60);
  } else if (isFollowingView && user) {
    posts = await listFollowingPosts(followedHandles, activeSort, 60);
  } else {
    posts = await listPosts({
      model: activeModel,
      platform: activePlatform,
      mediaType: "image",
      sort: activeSort,
      limit: 60,
    });
  }

  const ownerIds = posts
    .map((p) => p.owner_id)
    .filter((id): id is string => Boolean(id));
  const ownerMap = await getOwnerProfiles(ownerIds);

  const avatarConfig = (profile?.avatar_config as AvatarConfig | null) ?? null;

  return (
    <InteractionsProvider
      userId={user?.id ?? null}
      currentHandle={profile?.handle ?? null}
      isAdmin={admin}
      initialLikedIds={likedIds}
      initialSavedIds={savedIds}
      initialFollowedHandles={followedHandles}
    >
      <div className="grid min-h-screen grid-cols-[248px_1fr]">
        <Sidebar
          models={models}
          platforms={platforms}
          activeModel={activeModel}
          activePlatform={activePlatform}
          activeRoute={activeRoute}
          savedCount={savedIds.length}
          followingCount={followedHandles.length}
        />
        <main className="flex min-w-0 flex-col">
          {/* Topbar + FilterBar move together as one sticky block — no gap. */}
          <div className="sticky top-0 z-40 bg-surface">
            <Topbar
              user={user}
              profile={profile}
              avatarConfig={avatarConfig}
              avatarUrl={profile?.avatar_url ?? null}
              socials={socials}
              models={models}
              platforms={platforms}
              isAdmin={admin}
              notifications={notifications}
              unreadCount={unread}
            />
            {!isSavedView && !isFollowingView ? (
              <FilterBar
                models={models}
                platforms={platforms}
                activeModel={activeModel}
                activePlatform={activePlatform}
                activeSort={activeSort}
                activeTab={activeTab}
              />
            ) : null}
          </div>

          <div className="px-7 pb-10 pt-6">
            {isSavedView ? (
              <header className="mb-5 flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-text-muted" strokeWidth={2} />
                <h1 className="text-[17px] font-semibold tracking-tight">
                  Saved prompts
                </h1>
                <span className="text-[13px] text-text-subtle">
                  {savedIds.length} {savedIds.length === 1 ? "item" : "items"}
                </span>
              </header>
            ) : null}

            {isFollowingView ? (
              <header className="mb-5 flex items-center gap-2">
                <Users className="h-4 w-4 text-text-muted" strokeWidth={2} />
                <h1 className="text-[17px] font-semibold tracking-tight">
                  Following
                </h1>
                <span className="text-[13px] text-text-subtle">
                  {followedHandles.length}{" "}
                  {followedHandles.length === 1 ? "creator" : "creators"}
                </span>
              </header>
            ) : null}

            {isSavedView && !user ? (
              <EmptyState
                icon={<Bookmark className="h-6 w-6" strokeWidth={1.6} />}
                title="Sign in to see your saved prompts"
                body="Saved prompts sync across devices once you&apos;re signed in."
                cta={{ href: "/login", label: "Sign in" }}
              />
            ) : isSavedView && posts.length === 0 ? (
              <EmptyState
                icon={<Bookmark className="h-6 w-6" strokeWidth={1.6} />}
                title="No saved prompts yet"
                body="Tap the bookmark on any card to save it here."
                cta={{ href: "/", label: "Browse Discover" }}
              />
            ) : isFollowingView && !user ? (
              <EmptyState
                icon={<Users className="h-6 w-6" strokeWidth={1.6} />}
                title="Sign in to build a following feed"
                body="Open any post's detail view and tap Follow to add its creator here."
                cta={{ href: "/login", label: "Sign in" }}
              />
            ) : isFollowingView && followedHandles.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" strokeWidth={1.6} />}
                title="You aren't following anyone yet"
                body="Open a post's detail view and tap Follow on the creator header."
                cta={{ href: "/", label: "Browse Discover" }}
              />
            ) : isFollowingView && posts.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" strokeWidth={1.6} />}
                title="No posts from your follows yet"
                body="The creators you follow haven't posted recently — try following more."
                cta={{ href: "/", label: "Browse Discover" }}
              />
            ) : (
              <FeedGrid posts={posts} ownerMap={ownerMap} />
            )}
          </div>
        </main>

        {user ? (
          <ProfileSetupTrigger
            user={user}
            profile={profile}
            socials={socials}
            needsSetup={!isProfileComplete(profile)}
          />
        ) : null}
      </div>
    </InteractionsProvider>
  );
}

function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="grid place-items-center rounded-[12px] border bg-surface-2/40 py-24 text-center">
      <div className="flex flex-col items-center gap-3 px-6">
        <span className="text-text-subtle">{icon}</span>
        <div className="text-[16px] font-semibold text-text">{title}</div>
        <p className="max-w-[360px] text-[13px] text-text-muted">{body}</p>
        <a
          href={cta.href}
          className="mt-1 inline-flex items-center rounded-[10px] border border-accent bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg hover:opacity-90"
        >
          {cta.label}
        </a>
      </div>
    </div>
  );
}
