"use client";

import { useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { LogOut, Settings, ImagePlus, ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type {
  AvatarConfig,
  Model,
  Platform,
  Profile,
  SocialAccount,
} from "@/types/domain";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SettingsDialog } from "@/components/features/settings/settings-dialog";

interface Props {
  user: User;
  profile: Profile | null;
  avatarConfig: AvatarConfig | null;
  avatarUrl: string | null;
  socials?: SocialAccount[];
  models?: Model[];
  platforms?: Platform[];
  isAdmin?: boolean;
}

export function UserMenu({
  user,
  profile,
  avatarConfig,
  avatarUrl,
  socials = [],
  isAdmin = false,
}: Props) {
  const [confirmOut, setConfirmOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-hover"
            style={{ padding: 0 }}
          >
            <UserAvatar
              config={avatarConfig}
              url={avatarUrl}
              email={user.email}
              size={36}
            />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-[240px] overflow-hidden rounded-[10px] border bg-surface p-1 shadow-surface"
          >
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <UserAvatar
                config={avatarConfig}
                url={avatarUrl}
                email={user.email}
                size={36}
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-text">
                  {profile?.display_name ?? user.email ?? "—"}
                </div>
                <div className="truncate text-[11px] text-text-subtle">
                  {profile?.handle ? `@${profile.handle}` : user.email}
                </div>
              </div>
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            {isAdmin ? (
              <DropdownMenu.Item asChild>
                <Link
                  href="/my-prompts"
                  className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] text-text-muted outline-none transition-colors data-[highlighted]:bg-hover data-[highlighted]:text-text"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  My prompts
                </Link>
              </DropdownMenu.Item>
            ) : null}
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                setSettingsOpen(true);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] text-text-muted outline-none transition-colors data-[highlighted]:bg-hover data-[highlighted]:text-text"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings &amp; profile
            </DropdownMenu.Item>
            {isAdmin ? (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item asChild>
                  <Link
                    href="/admin"
                    className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] text-text outline-none transition-colors data-[highlighted]:bg-hover"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin panel
                    <span className="ml-auto rounded-full border border-text/30 bg-surface-2 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[0.06em] text-text">
                      Admin
                    </span>
                  </Link>
                </DropdownMenu.Item>
              </>
            ) : null}
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                setConfirmOut(true);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] text-red-500 outline-none transition-colors data-[highlighted]:bg-red-500/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        profile={profile}
        socials={socials}
      />

      <Dialog.Root open={confirmOut} onOpenChange={setConfirmOut}>
        <Dialog.Portal>
          <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm" />
          <Dialog.Content
            className="pf-modal-content fixed left-1/2 top-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border bg-surface p-6 shadow-2xl"
            aria-describedby="signout-desc"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-500">
                <LogOut className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <Dialog.Title className="text-[16px] font-semibold text-text">
                  Sign out of Feedlens.ai?
                </Dialog.Title>
                <Dialog.Description
                  id="signout-desc"
                  className="mt-1 text-[13px] text-text-muted"
                >
                  You&apos;ll need to sign in again to access your saved
                  prompts, profile, and social handles.
                </Dialog.Description>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOut(false)}
                className="rounded-[10px] border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                Cancel
              </button>
              <form action="/auth/signout" method="post" className="contents">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-red-500 bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                  Sign out
                </button>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
