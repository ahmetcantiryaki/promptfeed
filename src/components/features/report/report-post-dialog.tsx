"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Flag, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

interface ReasonOption {
  value: string;
  label: string;
  description: string;
}

const REASONS: ReasonOption[] = [
  {
    value: "spam",
    label: "Spam or misleading",
    description: "Repetitive, off-topic, or promotional content.",
  },
  {
    value: "inappropriate",
    label: "Inappropriate content",
    description: "Violent, adult, or otherwise disturbing imagery.",
  },
  {
    value: "copyright",
    label: "Copyright",
    description: "An image or prompt used without permission.",
  },
  {
    value: "harassment",
    label: "Harassment or hate",
    description: "Content that attacks a person or group.",
  },
  {
    value: "other",
    label: "Other",
    description: "Tell us more below.",
  },
];

const ERROR_MESSAGES: Record<string, string> = {
  unauthenticated: "You need to sign in first.",
  banned: "Your account is suspended — you can't take this action.",
  reason_too_short: "Please add a bit more detail.",
  already_reported: "You've already reported this prompt.",
  rate_limited:
    "You've sent too many reports in the last 24 hours. Try again later.",
  post_not_found: "This prompt no longer exists.",
};

export function ReportPostDialog({ open, onOpenChange, postId }: Props) {
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("spam");
      setDetails("");
    }
  }, [open]);

  const composed = composeReason(reason, details);
  const canSubmit =
    !submitting && composed.trim().length >= 4 && composed.length <= 500;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, reason: composed }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const msg =
          ERROR_MESSAGES[json.error as string] ??
          "Couldn't send your report. Please try again.";
        toast.error(msg);
        return;
      }
      toast.success("Report received — our team will take a look.");
      onOpenChange(false);
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[90] flex max-h-[92vh] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border bg-surface shadow-2xl"
          aria-describedby="report-desc"
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="flex items-start gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-red-500/10 text-red-500">
                <Flag className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <Dialog.Title className="text-[15px] font-semibold tracking-tight">
                  Report this prompt
                </Dialog.Title>
                <p
                  id="report-desc"
                  className="mt-0.5 text-[12px] text-text-muted"
                >
                  Your report goes to our team. You can only report each prompt
                  once.
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                Reason
              </legend>
              <div className="flex flex-col gap-1">
                {REASONS.map((opt) => {
                  const active = reason === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2 transition-colors",
                        active
                          ? "border-accent/60 bg-accent/5"
                          : "border-border bg-surface hover:bg-hover",
                      )}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={opt.value}
                        checked={active}
                        onChange={() => setReason(opt.value)}
                        className="mt-[3px] h-3.5 w-3.5 cursor-pointer accent-accent"
                      />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-text">
                          {opt.label}
                        </span>
                        <span className="text-[11px] text-text-subtle">
                          {opt.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                Details <span className="text-text-subtle normal-case">(optional, up to 500 characters)</span>
              </span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                rows={4}
                placeholder="A short note for the review team…"
                className="resize-y rounded-[10px] border bg-surface-2 px-3 py-2 text-[13px] text-text placeholder:text-text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <span className="self-end text-[10px] tabular-nums text-text-subtle">
                {details.length} / 500
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t bg-surface-2/30 px-5 py-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[10px] border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-muted hover:bg-hover hover:text-text"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-red-500 bg-red-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Flag className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              Report
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function composeReason(reason: string, details: string): string {
  const trimmed = details.trim();
  if (!trimmed) return reason;
  return `${reason}: ${trimmed}`;
}
