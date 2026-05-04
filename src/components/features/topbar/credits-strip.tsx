import { Fragment, type ReactNode } from "react";
import { LogoMark } from "@/components/ui/logo-mark";

interface Creator {
  handle: string;
  url: string;
}

const CREATORS: Creator[] = [
  { handle: "@eyupyusufa", url: "https://x.com/eyupyusufa" },
  { handle: "@ahmetcantryk", url: "https://x.com/ahmetcantryk" },
];

/**
 * Desktop: "Created by @handle · @handle" text-only credits.
 * Below md the topbar uses <MobileLogoCredits /> instead, which alternates
 * between the logo and the credits inside a fixed-size container so that
 * right-side actions (theme toggle, sign-in/account) never shift.
 */
export function CreditsStrip() {
  return (
    <div className="hidden min-w-0 items-center gap-2 text-[13px] md:flex">
      <span className="hidden shrink-0 font-semibold tracking-tight text-text sm:inline">
        Created by
      </span>
      <div className="flex min-w-0 items-center gap-1.5 truncate">
        {CREATORS.map((c, i) => (
          <Fragment key={c.handle}>
            <CreditLink {...c} />
            {i < CREATORS.length - 1 ? (
              <span className="select-none text-text-subtle">·</span>
            ) : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * Mobile-only fixed-width centerpiece. Cycles vertically (always up) through
 * Logo → "Created by @eyupyusufa" → "Created by @ahmetcantryk" → Logo (loop
 * wrap). The container has a fixed height/width so right-side controls
 * (theme toggle, sign-in/account) never reflow.
 */
export function MobileLogoCredits() {
  return (
    <div
      aria-label="Feedlens.ai · Created by @eyupyusufa, @ahmetcantryk"
      className="relative h-5 w-[160px] max-w-full shrink overflow-hidden md:hidden"
    >
      <div className="pf-credit-rotate flex flex-col">
        <CenteredRow>
          <LogoMark height={16} />
        </CenteredRow>
        {CREATORS.map((c) => (
          <CenteredRow key={c.handle}>
            <span className="whitespace-nowrap text-[11px] leading-none">
              <span className="text-text-subtle">Created by </span>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-text transition-colors hover:text-text"
              >
                {c.handle}
              </a>
            </span>
          </CenteredRow>
        ))}
        {/* Duplicate first child to make the loop seamless when we snap from
            -75% back to 0. */}
        <CenteredRow>
          <LogoMark height={16} />
        </CenteredRow>
      </div>
    </div>
  );
}

function CenteredRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-5 shrink-0 items-center justify-start">
      {children}
    </div>
  );
}

function CreditLink({ handle, url }: Creator) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${handle} on X`}
      className="group relative inline-block max-w-[40vw] truncate text-[13px] font-medium text-text-muted transition-colors duration-200 ease-out hover:text-text sm:max-w-none"
    >
      <span className="relative">
        {handle}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100"
        />
      </span>
    </a>
  );
}
