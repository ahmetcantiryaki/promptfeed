import type { ReactNode } from "react";

/**
 * Palette-locked editorial wrapper. The changelog deliberately steps out of
 * the main app's theme system (no dark mode toggle, no bg-bg variable) so
 * the page reads as a separate publication regardless of user preference.
 */
export default function ChangelogLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="light"
      className="relative min-h-[100dvh] bg-[#F5F1E8] text-[#0A0A0A] [font-feature-settings:'ss01','ss02','liga']"
    >
      {children}
    </div>
  );
}
