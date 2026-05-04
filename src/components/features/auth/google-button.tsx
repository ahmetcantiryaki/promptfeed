"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

interface GoogleButtonProps {
  label?: string;
  /**
   * Path to land on after OAuth completes. When omitted, falls back to the
   * current pathname (useful in modals so the user returns where they were).
   */
  next?: string;
}

const POPUP_W = 480;
const POPUP_H = 640;

interface OAuthMessage {
  type: "feedlens:oauth";
  success: boolean;
  error?: string;
}

function isOAuthMessage(d: unknown): d is OAuthMessage {
  if (!d || typeof d !== "object") return false;
  const r = d as Record<string, unknown>;
  return r.type === "feedlens:oauth" && typeof r.success === "boolean";
}

/**
 * Triggers Supabase OAuth with Google in a popup window. The user never
 * leaves the current page — the popup hits /auth/callback?popup=1 which
 * exchanges the code for a session cookie, posts a message back, and closes
 * itself. We listen for the message and reload to pick up the new session.
 *
 * Falls back to a full-page redirect if the popup is blocked.
 */
export function GoogleButton({
  label = "Continue with Google",
  next,
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Make sure listeners and intervals don't leak if the component unmounts
  // while the popup is still open.
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  async function onClick() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const target =
        next ?? `${window.location.pathname}${window.location.search}`;
      const safeNext = target.startsWith("/") ? target : "/";
      const redirectTo = `${origin}/auth/callback?popup=1&next=${encodeURIComponent(safeNext)}`;

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (authError || !data?.url) {
        setError(authError?.message ?? "Could not start Google sign-in.");
        setLoading(false);
        return;
      }

      const left = Math.max(0, window.screenX + (window.outerWidth - POPUP_W) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - POPUP_H) / 2);
      const popup = window.open(
        data.url,
        "feedlens-oauth",
        `width=${POPUP_W},height=${POPUP_H},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
      );

      if (!popup) {
        // Pop-up blocked — fallback to a normal redirect.
        window.location.href = data.url;
        return;
      }

      function onMessage(e: MessageEvent) {
        if (e.origin !== origin) return;
        if (!isOAuthMessage(e.data)) return;
        cleanup();
        if (e.data.success) {
          // Hard reload so server-rendered components see the new session.
          window.location.reload();
        } else {
          setError(e.data.error ?? "Sign-in failed.");
          setLoading(false);
        }
      }

      const interval = window.setInterval(() => {
        if (popup.closed) {
          // User closed the popup without completing — clear the loader.
          cleanup();
          setLoading(false);
        }
      }, 600);

      function cleanup() {
        window.removeEventListener("message", onMessage);
        window.clearInterval(interval);
      }

      cleanupRef.current = cleanup;
      window.addEventListener("message", onMessage);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Could not start Google sign-in.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-[10px] border bg-surface px-4 py-2.5 text-[14px] font-medium text-text transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleGlyph className="h-4 w-4" />
        )}
        {label}
      </button>
      {error ? (
        <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.3 36 44 30.5 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
