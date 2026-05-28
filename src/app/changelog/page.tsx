import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  CHANGELOG,
  formatDateline,
  formatIssueNumber,
  itemLabel,
  type ChangelogEntry,
  type ItemKind,
} from "@/lib/changelog";

const ACCENT = "#E63946";
const INK = "#0A0A0A";
const PAPER = "#F5F1E8";

export const metadata: Metadata = {
  // Title and description tuned to the social-card sweet spot
  // (title 50–60 chars, description 110–160 chars). The OG image is
  // resolved automatically from opengraph-image.tsx co-located with
  // this page — no manual `images` field needed.
  title: "Dispatch — what shipped on Feedlens.ai",
  description:
    "The Feedlens dispatch. Every release of the AI image prompt discovery feed, written like it matters — what changed, why, and what's next on the desk.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "Feedlens Dispatch — every release of the AI prompt feed",
    description:
      "Issue-by-issue release notes for Feedlens.ai — the AI image prompt discovery feed. Editorially curated, monospaced where it counts, illustrated where it matters.",
    type: "article",
    url: "/changelog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Feedlens Dispatch — every release of the AI prompt feed",
    description:
      "Issue-by-issue release notes for Feedlens.ai — the AI image prompt discovery feed. Editorially curated, monospaced where it counts.",
  },
};

export default function ChangelogPage() {
  return (
    <>
      <PaperGrain />

      <main className="relative mx-auto w-full max-w-[920px] px-6 pb-32 pt-10 sm:px-10 lg:px-12">
        <Masthead />

        <SectionLabel>From the desk</SectionLabel>

        <div className="mt-10 flex flex-col">
          {CHANGELOG.map((entry, index) => (
            <Dispatch
              key={entry.issue}
              entry={entry}
              delayIndex={index}
              isLead={index === 0}
            />
          ))}
        </div>

        <Colophon />
      </main>

      <style>{`
        @keyframes pf-cl-rise {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pf-cl-rise { animation: pf-cl-rise 720ms cubic-bezier(0.16, 1, 0.3, 1) backwards; }
      `}</style>
    </>
  );
}

function Masthead() {
  return (
    <header
      className="relative flex items-center justify-between border-y-2 py-4"
      style={{ borderColor: INK }}
    >
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em]"
      >
        <ArrowLeft
          className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
          strokeWidth={2}
        />
        Feedlens
      </Link>
      <div
        className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70"
        aria-hidden="true"
      >
        ✦ &nbsp; The Dispatch &nbsp; ✦
      </div>
      <div className="font-mono text-[11px] uppercase tracking-[0.18em]">
        Vol. I
      </div>
    </header>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-12 flex items-center gap-3 sm:mt-16">
      <span
        aria-hidden="true"
        className="inline-block h-[2px] w-8"
        style={{ backgroundColor: INK }}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-70">
        {children}
      </span>
    </div>
  );
}

function Dispatch({
  entry,
  delayIndex,
  isLead,
}: {
  entry: ChangelogEntry;
  delayIndex: number;
  isLead: boolean;
}) {
  const delayMs = 80 + delayIndex * 90;
  return (
    <article
      id={`v${entry.version.replace(/\./g, "-")}`}
      className="pf-cl-rise group relative border-t-2 py-12 first:pt-0 first:border-t-0 sm:py-16"
      style={{
        borderColor: INK,
        animationDelay: `${delayMs}ms`,
      }}
    >
      {/* Hero block — version sits as the title; date + issue mark live as
          one small-caps meta line beneath. Stacking guarantees alignment
          where a side-by-side baseline mix never quite settled. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div
            className="leading-[0.95] tracking-[-0.025em]"
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontStyle: "italic",
              fontWeight: 900,
              fontSize: isLead
                ? "clamp(40px, 5vw, 52px)"
                : "clamp(32px, 4vw, 44px)",
            }}
          >
            v{entry.version}
          </div>
          {isLead ? (
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.26em]"
              style={{ color: ACCENT }}
            >
              <span
                aria-hidden="true"
                className="inline-block h-[5px] w-[5px] rounded-full"
                style={{ backgroundColor: ACCENT }}
              />
              The latest
            </span>
          ) : null}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.22em]">
          <span>{formatDateline(entry.date)}</span>
          <span
            aria-hidden="true"
            className="mx-2 inline-block"
            style={{ opacity: 0.35 }}
          >
            ·
          </span>
          <span style={{ opacity: 0.6 }}>
            №&nbsp;{formatIssueNumber(entry.issue)}
          </span>
        </div>
      </div>

      <p
        className="mt-7 font-mono text-[13.5px] leading-[1.78] sm:text-[14px]"
        style={{ fontFeatureSettings: "'liga' 1, 'calt' 1" }}
      >
        {entry.body}
      </p>

      {entry.items.length > 0 ? (
        <ul className="mt-7 flex flex-col gap-2.5">
          {entry.items.map((item, i) => (
            <DispatchItem key={i} kind={item.kind} text={item.text} />
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function DispatchItem({ kind, text }: { kind: ItemKind; text: string }) {
  const dotColor =
    kind === "new" ? ACCENT : kind === "improved" ? INK : "transparent";
  return (
    <li
      className="flex items-start gap-3 border-t pt-2.5"
      style={{ borderColor: "rgba(10,10,10,0.18)" }}
    >
      <span
        aria-hidden="true"
        className="mt-[7px] inline-block h-[7px] w-[7px] shrink-0 rounded-full"
        style={{
          backgroundColor: dotColor,
          border: kind === "fixed" ? `1px dashed ${INK}` : "none",
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
        <span
          className="shrink-0 font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{
            color: kind === "new" ? ACCENT : INK,
            opacity: kind === "new" ? 1 : 0.78,
          }}
        >
          {itemLabel(kind)}
        </span>
        <span className="font-mono text-[13px] leading-[1.55] sm:text-[13.5px]">
          {text}
        </span>
      </div>
    </li>
  );
}

function Colophon() {
  return (
    <footer
      className="mt-24 flex flex-col items-start justify-between gap-6 border-t-2 pt-6 sm:flex-row sm:items-end"
      style={{ borderColor: INK }}
    >
      <div className="flex flex-col gap-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
          Colophon
        </div>
        <p
          className="max-w-[44ch] text-[16px] italic leading-[1.5]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Set in Fraunces &amp; JetBrains Mono. Edited on the desk at Feedlens.
          The dispatch updates when something ships worth telling about.
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Link
          href="/"
          className="group inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] underline decoration-[1px] underline-offset-4 hover:opacity-70"
        >
          Return to the feed
          <ArrowUpRight
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={2}
          />
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
          © Feedlens.ai
        </span>
      </div>
    </footer>
  );
}

function PaperGrain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.18] mix-blend-multiply"
      style={{ backgroundColor: PAPER }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <filter id="pf-cl-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.86"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.65 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#pf-cl-grain)" />
      </svg>
    </div>
  );
}
