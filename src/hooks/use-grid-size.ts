"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY_DESKTOP = "promptfeed.gridCols";
const STORAGE_KEY_MOBILE = "promptfeed.mobileGridCols";
const EVENT = "promptfeed:grid-size";
const DEFAULT_DESKTOP = 4;
const DEFAULT_MOBILE = 2;
const ALLOWED_DESKTOP: ReadonlySet<number> = new Set([2, 3, 4, 5]);
const ALLOWED_MOBILE: ReadonlySet<number> = new Set([1, 2]);

interface GridSize {
  cols: number;
  setCols: (n: number) => void;
  mobileCols: number;
  setMobileCols: (n: number) => void;
}

export function useGridSize(): GridSize {
  const [cols, setColsState] = useState<number>(DEFAULT_DESKTOP);
  const [mobileCols, setMobileColsState] = useState<number>(DEFAULT_MOBILE);

  useEffect(() => {
    const rawDesktop = localStorage.getItem(STORAGE_KEY_DESKTOP);
    const parsedDesktop = rawDesktop ? Number.parseInt(rawDesktop, 10) : NaN;
    if (Number.isFinite(parsedDesktop) && ALLOWED_DESKTOP.has(parsedDesktop)) {
      setColsState(parsedDesktop);
    }
    const rawMobile = localStorage.getItem(STORAGE_KEY_MOBILE);
    const parsedMobile = rawMobile ? Number.parseInt(rawMobile, 10) : NaN;
    if (Number.isFinite(parsedMobile) && ALLOWED_MOBILE.has(parsedMobile)) {
      setMobileColsState(parsedMobile);
    }
    function onCustom(e: Event) {
      const detail = (e as CustomEvent<{ desktop?: number; mobile?: number }>)
        .detail;
      if (detail?.desktop !== undefined && ALLOWED_DESKTOP.has(detail.desktop)) {
        setColsState(detail.desktop);
      }
      if (detail?.mobile !== undefined && ALLOWED_MOBILE.has(detail.mobile)) {
        setMobileColsState(detail.mobile);
      }
    }
    window.addEventListener(EVENT, onCustom);
    return () => window.removeEventListener(EVENT, onCustom);
  }, []);

  function setCols(n: number) {
    if (!ALLOWED_DESKTOP.has(n)) return;
    setColsState(n);
    localStorage.setItem(STORAGE_KEY_DESKTOP, String(n));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { desktop: n } }));
  }

  function setMobileCols(n: number) {
    if (!ALLOWED_MOBILE.has(n)) return;
    setMobileColsState(n);
    localStorage.setItem(STORAGE_KEY_MOBILE, String(n));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { mobile: n } }));
  }

  return { cols, setCols, mobileCols, setMobileCols };
}
