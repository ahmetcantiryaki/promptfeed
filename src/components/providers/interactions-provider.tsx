"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { createFolder, moveSaveToFolder } from "@/lib/folders-client";
import { SignInModal } from "@/components/features/auth/sign-in-modal";
import type { SaveFolder } from "@/types/domain";

type PendingAuthAction =
  | { kind: "like"; postId: string }
  | { kind: "save"; postId: string };

interface InteractionsState {
  isAuthed: boolean;
  isAdmin: boolean;
  userId: string | null;
  currentHandle: string | null;
  liked: ReadonlySet<string>;
  saved: ReadonlySet<string>;
  folders: readonly SaveFolder[];
  defaultFolderId: string | null;
  saveByPostId: ReadonlyMap<string, string>;
  pendingSavePostId: string | null;
  pickerPostId: string | null;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  openPickerForPost: (postId: string) => void;
  closePicker: () => void;
  cancelPendingSave: () => void;
  createFirstFolderAndSave: (name: string) => Promise<void>;
  addFolder: (name: string, makeDefault: boolean) => Promise<SaveFolder>;
  movePostToFolder: (postId: string, folderId: string) => Promise<void>;
  setDefaultFolderClient: (folderId: string) => void;
  removeFolderFromState: (folderId: string) => void;
  renameFolderInState: (folderId: string, name: string) => void;
}

const InteractionsContext = createContext<InteractionsState | null>(null);

interface Props {
  children: ReactNode;
  userId: string | null;
  currentHandle: string | null;
  isAdmin?: boolean;
  initialLikedIds: string[];
  initialSavedIds: string[];
  initialFolders?: SaveFolder[];
  initialSaveByPostId?: Record<string, string>;
}

