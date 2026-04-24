import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Forgot password — PromptFeed",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <header className="mb-5 flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-[13px] text-text-muted">
          Enter your account email. We&apos;ll send you a reset link.
        </p>
      </header>
      <ForgotPasswordForm />
      <p className="mt-5 text-center text-[13px] text-text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-text hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
