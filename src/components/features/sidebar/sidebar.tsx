"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Bookmark } from "lucide-react";
import type { Model, Platform } from "@/types/domain";
import { LogoMark } from "@/components/ui/logo-mark";
import { ModelBadge } from "@/lib/model-icon";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { cn, formatCount } from "@/lib/utils";
import {
  useFeedFilter,
  type FeedFilterState,
} from "@/components/providers/feed-filter-provider";

function OtherBadge({ size = 20 }: { size?: number }) {
  return <PlatformBadge platform="other" size={size} />;
}

export type SidebarRoute = "discover" | "saved" | null;

interface SidebarProps {
  models: Model[];
  platforms: Platform[];
  savedCount?: number;
}

function deriveActiveRoute(
  pathname: string,
  state: FeedFilterState,
): SidebarRoute {
  if (pathname !== "/") return null;
  if (state.view === "saved") return "saved";
  if (
    state.view === "feed" &&
    !state.model &&
    !state.platform &&
    state.sort === "newest"
  ) {
    return "discover";
  }
  return null;
}

interface NavEntry {
  key: Exclude<SidebarRoute, null>;
  label: string;
  Icon: typeof Compass;
  href: string;
  patch: Partial<FeedFilterState>;
  authOnly?: boolean;
}

const MAIN_NAV: NavEntry[] = [
  {
    key: "discover",
    label: "Discover",
    Icon: Compass,
    href: "/",
    patch: { view: "feed", model: undefined, platform: undefined, sort: "newest", folder: undefined },
  },
  {
    key: "saved",
    label: "Saved",
    Icon: Bookmark,
    href: "/?view=saved",
    patch: { view: "saved", folder: undefined },
    authOnly: true,
  },
];

export function Sidebar({
  models,
  platforms,
  savedCount,
}: SidebarProps) {
  const pathname = usePathname();
  const { state, setFilter } = useFeedFilter();
  const activeRoute = deriveActiveRoute(pathname ?? "/", state);
  const isHomePath = (pathname ?? "/") === "/";

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-4 overflow-hidden border-r bg-surface px-3 py-4">
      <Link
        href="/"
        aria-label="Feedlens.ai"
        className="flex items-center justify-center px-2 py-0.5"
      >
        <LogoMark height={27} width={126} className="shrink-0" />
      </Link>

      <nav className="flex flex-col gap-0.5">
        {MAIN_NAV.map(({ key, label, Icon, href, patch }) => {
          const active = activeRoute === key;
          const count = key === "saved" ? savedCount : undefined;
          return (
            <FilterNavItem
              key={key}
              href={href}
              isHomePath={isHomePath}
              active={active}
              onSelect={() => setFilter(patch)}
              className={cn(
                "flex items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[14px] transition-colors",
                active
                  ? "bg-surface-2 font-medium text-text"
                  : "text-text-muted hover:bg-hover hover:text-text",
              )}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
              <span className="flex-1">{label}</span>
              {count !== undefined && count > 0 ? (
                <span className="tabular-nums text-[11px] font-medium text-text-subtle">
                  {formatCount(count)}
                </span>
              ) : null}
            </FilterNavItem>
          );
        })}
      </nav>

      <ModelsList
        items={models.map((m) => ({
          slug: m.slug,
          name: m.name,
          count: m.post_count,
        }))}
        activeSlug={state.view === "feed" ? state.model : undefined}
        isHomePath={isHomePath}
        onPick={(slug) =>
          setFilter({
            view: "feed",
            model: state.model === slug ? undefined : slug,
          })
        }
      />

      <PlatformsList
        platforms={platforms}
        activeSlug={state.view === "feed" ? state.platform : undefined}
        isHomePath={isHomePath}
        onPick={(slug) =>
          setFilter({
            view: "feed",
            platform: state.platform === slug ? undefined : slug,
          })
        }
      />

      <footer className="mt-auto flex items-center gap-3 border-t px-2 pt-2.5 text-[11px] text-text-subtle">
        <a href="#" className="hover:text-text">Help</a>
        <a href="#" className="hover:text-text">Privacy</a>
        <a href="#" className="hover:text-text">Terms</a>
      </footer>
    </aside>
  );
}

