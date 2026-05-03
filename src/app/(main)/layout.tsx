import { Sidebar } from "@/components/features/sidebar/sidebar";
import { Topbar } from "@/components/features/topbar/topbar";
import { ProfileSetupTrigger } from "@/components/features/profile/profile-setup-trigger";
import { InteractionsProvider } from "@/components/providers/interactions-provider";
import { FeedFilterProvider } from "@/components/providers/feed-filter-provider";
import { RouteProgressProvider } from "@/components/providers/route-progress-provider";
import { BannedScreen } from "@/components/features/banned/banned-screen";
import { SaveFolderModalsHost } from "@/components/features/save-folders/save-folder-modals-host";
import { listModelsAndPlatforms } from "@/lib/posts";
import { getLikedPostIds } from "@/lib/interactions";
import { getUserFoldersAndSaves } from "@/lib/folders";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  getProfile,
  getSocialAccounts,
  isProfileComplete,
} from "@/lib/profiles";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import type { AvatarConfig } from "@/types/domain";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const { models, platforms } = await listModelsAndPlatforms();

  const [profile, socials, likedIds, saveData, admin] = user
    ? await Promise.all([
        getProfile(user.id),
        getSocialAccounts(user.id),
        getLikedPostIds(user.id),
        getUserFoldersAndSaves(user.id),
        checkIsAdmin(user.id),
      ])
    : [
        null,
        [],
        [] as string[],
        {
          folders: [],
          savedIds: [] as string[],
          saveByPostId: {} as Record<string, string>,
          coverPostIdsByFolder: new Map<string, string[]>(),
          countsByFolder: new Map<string, number>(),
        },
        false,
      ];

  const avatarConfig = (profile?.avatar_config as AvatarConfig | null) ?? null;
  const isBanned = Boolean(user && profile?.is_banned);

  return (
    <InteractionsProvider
      userId={user?.id ?? null}
      currentHandle={profile?.handle ?? null}
      isAdmin={admin}
      initialLikedIds={likedIds}
      initialSavedIds={saveData.savedIds}
      initialFolders={saveData.folders}
      initialSaveByPostId={saveData.saveByPostId}
    >
      <FeedFilterProvider>
        <RouteProgressProvider>
        <div className="grid min-h-screen grid-cols-[248px_1fr]">
          <Sidebar
            models={models}
            platforms={platforms}
            savedCount={saveData.savedIds.length}
          />
          <main className="flex min-w-0 flex-col">
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
              />
            </div>
            {children}
          </main>

          {user ? (
            <ProfileSetupTrigger
              user={user}
              profile={profile}
              socials={socials}
              needsSetup={!isProfileComplete(profile)}
              isAdmin={admin}
            />
          ) : null}
          <SaveFolderModalsHost />
        </div>
        </RouteProgressProvider>
      </FeedFilterProvider>
      {isBanned ? <BannedScreen /> : null}
    </InteractionsProvider>
  );
}
