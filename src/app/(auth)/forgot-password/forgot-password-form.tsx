"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-text" strokeWidth={1.6} />
        <div className="text-[15px] font-semibold text-text">
          Check your email
        </div>
        <p className="text-[13px] text-text-muted">
          If <b>{email}</b> is associated with an account, you&apos;ll receive a
          password reset link shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-text-muted">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="rounded-[10px] border bg-surface px-3.5 py-2.5 text-[14px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none"
        />
      </label>
      {error ? (
        <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2.5 text-[14px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Send reset link
      </button>
    </form>
  );
}
