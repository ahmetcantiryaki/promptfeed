import { Ban, Mail, LogOut } from "lucide-react";

const APPEAL_EMAIL = "ahmetcan.1855@gmail.com";

export function BannedScreen() {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="banned-title"
      aria-describedby="banned-desc"
      className="fixed inset-0 z-[200] grid min-h-screen w-screen place-items-center overflow-y-auto bg-black/85 px-6 py-12 backdrop-blur-md"
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-[18px] border border-red-500/30 bg-surface shadow-2xl">
        <div className="flex flex-col items-center gap-3 border-b border-red-500/20 bg-red-500/5 px-6 py-7 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-red-500/40 bg-red-500/15 text-red-500">
            <Ban className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="flex flex-col gap-1">
            <h1
              id="banned-title"
              className="text-[18px] font-semibold tracking-tight text-text"
            >
              Your account is suspended
            </h1>
            <p
              id="banned-desc"
              className="text-[13px] leading-[1.55] text-text-muted"
            >
              You can&apos;t perform any actions on Feedlens.ai. This decision
              was made under our community guidelines.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="rounded-[12px] border bg-surface-2/40 px-4 py-3.5 text-[13px] leading-[1.6] text-text-muted">
            If you&apos;d like to appeal the ban, send us an email at the
            address below explaining your case. Each appeal is reviewed by
            hand — we&apos;ll get back to you as soon as we can.
          </div>

          <a
            href={`mailto:${APPEAL_EMAIL}?subject=${encodeURIComponent(
              "Feedlens.ai — Ban appeal",
            )}`}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-accent bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90"
          >
            <Mail className="h-4 w-4" strokeWidth={2} />
            {APPEAL_EMAIL}
          </a>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] border bg-surface px-4 py-2 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
