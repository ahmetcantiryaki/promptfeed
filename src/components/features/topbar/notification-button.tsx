"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import {
  Bell,
  Heart,
  Bookmark,
  UserPlus,
  ImagePlus,
  Megaphone,
  Flag,
  CheckCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationRow } from "@/lib/notifications";

interface Props {
  userId: string;
  initialItems: NotificationRow[];
  initialUnread: number;
}

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; label: (actor: string | null) => string }
> = {
  like: {
    icon: <Heart className="h-3.5 w-3.5 text-red-500" strokeWidth={2} fill="currentColor" />,
    label: (a) => `${a ?? "Someone"} liked your prompt`,
  },
  save: {
    icon: <Bookmark className="h-3.5 w-3.5 text-text" strokeWidth={2} fill="currentColor" />,
    label: (a) => `${a ?? "Someone"} saved your prompt`,
  },
  follow: {
    icon: <UserPlus className="h-3.5 w-3.5 text-text" strokeWidth={2} />,
    label: (a) => `${a ?? "Someone"} followed you`,
  },
  new_post: {
    icon: <ImagePlus className="h-3.5 w-3.5 text-text" strokeWidth={2} />,
    label: (a) => `${a ?? "Someone"} shared a new prompt`,
  },
  admin_broadcast: {
    icon: <Megaphone className="h-3.5 w-3.5 text-text" strokeWidth={2} />,
    label: () => `Admin announcement`,
  },
  report: {
    icon: <Flag className="h-3.5 w-3.5 text-red-500" strokeWidth={2} />,
    label: () => `New report to review`,
  },
};

export function NotificationButton({
  userId,
  initialItems,
  initialUnread,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(initialItems);
    setUnread(initialUnread);
  }, [initialItems, initialUnread]);

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: now })),
    );
    setUnread(0);
    try {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("user_id", userId)
        .is("read_at", null);
      router.refresh();
    } catch {
      /* best-effort */
    }
  }, [unread, userId, router]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && unread > 0) {
          // Auto-mark-as-read on open
          void markAllRead();
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-[10px] border bg-surface text-text-muted transition-colors hover:bg-hover hover:text-text"
        >
          <Bell className="h-4 w-4" strokeWidth={1.8} />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[360px] overflow-hidden rounded-[12px] border bg-surface shadow-surface"
        >
          <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-text-muted" strokeWidth={1.8} />
              <span className="text-[13px] font-semibold text-text">
                Notifications
              </span>
              {unread > 0 ? (
                <span className="rounded-full bg-red-500/10 px-2 py-[1px] text-[10px] font-bold text-red-500">
                  {unread} new
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted transition-colors hover:text-text disabled:opacity-50"
            >
              <CheckCheck className="h-3 w-3" strokeWidth={2} />
              Mark all read
            </button>
          </header>

          {items.length === 0 ? (
            <div className="grid place-items-center gap-2 px-4 py-10 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-text-subtle">
                <Bell className="h-4 w-4" strokeWidth={1.6} />
              </div>
              <div className="text-[13px] font-medium text-text">
                You&apos;re all caught up
              </div>
              <p className="max-w-[240px] text-[11px] text-text-subtle">
                Likes, saves, follows, and new prompts from your creators will
                appear here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[440px] overflow-y-auto">
              {items.map((n) => {
                const meta = TYPE_META[n.type];
                const unreadRow = !n.read_at;
                const body = meta?.label(n.actor_handle) ?? `Notification`;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-2.5 border-b px-4 py-3 last:border-b-0",
                      unreadRow && "bg-surface-2/50",
                    )}
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2">
                      {meta?.icon ?? (
                        <Bell className="h-3.5 w-3.5 text-text-muted" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="text-[13px] leading-snug text-text">
                        {body}
                      </div>
                      <div className="text-[11px] text-text-subtle">
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {unreadRow ? (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
