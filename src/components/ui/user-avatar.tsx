"use client";

import dynamic from "next/dynamic";
import { User as UserIcon } from "lucide-react";
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

  const iconSize = Math.round(size * 0.55);
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: "50%",
        background: "var(--surface-2)",
        color: "var(--text-muted)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
        flexShrink: 0,
        boxSizing: "border-box",
      }}
      aria-label={email ?? "user"}
    >
      <UserIcon
        width={iconSize}
        height={iconSize}
        strokeWidth={1.8}
        style={{ display: "block", width: iconSize, height: iconSize }}
      />
    </div>
  );
}
