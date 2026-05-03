"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Pencil,
  ShieldCheck,
  LogOut,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

/* ---------------- Account ---------------- */

interface AccountProps {
  email: string;
  displayName: string | null;
  handle: string | null;
  bio: string | null;
  onEditProfile: () => void;
}

export function AccountPanel({
  email,
  displayName,
  handle,
  bio,
  onEditProfile,
}: AccountProps) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h3 className="text-[15px] font-semibold text-text">Profile</h3>
        <p className="mt-0.5 text-[12px] text-text-muted">
          How other Feedlens.ai members see you.
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoRow label="Email" value={email} />
        <InfoRow label="Handle" value={handle ? `@${handle}` : "—"} />
        <InfoRow label="Display name" value={displayName ?? "—"} />
        <InfoRow label="Bio" value={bio ?? "—"} />
      </dl>

      <div className="flex items-center gap-2 border-t pt-4">
        <button
          type="button"
          onClick={onEditProfile}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          Edit profile & avatar
        </button>
        <p className="text-[11px] text-text-subtle">
          Opens the profile editor with avatar, socials, and bio.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-[10px] border bg-surface-2/40 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        {label}
      </dt>
      <dd className="truncate text-[13px] font-medium text-text">{value}</dd>
    </div>
  );
}

/* ---------------- Password ---------------- */

export function PasswordPanel() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const currentEmail = userData.user?.email;
      if (!currentEmail) throw new Error("Not signed in.");
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: current,
      });
      if (reauthError) {
        setError("Current password is incorrect.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h3 className="text-[15px] font-semibold text-text">Change password</h3>
        <p className="mt-0.5 text-[12px] text-text-muted">
          Enter your current password, then pick a new one (at least 8
          characters).
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label="Current password"
          type="password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="New password"
            type="password"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            minLength={8}
          />
          <Field
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        {error ? (
          <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
            {error}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-1.5 text-[11px] text-text-subtle">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
            Changing password re-verifies your session.
          </div>
          <button
            type="submit"
            disabled={loading || !current || !next || !confirm}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update password
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Recovery ---------------- */

export function RecoveryPanel({ email }: { email: string }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast("Signed out");
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function sendReset() {
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
      if (err) throw err;
      toast.success(`Reset link sent to ${email}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  const confirmOk = typed === email;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h3 className="text-[15px] font-semibold text-text">Recovery</h3>
        <p className="mt-0.5 text-[12px] text-text-muted">
          Email-based recovery and active session management.
        </p>
      </header>

      <section className="flex flex-col gap-2 rounded-[10px] border bg-surface-2/40 p-4">
        <div className="flex items-center gap-2">
          <MailCheck className="h-4 w-4 text-text-muted" strokeWidth={1.8} />
          <div className="text-[13px] font-semibold text-text">
            Email me a reset link
          </div>
        </div>
        <p className="text-[12px] text-text-muted">
          We&apos;ll send a one-time password reset link to <b>{email}</b>.
        </p>
        <button
          type="button"
          onClick={sendReset}
          disabled={loading}
          className="inline-flex w-fit items-center gap-1.5 rounded-[10px] border bg-surface px-3 py-1.5 text-[12px] font-medium text-text transition-colors hover:bg-hover disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Send reset email
        </button>
      </section>

      <section className="flex flex-col gap-2 rounded-[10px] border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-2">
          <LogOut className="h-4 w-4 text-red-500" strokeWidth={1.8} />
          <div className="text-[13px] font-semibold text-red-500">
            Sign out of all devices
          </div>
        </div>
        <p className="text-[12px] text-text-muted">
          Type your email <b>{email}</b> below to confirm.
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={email}
          className="w-full rounded-[10px] border bg-surface px-3 py-2 text-[13px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none"
        />
        <button
          type="button"
          onClick={signOut}
          disabled={!confirmOk || loading}
          className="inline-flex w-fit items-center gap-1.5 rounded-[10px] border border-red-500 bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Sign out everywhere
        </button>
      </section>

      {error ? (
        <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        className="rounded-[10px] border bg-surface px-3.5 py-2.5 text-[14px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none"
      />
    </label>
  );
}
