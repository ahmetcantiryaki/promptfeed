"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

/**
 * Sign-in via Google Identity Services with Supabase `signInWithIdToken`.
 *
 * Flow: GIS popup → ID token → Supabase mints a session → page reloads or
 * navigates to `next`. The user never sees the `*.supabase.co` domain.
 *
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID to be set, the same Client ID added
 * under "Authorized Client IDs" in Supabase → Auth → Providers → Google.
 */
interface GoogleButtonProps {
  /** Visible Google button text variant. */
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  /** Path to land on after sign-in. Defaults to current pathname. */
  next?: string;
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GsiButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
  logo_alignment?: "left" | "center";
}

interface GsiInitConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  nonce?: string;
  auto_select?: boolean;
  use_fedcm_for_prompt?: boolean;
  ux_mode?: "popup" | "redirect";
}

interface GoogleAccountsId {
  initialize: (config: GsiInitConfig) => void;
  renderButton: (parent: HTMLElement, options: GsiButtonOptions) => void;
  prompt: () => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GIS can only load in the browser."));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services.")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface NoncePair {
  raw: string;
  hashed: string;
}

async function generateNonce(): Promise<NoncePair> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

export function GoogleButton({ text = "continue_with", next }: GoogleButtonProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError(
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Add it to .env.local.",
      );
      return;
    }
    if (!containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      try {
        await loadGisScript();
        if (cancelled || !window.google) return;

        const { raw, hashed } = await generateNonce();

        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashed,
          ux_mode: "popup",
          callback: async (response) => {
            setBusy(true);
            setError(null);
            try {
              const supabase = createClient();
              const { error: authError } =
                await supabase.auth.signInWithIdToken({
                  provider: "google",
                  token: response.credential,
                  nonce: raw,
                });
              if (authError) {
                setError(authError.message);
                setBusy(false);
                return;
              }
              const target =
                next ?? `${window.location.pathname}${window.location.search}`;
              const safe = target.startsWith("/") ? target : "/";
              // Hard reload so server-rendered layouts see the new session.
              window.location.assign(safe);
              router.refresh();
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Sign-in failed.");
              setBusy(false);
            }
          },
        });

        const width = Math.min(
          400,
          Math.max(240, container.clientWidth || 320),
        );

        // Clear any previously rendered button (e.g. from React strict mode).
        container.innerHTML = "";
        window.google.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width,
        });
        setReady(true);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : "Could not initialize Google sign-in.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text, next, router]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex min-h-[40px] items-center justify-center">
        <div
          ref={containerRef}
          className="flex w-full items-center justify-center"
          aria-busy={busy}
        />
        {!ready && !error ? (
          <Loader2 className="absolute h-4 w-4 animate-spin text-text-muted" />
        ) : null}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : null}
      </div>
      {error ? (
        <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
          {error}
        </div>
      ) : null}
    </div>
  );
}
