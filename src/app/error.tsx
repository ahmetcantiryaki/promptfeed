"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6 py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-500">
          <AlertTriangle className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight">
          Something went wrong
        </h2>
        <p className="text-[13px] text-text-muted">
          We hit an unexpected error. You can try again, or head back to the
          feed.
        </p>
        {error.digest ? (
          <p className="text-[11px] text-text-subtle">
            Reference: <code>{error.digest}</code>
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-[10px] border bg-surface px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
