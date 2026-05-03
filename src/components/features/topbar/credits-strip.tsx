import { Fragment } from "react";

interface Creator {
  handle: string;
  url: string;
}

const CREATORS: Creator[] = [
  { handle: "@eyupyusufa", url: "https://x.com/eyupyusufa" },
  { handle: "@ahmetcantryk", url: "https://x.com/ahmetcantryk" },
];

/**
 * "Created by @handle · @handle" — clean, text-only, minimal hover.
 * Each handle is a link that softly shifts color and draws an underline
 * animation on hover. No background swap, no icons.
 */
export function CreditsStrip() {
  return (
    <div className="flex min-w-0 items-center gap-2 text-[13px]">
      <span className="shrink-0 font-semibold tracking-tight text-text">
        Created by
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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

function CreditLink({ handle, url }: Creator) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${handle} on X`}
      className="group relative inline-block text-[13px] font-medium text-text-muted transition-colors duration-200 ease-out hover:text-text"
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
