interface LogoMarkProps {
  height?: number;
  /** Optional explicit width. Falls back to height * intrinsic ratio. */
  width?: number;
  className?: string;
  /** Disable the dark-mode shimmer sweep. Default: enabled. */
  noShimmer?: boolean;
}

const LOGO_RATIO = 523 / 109;

export function LogoMark({
  height = 36,
  width: widthProp,
  className,
  noShimmer = false,
}: LogoMarkProps) {
  const width = widthProp ?? Math.round(height * LOGO_RATIO);
  return (
    <span
      aria-label="Feedlens.ai"
      role="img"
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        lineHeight: 0,
        width,
        height,
      }}
    >
      <style>{`
        .pf-logo-light { display: inline-block; }
        .pf-logo-dark { display: none; }
        [data-theme="dark"] .pf-logo-light { display: none; }
        [data-theme="dark"] .pf-logo-dark { display: inline-block; }

        /* Dim the dark-mode logo a touch so the shimmer pass reads as a
           visible "bright sweep" of the saturated white peak. */
        [data-theme="dark"] .pf-logo-dark {
          opacity: 0.72;
        }

        .pf-logo-shimmer { display: none; }
        [data-theme="dark"] .pf-logo-shimmer {
          display: block;
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            110deg,
            rgba(255, 255, 255, 0) 35%,
            rgba(255, 255, 255, 1) 50%,
            rgba(255, 255, 255, 0) 65%
          );
          background-size: 220% 100%;
          background-repeat: no-repeat;
          -webkit-mask-image: url("/logos/logo-white.svg");
                  mask-image: url("/logos/logo-white.svg");
          -webkit-mask-repeat: no-repeat;
                  mask-repeat: no-repeat;
          -webkit-mask-size: 100% 100%;
                  mask-size: 100% 100%;
          animation: pf-logo-shimmer 2.8s linear infinite;
          will-change: background-position;
        }
        @keyframes pf-logo-shimmer {
          0%   { background-position: 220% 0; }
          60%  { background-position: -120% 0; }
          100% { background-position: -120% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-theme="dark"] .pf-logo-shimmer { animation: none; opacity: 0; }
        }
      `}</style>
      <img
        src="/logos/logo-black.svg"
        alt=""
        width={width}
        height={height}
        className="pf-logo-light"
      />
      <img
        src="/logos/logo-white.svg"
        alt=""
        width={width}
        height={height}
        className="pf-logo-dark"
      />
      {noShimmer ? null : <span className="pf-logo-shimmer" aria-hidden="true" />}
    </span>
  );
}
