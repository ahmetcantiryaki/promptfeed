"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import type { PostSort } from "@/types/domain";

export type FeedView = "feed" | "saved";

export interface FeedFilterState {
  model?: string;
  platform?: string;
  sort: PostSort;
  view: FeedView;
  folder?: string;
}

export interface FeedFilterContextValue {
  state: FeedFilterState;
  setFilter: (patch: Partial<FeedFilterState>) => void;
  clearFilters: () => void;
}

const FeedFilterContext = createContext<FeedFilterContextValue | null>(null);

function readUrlState(
  search: URLSearchParams | string | null,
): FeedFilterState {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search ?? "");
  return {
    model: params.get("model") ?? undefined,
    platform: params.get("platform") ?? undefined,
    sort: params.get("sort") === "top" ? "top" : "newest",
    view: params.get("view") === "saved" ? "saved" : "feed",
    folder: params.get("folder") ?? undefined,
  };
}

function buildSearch(state: FeedFilterState): string {
  const params = new URLSearchParams();
  if (state.model) params.set("model", state.model);
  if (state.platform) params.set("platform", state.platform);
  if (state.sort === "top") params.set("sort", "top");
  if (state.view === "saved") params.set("view", "saved");
  if (state.folder) params.set("folder", state.folder);
  return params.toString();
}

interface ProviderProps {
  children: ReactNode;
}

export function FeedFilterProvider({ children }: ProviderProps) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<FeedFilterState>(() =>
    readUrlState(searchParams),
  );

  // Re-sync if user uses browser back/forward
  useEffect(() => {
    const onPop = () => {
      setState(readUrlState(window.location.search));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const writeUrl = useCallback((next: FeedFilterState) => {
    const qs = buildSearch(next);
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (url !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", url);
    }
  }, []);

  const setFilter = useCallback(
    (patch: Partial<FeedFilterState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        // Switching away from saved view also drops the folder.
        if (patch.view !== undefined && next.view !== "saved") {
          next.folder = undefined;
        }
        // Switching into saved view: drop feed-only filters.
        if (next.view === "saved") {
          next.model = undefined;
          next.platform = undefined;
          next.sort = "newest";
        }
        writeUrl(next);
        return next;
      });
    },
    [writeUrl],
  );

  const clearFilters = useCallback(() => {
    const next: FeedFilterState = { sort: "newest", view: "feed" };
    setState(next);
    writeUrl(next);
  }, [writeUrl]);

  const value = useMemo(
    () => ({ state, setFilter, clearFilters }),
    [state, setFilter, clearFilters],
  );

  return (
    <FeedFilterContext.Provider value={value}>
      {children}
    </FeedFilterContext.Provider>
  );
}

export function useFeedFilter(): FeedFilterContextValue {
  const ctx = useContext(FeedFilterContext);
  if (!ctx) {
    throw new Error("useFeedFilter must be used within FeedFilterProvider");
  }
  return ctx;
}
