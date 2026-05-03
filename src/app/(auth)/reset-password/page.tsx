import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
  alternates: { canonical: "/reset-password" },
};

export default function ResetPasswordPage() {
  return (
    <>
      <header className="mb-5 flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="text-[13px] text-text-muted">
          Choose a strong password you haven&apos;t used before.
        </p>
      </header>
      <ResetPasswordForm />
    </>
  );
}
