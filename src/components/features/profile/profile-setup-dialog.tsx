"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Profile, SocialAccount } from "@/types/domain";
import { ProfileEditor } from "./profile-editor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  profile: Profile | null;
  socials: SocialAccount[];
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
                  Welcome to PromptFeed
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

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <ProfileEditor
              user={user}
              profile={profile}
              socials={socials}
              onSaved={() => onOpenChange(false)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
