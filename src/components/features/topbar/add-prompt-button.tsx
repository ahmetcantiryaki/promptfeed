"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type {
  Model,
  Platform,
  Profile,
  SocialAccount,
  TagsByAxis,
} from "@/types/domain";
import { AddPromptDialog } from "@/components/features/add-prompt/add-prompt-dialog";

interface Props {
  user: User;
  profile: Profile | null;
  socials: SocialAccount[];
  models: Model[];
  platforms: Platform[];
  tagsByAxis: TagsByAxis;
}

export function AddPromptButton({
  user,
  profile,
  socials,
  models,
  platforms,
  tagsByAxis,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add prompt"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-accent bg-accent text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90 sm:h-auto sm:w-auto sm:px-3.5 sm:py-2"
      >
        <ImagePlus className="h-3.5 w-3.5" strokeWidth={2} />
        <span className="hidden sm:inline">Add prompt</span>
      </button>
      <AddPromptDialog
        open={open}
        onOpenChange={setOpen}
        userId={user.id}
        profile={profile}
        socials={socials}
        models={models}
        platforms={platforms}
        tagsByAxis={tagsByAxis}
      />
    </>
  );
}
