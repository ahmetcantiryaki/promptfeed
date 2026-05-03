interface LogoMarkProps {
  height?: number;
  className?: string;
}

const LOGO_RATIO = 523 / 109;

export function LogoMark({ height = 36, className }: LogoMarkProps) {
  const width = Math.round(height * LOGO_RATIO);
  return (
    <span
      aria-label="PromptFeed"
      role="img"
      className={className}
      style={{ display: "inline-flex", lineHeight: 0, width, height }}
    >
      <style>{`
        .pf-logo-light { display: inline-block; }
        .pf-logo-dark { display: none; }
        [data-theme="dark"] .pf-logo-light { display: none; }
        [data-theme="dark"] .pf-logo-dark { display: inline-block; }
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
    </span>
  );
}
