"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "promptfeed.gridCols";
const EVENT = "promptfeed:grid-size";
const DEFAULT = 4;
const ALLOWED: ReadonlySet<number> = new Set([2, 3, 4, 5]);

export function useGridSize(): { cols: number; setCols: (n: number) => void } {
  const [cols, setColsState] = useState<number>(DEFAULT);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && ALLOWED.has(parsed)) {
      setColsState(parsed);
    }
    function onCustom(e: Event) {
      const detail = (e as CustomEvent<{ cols: number }>).detail;
      if (detail && ALLOWED.has(detail.cols)) setColsState(detail.cols);
    }
    window.addEventListener(EVENT, onCustom);
    return () => window.removeEventListener(EVENT, onCustom);
  }, []);

  function setCols(n: number) {
    if (!ALLOWED.has(n)) return;
    setColsState(n);
    localStorage.setItem(STORAGE_KEY, String(n));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { cols: n } }));
  }

  return { cols, setCols };
}
