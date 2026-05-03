"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "./actions";

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
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/reset-password`
          : "";
      const result = await requestPasswordReset(email, redirectTo);
      if (result.success) {
        setSent(true);
        return;
      }
      switch (result.error) {
        case "invalid_email":
          setError("Please enter a valid email address.");
          break;
        case "rate_limited":
          setError("Too many attempts. Please try again in a few minutes.");
          break;
        default:
          setError(
            result.message ?? "Could not send reset link. Please try again.",
          );
      }
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
          We&apos;ve sent a password reset link to <b>{email}</b>.
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
