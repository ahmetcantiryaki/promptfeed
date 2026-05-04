"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Settings,
  X,
  User as UserIcon,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Profile, SocialAccount } from "@/types/domain";
import { cn } from "@/lib/utils";
import { ProfileEditor } from "@/components/features/profile/profile-editor";
import { PasswordPanel, RecoveryPanel } from "./settings-panels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  profile: Profile | null;
  socials: SocialAccount[];
}

type TabKey = "account" | "password" | "recovery";

const TABS: {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    key: "account",
    label: "Account",
    icon: <UserIcon className="h-3.5 w-3.5" strokeWidth={1.8} />,
    description: "Avatar, display name, handle, bio, and social accounts.",
  },
  {
    key: "password",
    label: "Password",
    icon: <KeyRound className="h-3.5 w-3.5" strokeWidth={1.8} />,
    description: "Change your sign-in password.",
  },
  {
    key: "recovery",
    label: "Recovery",
    icon: <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />,
    description: "Password reset and sign-out of all devices.",
  },
];

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  profile,
  socials,
}: Props) {
  const [tab, setTab] = useState<TabKey>("account");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content
          className="pf-modal-content fixed left-1/2 top-1/2 z-[70] flex max-h-[100dvh] min-h-0 w-[min(98vw,1200px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[14px] border bg-surface shadow-2xl"
          aria-describedby="settings-desc"
        >
          <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
            <div className="flex items-start gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-text-muted">
                <Settings className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <Dialog.Title className="text-[17px] font-semibold tracking-tight">
                  Settings
                </Dialog.Title>
                <p
                  id="settings-desc"
                  className="mt-0.5 text-[13px] text-text-muted"
                >
                  {TABS.find((t) => t.key === tab)?.description}
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

          <Tabs.Root
            value={tab}
            onValueChange={(v) => setTab(v as TabKey)}
            className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[200px_1fr]"
          >
            <Tabs.List
              className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b bg-surface-2/40 p-2 md:flex-col md:overflow-x-visible md:border-b-0 md:border-r"
              aria-label="Settings sections"
            >
              {TABS.map((t) => (
                <Tabs.Trigger
                  key={t.key}
                  value={t.key}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-medium text-text-muted outline-none transition-colors",
                    "hover:bg-hover hover:text-text",
                    "data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-surface",
                    "data-[state=active]:md:border",
                  )}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div className="min-w-0 overflow-y-auto px-4 py-5 sm:px-6">
              <Tabs.Content value="account" className="outline-none">
                <ProfileEditor
                  user={user}
                  profile={profile}
                  socials={socials}
                />
              </Tabs.Content>
              <Tabs.Content value="password" className="outline-none">
                <PasswordPanel />
              </Tabs.Content>
              <Tabs.Content value="recovery" className="outline-none">
                <RecoveryPanel email={user.email ?? ""} />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
