"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { registerAction } from "./actions";
import { GoogleButton } from "@/components/features/auth/google-button";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;
      const result = await registerAction(email, password, redirectTo);
      if (!result.ok) {
        setError(result.error ?? "Could not create account.");
        return;
      }
      if (result.needsConfirmation) {
        setConfirmationEmail(email);
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      toast.success("Welcome to Feedlens.ai");
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (confirmationEmail) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-text" strokeWidth={1.6} />
        <div className="text-[15px] font-semibold text-text">
          Check your email
        </div>
        <p className="text-[13px] text-text-muted">
          We&apos;ve sent a confirmation link to <b>{confirmationEmail}</b>.
          Click it to activate your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        required
        minLength={10}
      />
      <p className="-mt-1 text-[12px] text-text-subtle sm:text-[11px]">
        At least 10 characters with letters and numbers.
      </p>
      {error ? (
        <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
          {error}
        </div>
      ) : null}
      <div className="mt-1 flex flex-col gap-3">
        <GoogleButton text="signup_with" next="/" />
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-text-subtle">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-1 inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2.5 text-[14px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:min-h-10"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Create account
      </button>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  autoComplete,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-text-muted">{label}</span>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-[10px] border bg-surface px-3.5 py-2.5 text-[14px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none sm:min-h-10"
      />
    </label>
  );
}
