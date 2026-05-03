"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, X, Info } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Profile, SocialAccount } from "@/types/domain";
import { ProfileEditor } from "./profile-editor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  profile: Profile | null;
  socials: SocialAccount[];
  isAdmin?: boolean;
}

/**
 * Auto-opens for new users (see ProfileSetupTrigger). Wraps ProfileEditor in a
 * dialog with a welcoming header and a "Maybe later" secondary action.
 */
export function ProfileSetupDialog({
  open,
  onOpenChange,
  user,
  profile,
  socials,
  isAdmin = false,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content
          className="pf-modal-content fixed left-1/2 top-1/2 z-[70] flex max-h-[94vh] min-h-[min(720px,90vh)] w-[min(96vw,960px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[14px] border bg-surface shadow-2xl"
          aria-describedby="profile-setup-desc"
        >
          <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
            <div className="flex items-start gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-text-muted">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <Dialog.Title className="text-[17px] font-semibold tracking-tight">
                  Welcome to Feedlens.ai
                </Dialog.Title>
                <p
                  id="profile-setup-desc"
                  className="mt-0.5 text-[13px] text-text-muted"
                >
                  Design an avatar, pick a handle, and link your creator
                  profiles.
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </Dialog.Close>
          </div>

          {!isAdmin ? (
            <div className="flex items-start gap-2.5 border-b bg-amber-500/5 px-6 py-3">
              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600">
                <Info className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
                  Beta — heads up
                </div>
                <p className="mt-0.5 text-[13px] leading-[1.55] text-text-muted">
                  Avatar &amp; profile customization is in beta. It will become
                  important once we open up prompt sharing to all users — until
                  then, you can skip this and finish later from settings.
                </p>
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <ProfileEditor
              user={user}
              profile={profile}
              socials={socials}
              onSaved={() => onOpenChange(false)}
              secondaryAction={
                !isAdmin
                  ? { label: "Maybe later", onClick: () => onOpenChange(false) }
                  : undefined
              }
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
