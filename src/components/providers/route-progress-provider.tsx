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

interface ProgressContextValue {
  start: () => void;
  done: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const TICK_MS = 180;
const TRICKLE_FACTOR = 0.06;
const PROGRESS_CAP = 0.88;

export function RouteProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const tickRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const pendingCount = useRef(0);

  const stopTick = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    stopTick();
    tickRef.current = window.setInterval(() => {
      setProgress((p) => Math.min(p + (PROGRESS_CAP - p) * TRICKLE_FACTOR, PROGRESS_CAP));
    }, TICK_MS);
  }, [stopTick]);

  const start = useCallback(() => {
    pendingCount.current += 1;
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    setActive(true);
    setProgress((p) => (p < 0.08 ? 0.08 : p));
    startTick();
  }, [startTick]);

  const done = useCallback(() => {
    pendingCount.current = Math.max(0, pendingCount.current - 1);
    if (pendingCount.current > 0) return;
    stopTick();
    setProgress(1);
    finishTimerRef.current = window.setTimeout(() => {
      setActive(false);
      setProgress(0);
      finishTimerRef.current = null;
    }, 280);
  }, [stopTick]);

  useEffect(() => {
    return () => {
      stopTick();
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current);
      }
    };
  }, [stopTick]);

  const value = useMemo(() => ({ start, done }), [start, done]);

  return (
    <ProgressContext.Provider value={value}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
      >
        <div
          className="h-full bg-gradient-to-r from-accent via-accent to-accent/40"
          style={{
            width: `${Math.round(progress * 100)}%`,
            opacity: active ? 1 : 0,
            transition: active
              ? "width 220ms ease-out, opacity 120ms"
              : "width 220ms ease-out, opacity 320ms 80ms",
            boxShadow: active
              ? "0 0 8px var(--accent), 0 0 4px var(--accent)"
              : "none",
          }}
        />
      </div>
      {children}
    </ProgressContext.Provider>
  );
}

export function useRouteProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    return { start: () => {}, done: () => {} };
  }
  return ctx;
}
