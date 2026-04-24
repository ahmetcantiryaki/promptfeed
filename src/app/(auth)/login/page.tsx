import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCurrentUser } from "@/lib/supabase/auth";

export const metadata = {
  title: "Sign in — PromptFeed",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <>
      <header className="mb-5 flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight">Welcome back</h1>
        <p className="text-[13px] text-text-muted">
          Sign in to curate your feed and save prompts.
        </p>
      </header>
      <LoginForm />
      <div className="mt-3 text-center text-[12px]">
        <Link
          href="/forgot-password"
          className="text-text-muted hover:text-text hover:underline"
        >
          Forgot your password?
        </Link>
      </div>
      <p className="mt-4 text-center text-[13px] text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-text hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