interface FilterNavItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** When true, click is intercepted and dispatches state without navigation. */
  isHomePath: boolean;
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

function FilterNavItem({
  href,
  isHomePath,
  active,
  onSelect,
  children,
  className,
  ...rest
}: FilterNavItemProps) {
  return (
    <a
      {...rest}
      href={href}
      aria-current={active ? "page" : undefined}
      className={className}
      onClick={(e) => {
        // Allow cmd/ctrl/middle-click open-in-new-tab
        if (
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          e.button !== 0
        ) {
          return;
        }
        if (!isHomePath) return; // let real navigation happen
        e.preventDefault();
        onSelect();
      }}
    >
      {children}
    </a>
  );
}

interface ModelItem {
  slug: string;
  name: string;
  count: number;
}

function ModelsList({
  items,
  activeSlug,
  isHomePath,
  onPick,
}: {
  items: ModelItem[];
  activeSlug?: string;
  isHomePath: boolean;
  onPick: (slug: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
        Models
      </div>
      {items.map((it) => {
        const active = it.slug === activeSlug;
        const href = active ? "/" : `/?model=${it.slug}`;
        return (
          <FilterNavItem
            key={it.slug}
            href={href}
            isHomePath={isHomePath}
            active={active}
            onSelect={() => onPick(it.slug)}
            data-active={active ? "true" : undefined}
            className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-[14px] font-medium text-text-subtle transition-colors hover:bg-hover hover:text-text data-[active=true]:bg-surface-2 data-[active=true]:font-semibold data-[active=true]:text-text"
          >
            {it.slug === "other" ? (
              <OtherBadge size={20} />
            ) : (
              <ModelBadge slug={it.slug} size={20} />
            )}
            <span className="flex-1 truncate">{it.name}</span>
            <span className="tabular-nums text-[11px] font-medium text-text-subtle">
              {formatCount(it.count)}
            </span>
          </FilterNavItem>
        );
      })}
    </div>
  );
}

function PlatformsList({
  platforms,
  activeSlug,
  isHomePath,
  onPick,
}: {
  platforms: Platform[];
  activeSlug?: string;
  isHomePath: boolean;
  onPick: (slug: string) => void;
}) {
  const hasOther = platforms.some((p) => p.slug === "other");
  const list: Platform[] = hasOther
    ? platforms
    : [
        ...platforms,
        {
          slug: "other",
          name: "Web",
          post_count: 0,
          created_at: new Date(0).toISOString(),
          icon_url: null,
        },
      ];
  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
        Platforms
      </div>
      {list.map((p) => {
        const active = p.slug === activeSlug;
        const href = active ? "/" : `/?platform=${p.slug}`;
        return (
          <FilterNavItem
            key={p.slug}
            href={href}
            isHomePath={isHomePath}
            active={active}
            onSelect={() => onPick(p.slug)}
            data-active={active ? "true" : undefined}
            className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-[14px] font-medium text-text-subtle transition-colors hover:bg-hover hover:text-text data-[active=true]:bg-surface-2 data-[active=true]:font-semibold data-[active=true]:text-text"
          >
            {isPlatformSlug(p.slug) ? (
              <PlatformBadge platform={p.slug} size={20} />
            ) : (
              <span className="h-[20px] w-[20px] rounded-[5px] bg-surface-2" />
            )}
            <span className="flex-1 truncate">{p.name}</span>
            <span className="tabular-nums text-[11px] font-medium text-text-subtle">
              {formatCount(p.post_count)}
            </span>
          </FilterNavItem>
        );
      })}
    </div>
  );
}
