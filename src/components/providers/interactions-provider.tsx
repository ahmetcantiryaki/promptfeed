"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

interface InteractionsState {
  isAuthed: boolean;
  isAdmin: boolean;
  userId: string | null;
  currentHandle: string | null;
  liked: ReadonlySet<string>;
  saved: ReadonlySet<string>;
  /** Set of followed source_user handles (e.g. "@ahmetcan", "@mira_ai"). */
  followedHandles: ReadonlySet<string>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  toggleFollow: (sourceUser: string) => Promise<void>;
}

const InteractionsContext = createContext<InteractionsState | null>(null);

interface Props {
  children: ReactNode;
  userId: string | null;
  currentHandle: string | null;
  isAdmin?: boolean;
  initialLikedIds: string[];
  initialSavedIds: string[];
  initialFollowedHandles: string[];
}

function askToSignIn(action: string) {
  toast("Sign in to " + action, {
    duration: 6000,
    action: {
      label: "Sign in",
      onClick: () => {
        window.location.href = "/login";
      },
    },
  });
}

export function InteractionsProvider({
  children,
  userId,
  currentHandle,
  isAdmin = false,
  initialLikedIds,
  initialSavedIds,
  initialFollowedHandles,
}: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState<Set<string>>(() => new Set(initialLikedIds));
  const [saved, setSaved] = useState<Set<string>>(() => new Set(initialSavedIds));
  const [followedHandles, setFollowedHandles] = useState<Set<string>>(
    () => new Set(initialFollowedHandles),
  );

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!userId) {
        askToSignIn("like prompts");
        return;
      }
      const wasLiked = liked.has(postId);
      const next = new Set(liked);
      wasLiked ? next.delete(postId) : next.add(postId);
      setLiked(next);
      try {
        const supabase = createClient();
        if (wasLiked) {
          const { error } = await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("post_likes")
            .insert({ post_id: postId, user_id: userId });
          if (error) throw error;
        }
      } catch (e) {
        setLiked(new Set(liked));
        toast.error(e instanceof Error ? e.message : "Could not save like");
      }
    },
    [liked, userId],
  );

  const toggleSave = useCallback(
    async (postId: string) => {
      if (!userId) {
        askToSignIn("save prompts");
        return;
      }
      const wasSaved = saved.has(postId);
      const next = new Set(saved);
      wasSaved ? next.delete(postId) : next.add(postId);
      setSaved(next);
      try {
        const supabase = createClient();
        if (wasSaved) {
          const { error } = await supabase
            .from("post_saves")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", userId);
          if (error) throw error;
          toast("Removed from saved");
        } else {
          const { error } = await supabase
            .from("post_saves")
            .insert({ post_id: postId, user_id: userId });
          if (error) throw error;
          toast.success("Saved");
        }
      } catch (e) {
        setSaved(new Set(saved));
        toast.error(e instanceof Error ? e.message : "Could not save");
      }
    },
    [saved, userId],
  );

  const toggleFollow = useCallback(
    async (sourceUser: string) => {
      if (!userId) {
        askToSignIn("follow creators");
        return;
      }
      if (currentHandle && sourceUser === `@${currentHandle}`) {
        toast("That's you 🙂");
        return;
      }
      const was = followedHandles.has(sourceUser);
      const next = new Set(followedHandles);
      was ? next.delete(sourceUser) : next.add(sourceUser);
      setFollowedHandles(next);
      try {
        const supabase = createClient();
        if (was) {
          const { error } = await supabase
            .from("follows")
            .delete()
            .eq("user_id", userId)
            .eq("target_type", "user")
            .eq("target_id", sourceUser);
          if (error) throw error;
          toast(`Unfollowed ${sourceUser}`);
        } else {
          const { error } = await supabase
            .from("follows")
            .insert({
              user_id: userId,
              target_type: "user",
              target_id: sourceUser,
            });
          if (error) throw error;
          toast.success(`Following ${sourceUser}`);
        }
        router.refresh();
      } catch (e) {
        setFollowedHandles(new Set(followedHandles));
        toast.error(e instanceof Error ? e.message : "Could not update follow");
      }
    },
    [followedHandles, userId, currentHandle, router],
  );

  const value = useMemo<InteractionsState>(
    () => ({
      isAuthed: Boolean(userId),
      isAdmin,
      userId,
      currentHandle,
      liked,
      saved,
      followedHandles,
      toggleLike,
      toggleSave,
      toggleFollow,
    }),
    [
      userId,
      isAdmin,
      currentHandle,
      liked,
      saved,
      followedHandles,
      toggleLike,
      toggleSave,
      toggleFollow,
    ],
  );

  return (
    <InteractionsContext.Provider value={value}>
      {children}
    </InteractionsContext.Provider>
  );
}

export function useInteractions(): InteractionsState {
  const ctx = useContext(InteractionsContext);
  if (!ctx) {
    return {
      isAuthed: false,
      isAdmin: false,
      userId: null,
      currentHandle: null,
      liked: new Set(),
      saved: new Set(),
      followedHandles: new Set(),
      toggleLike: async () => askToSignIn("like prompts"),
      toggleSave: async () => askToSignIn("save prompts"),
      toggleFollow: async () => askToSignIn("follow creators"),
    };
  }
  return ctx;
}
