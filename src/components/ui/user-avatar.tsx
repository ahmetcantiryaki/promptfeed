"use client";

import dynamic from "next/dynamic";
import type { AvatarConfig } from "@/types/domain";

const NiceAvatar = dynamic(() => import("react-nice-avatar"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-full bg-surface-2" />,
});

interface Props {
  config?: AvatarConfig | null;
  url?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}

function initials(email?: string | null): string {
  if (!email) return "U";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (local.slice(0, 2) || "U").toUpperCase();
}

export function UserAvatar({ config, url, email, size = 32, className }: Props) {
  if (url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={url}
        alt={email ?? "avatar"}
        width={size * 2}
        height={size * 2}
        decoding="async"
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          background: "var(--surface-2)",
        }}
      />
    );
  }

  if (config) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          background: config.bgColor ?? "var(--surface-2)",
          flexShrink: 0,
        }}
      >
        <NiceAvatar style={{ width: size, height: size }} {...config} />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--surface-2)",
        color: "var(--text)",
        display: "grid",
        placeItems: "center",
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials(email)}
    </div>
  );
}
