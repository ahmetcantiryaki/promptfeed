import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";
import { getCurrentUser } from "@/lib/supabase/auth";

export const metadata = {
  title: "Create account — PromptFeed",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <>
      <header className="mb-5 flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-[13px] text-text-muted">
          Free. No credit card. Start discovering prompts in a minute.
        </p>
      </header>
      <RegisterForm />
      <p className="mt-5 text-center text-[13px] text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-text hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