export function InteractionsProvider({
  children,
  userId,
  currentHandle,
  isAdmin = false,
  initialLikedIds,
  initialSavedIds,
  initialFolders = [],
  initialSaveByPostId = {},
}: Props) {
  const [liked, setLiked] = useState<Set<string>>(() => new Set(initialLikedIds));
  const [saved, setSaved] = useState<Set<string>>(() => new Set(initialSavedIds));
  const [folders, setFolders] = useState<SaveFolder[]>(() => initialFolders);
  const [saveByPostId, setSaveByPostId] = useState<Map<string, string>>(
    () => new Map(Object.entries(initialSaveByPostId)),
  );
  const [pendingSavePostId, setPendingSavePostId] = useState<string | null>(
    null,
  );
  const [pickerPostId, setPickerPostId] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] =
    useState<PendingAuthAction | null>(null);

  const defaultFolderId = useMemo(
    () => folders.find((f) => f.is_default)?.id ?? null,
    [folders],
  );

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!userId) {
        setPendingAuthAction({ kind: "like", postId });
        setSignInOpen(true);
        return;
      }
      const wasLiked = liked.has(postId);
      const next = new Set(liked);
      if (wasLiked) next.delete(postId);
      else next.add(postId);
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

  const insertSave = useCallback(
    async (postId: string, folderId: string, folderName: string) => {
      if (!userId) return;
      const prevSaved = saved;
      const prevMap = saveByPostId;
      const nextSaved = new Set(saved);
      nextSaved.add(postId);
      const nextMap = new Map(saveByPostId);
      nextMap.set(postId, folderId);
      setSaved(nextSaved);
      setSaveByPostId(nextMap);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("post_saves")
          .insert({ post_id: postId, user_id: userId, folder_id: folderId });
        if (error) throw error;
        toast.success(`Saved to ${folderName}`, {
          duration: 4500,
          action: {
            label: "Change",
            onClick: () => setPickerPostId(postId),
          },
        });
      } catch (e) {
        setSaved(prevSaved);
        setSaveByPostId(prevMap);
        toast.error(e instanceof Error ? e.message : "Could not save");
      }
    },
    [saved, saveByPostId, userId],
  );

  const removeSave = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const prevSaved = saved;
      const prevMap = saveByPostId;
      const nextSaved = new Set(saved);
      nextSaved.delete(postId);
      const nextMap = new Map(saveByPostId);
      nextMap.delete(postId);
      setSaved(nextSaved);
      setSaveByPostId(nextMap);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("post_saves")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
        if (error) throw error;
        toast("Removed from saved");
      } catch (e) {
        setSaved(prevSaved);
        setSaveByPostId(prevMap);
        toast.error(e instanceof Error ? e.message : "Could not remove");
      }
    },
    [saved, saveByPostId, userId],
  );

  const toggleSave = useCallback(
    async (postId: string) => {
      if (!userId) {
        setPendingAuthAction({ kind: "save", postId });
        setSignInOpen(true);
        return;
      }
      if (saved.has(postId)) {
        await removeSave(postId);
        return;
      }
      const target = folders.find((f) => f.is_default) ?? folders[0] ?? null;
      if (!target) {
        setPendingSavePostId(postId);
        return;
      }
      await insertSave(postId, target.id, target.name);
    },
    [userId, saved, folders, insertSave, removeSave],
  );

  const cancelPendingSave = useCallback(() => {
    setPendingSavePostId(null);
  }, []);

  const toggleLikeRef = useRef(toggleLike);
  const toggleSaveRef = useRef(toggleSave);
  useEffect(() => {
    toggleLikeRef.current = toggleLike;
  }, [toggleLike]);
  useEffect(() => {
    toggleSaveRef.current = toggleSave;
  }, [toggleSave]);

  const prevUserIdRef = useRef<string | null>(userId);
  useEffect(() => {
    const justSignedIn = !prevUserIdRef.current && Boolean(userId);
    prevUserIdRef.current = userId;
    if (!justSignedIn || !pendingAuthAction) return;
    const action = pendingAuthAction;
    setPendingAuthAction(null);
    setSignInOpen(false);
    if (action.kind === "like") {
      void toggleLikeRef.current(action.postId);
    } else {
      void toggleSaveRef.current(action.postId);
    }
  }, [userId, pendingAuthAction]);

  const closeSignInModal = useCallback(() => {
    setSignInOpen(false);
    setPendingAuthAction(null);
  }, []);

  const closePicker = useCallback(() => {
    setPickerPostId(null);
  }, []);

  const openPickerForPost = useCallback((postId: string) => {
    setPickerPostId(postId);
  }, []);

  const addFolder = useCallback(
    async (name: string, makeDefault: boolean) => {
      if (!userId) throw new Error("Sign in required.");
      const created = await createFolder(userId, name, makeDefault);
      setFolders((prev) => {
        const cleared = makeDefault
          ? prev.map((f) => ({ ...f, is_default: false }))
          : prev;
        return [created, ...cleared];
      });
      return created;
    },
    [userId],
  );

  const createFirstFolderAndSave = useCallback(
    async (name: string) => {
      if (!userId) return;
      if (!pendingSavePostId) return;
      const created = await addFolder(name, true);
      const postId = pendingSavePostId;
      setPendingSavePostId(null);
      await insertSave(postId, created.id, created.name);
    },
    [userId, pendingSavePostId, addFolder, insertSave],
  );

  const movePostToFolder = useCallback(
    async (postId: string, folderId: string) => {
      if (!userId) return;
      const prev = saveByPostId;
      const next = new Map(saveByPostId);
      next.set(postId, folderId);
      setSaveByPostId(next);
      try {
        await moveSaveToFolder(userId, postId, folderId);
        const folder = folders.find((f) => f.id === folderId);
        toast.success(`Moved to ${folder?.name ?? "folder"}`);
      } catch (e) {
        setSaveByPostId(prev);
        toast.error(e instanceof Error ? e.message : "Could not move");
      }
    },
    [userId, saveByPostId, folders],
  );

  const setDefaultFolderClient = useCallback((folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => ({ ...f, is_default: f.id === folderId })),
    );
  }, []);

  const removeFolderFromState = useCallback((folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setSaveByPostId((prevMap) => {
      // Compute the next map AND apply the same removal to `saved` from the
      // exact same snapshot, avoiding the stale-closure bug where `saved` was
      // computed from an outer-scope `saveByPostId`.
      const droppedPostIds: string[] = [];
      const nextMap = new Map(prevMap);
      for (const [postId, fId] of prevMap) {
        if (fId === folderId) {
          nextMap.delete(postId);
          droppedPostIds.push(postId);
        }
      }
      if (droppedPostIds.length > 0) {
        setSaved((prevSaved) => {
          const nextSaved = new Set(prevSaved);
          for (const postId of droppedPostIds) nextSaved.delete(postId);
          return nextSaved;
        });
      }
      return nextMap;
    });
  }, []);

  const renameFolderInState = useCallback((folderId: string, name: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name } : f)),
    );
  }, []);

  const value = useMemo<InteractionsState>(
    () => ({
      isAuthed: Boolean(userId),
      isAdmin,
      userId,
      currentHandle,
      liked,
      saved,
      folders,
      defaultFolderId,
      saveByPostId,
      pendingSavePostId,
      pickerPostId,
      toggleLike,
      toggleSave,
      openPickerForPost,
      closePicker,
      cancelPendingSave,
      createFirstFolderAndSave,
      addFolder,
      movePostToFolder,
      setDefaultFolderClient,
      removeFolderFromState,
      renameFolderInState,
    }),
    [
      userId,
      isAdmin,
      currentHandle,
      liked,
      saved,
      folders,
      defaultFolderId,
      saveByPostId,
      pendingSavePostId,
      pickerPostId,
      toggleLike,
      toggleSave,
      openPickerForPost,
      closePicker,
      cancelPendingSave,
      createFirstFolderAndSave,
      addFolder,
      movePostToFolder,
      setDefaultFolderClient,
      removeFolderFromState,
      renameFolderInState,
    ],
  );

  return (
    <InteractionsContext.Provider value={value}>
      {children}
      <SignInModal
        open={signInOpen}
        onClose={closeSignInModal}
        onSignedIn={() => setSignInOpen(false)}
      />
    </InteractionsContext.Provider>
  );
}

const noopAsync = async () => {};

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
      folders: [],
      defaultFolderId: null,
      saveByPostId: new Map(),
      pendingSavePostId: null,
      pickerPostId: null,
      toggleLike: noopAsync,
      toggleSave: noopAsync,
      openPickerForPost: () => {},
      closePicker: () => {},
      cancelPendingSave: () => {},
      createFirstFolderAndSave: noopAsync,
      addFolder: async () => {
        throw new Error("Sign in required.");
      },
      movePostToFolder: noopAsync,
      setDefaultFolderClient: () => {},
      removeFolderFromState: () => {},
      renameFolderInState: () => {},
    };
  }
  return ctx;
}
