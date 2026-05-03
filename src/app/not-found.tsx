import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/ui/logo-mark";

export const metadata: Metadata = {
  title: "404 — Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 py-12">
      <div className="flex w-full max-w-[440px] flex-col items-center text-center">
        <Link
          href="/"
          aria-label="PromptFeed"
          className="mb-8 inline-flex items-center justify-center"
        >
          <LogoMark height={32} />
        </Link>

        <div className="select-none font-mono text-[88px] font-bold leading-none tracking-tight text-text">
          404
        </div>

        <h1 className="mt-3 text-[20px] font-semibold tracking-tight text-text">
          Page not found
        </h1>
        <p className="mt-2 text-[13px] leading-[1.6] text-text-muted">
          The prompt or page you&apos;re looking for doesn&apos;t exist or has
          been moved. Try heading back to discover.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90"
          >
            <Compass className="h-4 w-4" strokeWidth={2} />
            Discover prompts
          </Link>
          <Link
            href="/?sort=top"
            className="inline-flex items-center gap-1.5 rounded-[10px] border bg-surface px-4 py-2.5 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Top liked
          </Link>
        </div>
      </div>
    </div>
  );
}
