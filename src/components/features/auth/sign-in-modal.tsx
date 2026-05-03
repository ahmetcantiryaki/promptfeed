"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { registerAction } from "@/app/(auth)/register/actions";
import { requestPasswordReset } from "@/app/(auth)/forgot-password/actions";

type View = "signin" | "register" | "forgot";

interface Props {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}

export function SignInModal({ open, onClose, onSignedIn }: Props) {
  const [view, setView] = useState<View>("signin");

  useEffect(() => {
    if (open) setView("signin");
  }, [open]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[210] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border bg-surface shadow-2xl outline-none"
        >
          <Dialog.Title className="sr-only">Sign in to Feedlens.ai</Dialog.Title>
          <Header view={view} onBack={() => setView("signin")} onClose={onClose} />

          {view === "signin" ? (
            <SignInView
              onSignedIn={onSignedIn}
              onForgot={() => setView("forgot")}
              onRegister={() => setView("register")}
            />
          ) : view === "register" ? (
            <RegisterView
              onSignedIn={onSignedIn}
              onSignIn={() => setView("signin")}
            />
          ) : (
            <ForgotView onSignIn={() => setView("signin")} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Header({
  view,
  onBack,
  onClose,
}: {
  view: View;
  onBack: () => void;
  onClose: () => void;
}) {
  const titles: Record<View, { title: string; sub: string }> = {
    signin: {
      title: "Sign in to continue",
      sub: "We'll finish what you started right after.",
    },
    register: {
      title: "Create your account",
      sub: "Save and remix prompts in seconds.",
    },
    forgot: {
      title: "Reset your password",
      sub: "We'll email you a reset link.",
    },
  };
  const t = titles[view];
  const showBack = view !== "signin";
  return (
    <div className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
      <div className="flex min-w-0 items-start gap-2">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mt-0.5 rounded-full p-1 text-text-muted transition-colors hover:bg-hover hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          </button>
        ) : null}
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-tight">
            {t.title}
          </div>
          <div className="mt-0.5 text-[12px] text-text-muted">{t.sub}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="rounded-full p-1 text-text-muted transition-colors hover:bg-hover hover:text-text"
      >
        <X className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}

function SignInView({
  onSignedIn,
  onForgot,
  onRegister,
}: {
  onSignedIn: () => void;
  onForgot: () => void;
  onRegister: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      onSignedIn();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
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
          autoComplete="current-password"
          required
        />
        {error ? <ErrorBox message={error} /> : null}
        <SubmitButton loading={loading} label="Sign in" />
        <button
          type="button"
          onClick={onForgot}
          className="text-center text-[12px] text-text-muted hover:text-text hover:underline"
        >
          Forgot your password?
        </button>
      </form>
      <FooterSwap
        prompt="Don't have an account?"
        actionLabel="Create one"
        onAction={onRegister}
      />
    </>
  );
}

function RegisterView({
  onSignedIn,
  onSignIn,
}: {
  onSignedIn: () => void;
  onSignIn: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

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
        setSentTo(email);
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
      onSignedIn();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-text" strokeWidth={1.6} />
        <div className="text-[15px] font-semibold text-text">
          Check your email
        </div>
        <p className="text-[13px] text-text-muted">
          We&apos;ve sent a confirmation link to <b>{sentTo}</b>. Click it to
          activate your account, then come back to sign in.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="mt-2 text-[12px] font-medium text-text-muted hover:text-text hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
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
          minLength={10}
          required
        />
        <p className="-mt-1 text-[11px] text-text-subtle">
          At least 10 characters with letters and numbers.
        </p>
        {error ? <ErrorBox message={error} /> : null}
        <SubmitButton loading={loading} label="Create account" />
      </form>
      <FooterSwap
        prompt="Already have an account?"
        actionLabel="Sign in"
        onAction={onSignIn}
      />
    </>
  );
}

function ForgotView({ onSignIn }: { onSignIn: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
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
      <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-text" strokeWidth={1.6} />
        <div className="text-[15px] font-semibold text-text">
          Check your email
        </div>
        <p className="text-[13px] text-text-muted">
          We&apos;ve sent a password reset link to <b>{email}</b>.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="mt-2 text-[12px] font-medium text-text-muted hover:text-text hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      {error ? <ErrorBox message={error} /> : null}
      <SubmitButton loading={loading} label="Send reset link" />
    </form>
  );
}

function FooterSwap({
  prompt,
  actionLabel,
  onAction,
}: {
  prompt: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="border-t bg-surface-2/40 px-5 py-3 text-center text-[12px] text-text-muted">
      {prompt}{" "}
      <button
        type="button"
        onClick={onAction}
        className="font-medium text-text hover:underline"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
      {message}
    </div>
  );
}

function SubmitButton({
  loading,
  label,
}: {
  loading: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2.5 text-[14px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  );
}

interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}

function Field({
  label,
  type,
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
        type={type}
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
