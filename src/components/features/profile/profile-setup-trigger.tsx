"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile, SocialAccount } from "@/types/domain";
import { ProfileSetupDialog } from "./profile-setup-dialog";

interface Props {
  user: User;
  profile: Profile | null;
  socials: SocialAccount[];
  needsSetup: boolean;
}

const DISMISS_KEY = "promptfeed.profileSetupDismissedAt";

export function ProfileSetupTrigger({
  user,
  profile,
  socials,
  needsSetup,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!needsSetup) return;
    // Re-prompt at most once per 12 hours if user dismissed.
    const raw = localStorage.getItem(DISMISS_KEY);
    const dismissedAt = raw ? Number.parseInt(raw, 10) : 0;
    const twelveHours = 12 * 60 * 60 * 1000;
    if (!raw || Date.now() - dismissedAt > twelveHours) {
      setOpen(true);
    }
  }, [needsSetup]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next && needsSetup) {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    if (!next && !needsSetup) {
      // explicit close of edit dialog - no dismiss flag needed
    }
  }

  return (
    <ProfileSetupDialog
      open={open}
      onOpenChange={onOpenChange}
      user={user}
      profile={profile}
      socials={socials}
    />
  );
}
