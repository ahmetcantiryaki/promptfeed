"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      toast.success("Password updated");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-8 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex flex-col gap-3 text-[13px] text-text-muted">
        <div className="rounded-[8px] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-600">
          This reset link is invalid or has expired. Request a new one.
        </div>
        <Link
          href="/forgot-password"
          className="self-center text-[12px] font-medium text-text hover:underline"
        >
          Send a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-text" strokeWidth={1.6} />
        <div className="text-[15px] font-semibold text-text">
          Password updated
        </div>
        <p className="text-[13px] text-text-muted">
          Taking you to the app&hellip;
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field
        label="New password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        minLength={10}
        required
      />
      <Field
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        minLength={10}
        required
      />
      <p className="-mt-1 text-[11px] text-text-subtle">
        At least 10 characters with letters and numbers.
      </p>
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
        Update password
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}

function Field({
  label,
  value,
  onChange,
  required,
  autoComplete,
  minLength,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-text-muted">{label}</span>
      <input
        type="password"
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border bg-surface px-3.5 py-2.5 text-[14px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none"
      />
    </label>
  );
}
