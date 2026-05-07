"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Bookmark, Heart } from "lucide-react";
import type { Model, Platform } from "@/types/domain";
import { LogoMark } from "@/components/ui/logo-mark";
import { ModelBadge } from "@/lib/model-icon";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { cn, formatCount } from "@/lib/utils";
import {
  useFeedFilter,
  type FeedFilterState,
} from "@/components/providers/feed-filter-provider";
import { useInteractions } from "@/components/providers/interactions-provider";

function OtherBadge({ size = 20 }: { size?: number }) {
  return <PlatformBadge platform="web" size={size} />;
}

export type SidebarRoute = "discover" | "liked" | "saved" | null;
export type SidebarVariant = "rail" | "drawer";

interface SidebarProps {
  models: Model[];
  platforms: Platform[];
  savedCount?: number;
  likedCount?: number;
}

interface SidebarBodyProps extends SidebarProps {
  variant?: SidebarVariant;
}

function deriveActiveRoute(
  pathname: string,
  state: FeedFilterState,
): SidebarRoute {
  if (pathname !== "/") return null;
  if (state.view === "saved") return "saved";
  if (state.view === "liked") return "liked";
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
    key: "liked",
    label: "Liked",
    Icon: Heart,
    href: "/?view=liked",
    patch: { view: "liked", folder: undefined },
    authOnly: true,
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

/**
 * Static desktop sidebar rail (≥lg). Below lg the drawer renders
 * <SidebarBody variant="drawer"> instead.
 */
export function Sidebar({
  models,
  platforms,
  savedCount,
  likedCount,
}: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 overflow-hidden border-r bg-surface lg:block">
      <SidebarBody
        models={models}
        platforms={platforms}
        savedCount={savedCount}
        likedCount={likedCount}
        variant="rail"
      />
    </aside>
  );
}

export function SidebarBody({
  models,
  platforms,
  savedCount,
  likedCount,
  variant = "rail",
}: SidebarBodyProps) {
  const pathname = usePathname();
  const { state, setFilter } = useFeedFilter();
  const {
    isAuthed,
    liked,
    saved,
    requestSignInForNav,
  } = useInteractions();
  // Live counts: prefer client-side state once authed so toggling like/save
  // updates the badge immediately. Falls back to SSR-passed props for the
  // initial render of anonymous users.
  const liveLikedCount = isAuthed ? liked.size : likedCount;
  const liveSavedCount = isAuthed ? saved.size : savedCount;
  const activeRoute = deriveActiveRoute(pathname ?? "/", state);
  const isHomePath = (pathname ?? "/") === "/";
  const isDrawer = variant === "drawer";

  // Both rail and drawer own their own padding and vertical scroll so the
  // body component is fully self-contained.
  const containerClass =
    "flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-3 py-4";

  const itemPaddingY = isDrawer ? "py-2.5" : "py-[7px]";

  return (
    <div className={containerClass}>
      <Link
        href="/"
        aria-label="Feedlens.ai"
        className="flex items-center justify-center px-2 py-0.5"
      >
        <LogoMark height={27} width={126} className="shrink-0" />
      </Link>

      <nav className="flex flex-col gap-0.5">
        {MAIN_NAV.map(({ key, label, Icon, href, patch, authOnly }) => {
          const active = activeRoute === key;
          const count =
            key === "saved"
              ? liveSavedCount
              : key === "liked"
                ? liveLikedCount
                : undefined;
          const requiresAuth = Boolean(authOnly) && !isAuthed;
          return (
            <FilterNavItem
              key={key}
              href={href}
              isHomePath={isHomePath}
              active={active}
              onSelect={() => setFilter(patch)}
              gateAuth={requiresAuth}
              onGatedAuth={() => requestSignInForNav(href)}
              className={cn(
                "flex items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] transition-colors",
                itemPaddingY,
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
        itemPaddingY={itemPaddingY}
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
        itemPaddingY={itemPaddingY}
        onPick={(slug) =>
          setFilter({
            view: "feed",
            platform: state.platform === slug ? undefined : slug,
          })
        }
      />

      <footer
        className={cn(
          "mt-auto border-t px-2 text-[12px] text-text-subtle",
          isDrawer ? "pt-3" : "pt-2.5",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center",
            isDrawer ? "min-h-10 py-2" : "",
          )}
        >
          © {new Date().getFullYear()} Feedlens.ai
        </span>
      </footer>
    </div>
  );
}

interface FilterNavItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** When true, click is intercepted and dispatches state without navigation. */
  isHomePath: boolean;
  active: boolean;
  onSelect: () => void;
  /** When true, click opens the sign-in dialog instead of navigating. */
  gateAuth?: boolean;
  onGatedAuth?: () => void;
  children: React.ReactNode;
}

function FilterNavItem({
  href,
  isHomePath,
  active,
  onSelect,
  gateAuth = false,
  onGatedAuth,
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
        if (gateAuth) {
          e.preventDefault();
          onGatedAuth?.();
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
  itemPaddingY,
  onPick,
}: {
  items: ModelItem[];
  activeSlug?: string;
  isHomePath: boolean;
  itemPaddingY: string;
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
            className={cn(
              "flex items-center gap-2.5 rounded-[6px] px-2.5 text-[14px] font-medium text-text-subtle transition-colors hover:bg-hover hover:text-text data-[active=true]:bg-surface-2 data-[active=true]:font-semibold data-[active=true]:text-text",
              itemPaddingY,
            )}
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
  itemPaddingY,
  onPick,
}: {
  platforms: Platform[];
  activeSlug?: string;
  isHomePath: boolean;
  itemPaddingY: string;
  onPick: (slug: string) => void;
}) {
  const list: Platform[] = platforms;
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
            className={cn(
              "flex items-center gap-2.5 rounded-[6px] px-2.5 text-[14px] font-medium text-text-subtle transition-colors hover:bg-hover hover:text-text data-[active=true]:bg-surface-2 data-[active=true]:font-semibold data-[active=true]:text-text",
              itemPaddingY,
            )}
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
