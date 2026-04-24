"use client";

import { useEffect, useState } from "react";

export function useLocalFlag(
  key: string,
): [boolean, () => void, boolean] {
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      setOn(localStorage.getItem(key) === "1");
    } catch {
      /* noop */
    }
    setMounted(true);
  }, [key]);

  function toggle() {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  }

  return [on, toggle, mounted];
}
