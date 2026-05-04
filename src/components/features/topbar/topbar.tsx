import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type {
  AvatarConfig,
  Model,
  Platform,
  Profile,
  SocialAccount,
} from "@/types/domain";
import { MobileSidebarTrigger } from "@/components/features/sidebar/mobile-sidebar-drawer";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { AddPromptButton } from "./add-prompt-button";
import { CreditsStrip } from "./credits-strip";

interface Props {
  user: User | null;
  profile: Profile | null;
  avatarConfig: AvatarConfig | null;
  avatarUrl: string | null;
  socials: SocialAccount[];
  models: Model[];
  platforms: Platform[];
  isAdmin?: boolean;
}

export function Topbar({
  user,
  profile,
  avatarConfig,
  avatarUrl,
  socials,
  models,
  platforms,
  isAdmin = false,
}: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-surface px-3 sm:h-[60px] sm:gap-3 sm:px-6">
      <MobileSidebarTrigger />
      <CreditsStrip />

      <div className="flex-1" />

      {user ? (
        <>
          {isAdmin ? (
            <AddPromptButton
              user={user}
              profile={profile}
              models={models}
              platforms={platforms}
              socials={socials}
            />
          ) : null}
          <ThemeToggle />
          <UserMenu
            user={user}
            profile={profile}
            avatarConfig={avatarConfig}
            avatarUrl={avatarUrl}
            socials={socials}
            models={models}
            platforms={platforms}
            isAdmin={isAdmin}
          />
        </>
      ) : (
        <>
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-3.5 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90 sm:h-auto sm:px-4 sm:py-2"
          >
            Sign in
          </Link>
        </>
      )}
    </header>
  );
}
