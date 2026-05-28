"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Bookmark, Heart, X } from "lucide-react";
import type { Model, Platform, Tag, TagAxis, TagsByAxis } from "@/types/domain";
import { TAG_AXES, TAG_AXIS_LABEL } from "@/types/domain";
import { LogoMark } from "@/components/ui/logo-mark";
import { ModelBadge } from "@/lib/model-icon";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { cn, formatCount } from "@/lib/utils";
import {
  useFeedFilter,
  type FeedFilterState,
} from "@/components/providers/feed-filter-provider";
import { useInteractions } from "@/components/providers/interactions-provider";
import { buildCategoryUrl } from "@/lib/category-url";

function OtherBadge({ size = 20 }: { size?: number }) {
  return <PlatformBadge platform="web" size={size} />;
}

export type SidebarRoute = "discover" | "liked" | "saved" | null;
export type SidebarVariant = "rail" | "drawer";

interface SidebarProps {
  models: Model[];
  platforms: Platform[];
  tagsByAxis: TagsByAxis;
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
  if (state.view === "saved") return "saved";
  if (state.view === "liked") return "liked";
  if (
    pathname === "/" &&
    state.view === "feed" &&
    !state.model &&
    !state.platform &&
    state.sort === "newest" &&
    !state.q
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
  authOnly?: boolean;
}

const MAIN_NAV: NavEntry[] = [
  { key: "discover", label: "Discover", Icon: Compass, href: "/" },
  { key: "liked", label: "Liked", Icon: Heart, href: "/?view=liked", authOnly: true },
  { key: "saved", label: "Saved", Icon: Bookmark, href: "/?view=saved", authOnly: true },
];

/**
 * Static desktop sidebar rail (≥lg). Below lg the drawer renders
 * <SidebarBody variant="drawer"> instead.
 */
export function Sidebar({
  models,
  platforms,
  tagsByAxis,
  savedCount,
  likedCount,
}: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 overflow-hidden border-r bg-surface lg:block">
      <SidebarBody
        models={models}
        platforms={platforms}
        tagsByAxis={tagsByAxis}
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
  tagsByAxis,
  savedCount,
  likedCount,
  variant = "rail",
}: SidebarBodyProps) {
  const pathname = usePathname();
  const { state } = useFeedFilter();
  const { isAuthed, liked, saved, requestSignInForNav } = useInteractions();
  // Live counts: prefer client-side state once authed so toggling like/save
  // updates the badge immediately. Falls back to SSR-passed props for the
  // initial render of anonymous users.
  const liveLikedCount = isAuthed ? liked.size : likedCount;
  const liveSavedCount = isAuthed ? saved.size : savedCount;
  const activeRoute = deriveActiveRoute(pathname ?? "/", state);
  const isDrawer = variant === "drawer";

  const containerClass =
    "flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-3 py-4";
  const itemPaddingY = isDrawer ? "py-2.5" : "py-[7px]";

  // The currently-active path filter — used both for highlighting AND for
  // building "preserve the other axis" links (e.g. clicking a model while
  // a platform is already filtered keeps that platform).
  const activeModel = state.view === "feed" ? state.model : undefined;
  const activePlatform = state.view === "feed" ? state.platform : undefined;
  const activeTags = state.view === "feed" ? state.tags : [];
  const activeSort = state.view === "feed" ? state.sort : "newest";
  const activeQ = state.view === "feed" ? state.q : undefined;
  const activeTagSet = new Set(activeTags);

  function modelHref(slug: string): string {
    const isActive = activeModel === slug;
    return buildCategoryUrl({
      view: "feed",
      model: isActive ? undefined : slug,
      platform: activePlatform,
      tags: activeTags,
      sort: activeSort,
      q: activeQ,
    });
  }

  function platformHref(slug: string): string {
    const isActive = activePlatform === slug;
    return buildCategoryUrl({
      view: "feed",
      model: activeModel,
      platform: isActive ? undefined : slug,
      tags: activeTags,
      sort: activeSort,
      q: activeQ,
    });
  }

  /**
   * Toggle a tag in the active set — clicking an inactive tag adds it,
   * clicking an active tag removes it. The URL preserves model/platform/sort/q
   * so users can stack filters (e.g. midjourney + photoreal + portrait).
   */
  function tagHref(slug: string): string {
    const isActive = activeTagSet.has(slug);
    const nextTags = isActive
      ? activeTags.filter((s) => s !== slug)
      : [...activeTags, slug];
    return buildCategoryUrl({
      view: "feed",
      model: activeModel,
      platform: activePlatform,
      tags: nextTags,
      sort: activeSort,
      q: activeQ,
    });
  }

  /** URL with every selected tag stripped (model/platform/sort/q kept). */
  const clearAllTagsHref = buildCategoryUrl({
    view: "feed",
    model: activeModel,
    platform: activePlatform,
    tags: [],
    sort: activeSort,
    q: activeQ,
  });

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
        {MAIN_NAV.map(({ key, label, Icon, href, authOnly }) => {
          const active = activeRoute === key;
          const count =
            key === "saved"
              ? liveSavedCount
              : key === "liked"
                ? liveLikedCount
                : undefined;
          const requiresAuth = Boolean(authOnly) && !isAuthed;
          return (
            <NavItem
              key={key}
              href={href}
              active={active}
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
            </NavItem>
          );
        })}
      </nav>

      <ModelsList
        items={models.map((m) => ({
          slug: m.slug,
          name: m.name,
          count: m.post_count,
        }))}
        activeSlug={activeModel}
        itemPaddingY={itemPaddingY}
        buildHref={modelHref}
      />

      <PlatformsList
        platforms={platforms}
        activeSlug={activePlatform}
        itemPaddingY={itemPaddingY}
        buildHref={platformHref}
      />

      <TagsList
        tagsByAxis={tagsByAxis}
        activeTags={activeTagSet}
        buildHref={tagHref}
        clearAllHref={clearAllTagsHref}
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

interface NavItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string;
  active: boolean;
  gateAuth?: boolean;
  onGatedAuth?: () => void;
  children: React.ReactNode;
}

function NavItem({
  href,
  active,
  gateAuth = false,
  onGatedAuth,
  children,
  className,
  ...rest
}: NavItemProps) {
  return (
    <Link
      {...rest}
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={className}
      onClick={(e) => {
        // Respect open-in-new-tab modifiers.
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
        }
      }}
    >
      {children}
    </Link>
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
  itemPaddingY,
  buildHref,
}: {
  items: ModelItem[];
  activeSlug?: string;
  itemPaddingY: string;
  buildHref: (slug: string) => string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
        Models
      </div>
      {items.map((it) => {
        const active = it.slug === activeSlug;
        return (
          <NavItem
            key={it.slug}
            href={buildHref(it.slug)}
            active={active}
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
          </NavItem>
        );
      })}
    </div>
  );
}

interface TagsListProps {
  tagsByAxis: TagsByAxis;
  activeTags: ReadonlySet<string>;
  buildHref: (slug: string) => string;
  clearAllHref: string;
}

/**
 * Compact tag taxonomy block. Three axes (Subject / Style / Use case)
 * collapse into a horizontal tab switcher — only one axis's chip grid is
 * visible at a time, keeping the sidebar's vertical footprint flat
 * regardless of how the taxonomy grows.
 *
 * Selected tags surface ABOVE the tabs as removable chips so users always
 * see what's filtering them, even when browsing a different axis.
 */
function TagsList({
  tagsByAxis,
  activeTags,
  buildHref,
  clearAllHref,
}: TagsListProps) {
  const [axisTab, setAxisTab] = useState<TagAxis>("subject");
  const items = tagsByAxis[axisTab];

  const allTagsBySlug = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const axis of TAG_AXES) {
      for (const tag of tagsByAxis[axis]) map.set(tag.slug, tag);
    }
    return map;
  }, [tagsByAxis]);

  const selectedChips = useMemo(() => {
    const list: Tag[] = [];
    for (const slug of activeTags) {
      const tag = allTagsBySlug.get(slug);
      if (tag) list.push(tag);
    }
    return list;
  }, [activeTags, allTagsBySlug]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
          Tags
        </span>
        {selectedChips.length > 0 ? (
          <Link
            href={clearAllHref}
            prefetch
            className="text-[10px] font-medium text-text-subtle hover:text-text"
          >
            Clear ({selectedChips.length})
          </Link>
        ) : null}
      </div>

      {/* Active tag chips — always visible while any are selected, regardless
          of which axis tab is currently open. Click strips that one tag. */}
      {selectedChips.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-2">
          {selectedChips.map((tag) => (
            <Link
              key={tag.slug}
              href={buildHref(tag.slug)}
              prefetch
              className="group inline-flex items-center gap-1 rounded-full border border-text bg-text px-2 py-[2px] text-[10.5px] font-semibold leading-none text-surface hover:opacity-90"
              title={`Remove ${tag.name}`}
            >
              <span>{tag.name}</span>
              <X className="h-2.5 w-2.5 opacity-80" strokeWidth={2.5} />
            </Link>
          ))}
        </div>
      ) : null}

      {/* Axis tab switcher — the only piece of "vertical chrome" the section
          adds. Underline marks the active axis; clicking swaps the chip grid
          beneath without affecting selection. */}
      <div
        role="tablist"
        aria-label="Tag axis"
        className="flex items-stretch border-b px-1"
      >
        {TAG_AXES.map((axis) => {
          const active = axisTab === axis;
          return (
            <button
              key={axis}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setAxisTab(axis)}
              className={cn(
                "relative flex-1 py-1.5 text-[11px] font-medium transition-colors",
                active
                  ? "text-text"
                  : "text-text-subtle hover:text-text-muted",
              )}
            >
              {TAG_AXIS_LABEL[axis]}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-text"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Chip grid — wraps inside the sidebar column. Active chips invert. */}
      <div className="flex flex-wrap gap-1 px-2">
        {items.map((tag) => {
          const active = activeTags.has(tag.slug);
          return (
            <Link
              key={tag.slug}
              href={buildHref(tag.slug)}
              prefetch
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-medium leading-none transition-colors",
                active
                  ? "border-text bg-text text-surface hover:opacity-90"
                  : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text",
              )}
            >
              <span>{tag.name}</span>
              <span
                className={cn(
                  "tabular-nums text-[9.5px] leading-none",
                  active ? "opacity-70" : "text-text-subtle",
                )}
              >
                {formatCount(tag.post_count)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PlatformsList({
  platforms,
  activeSlug,
  itemPaddingY,
  buildHref,
}: {
  platforms: Platform[];
  activeSlug?: string;
  itemPaddingY: string;
  buildHref: (slug: string) => string;
}) {
  const list: Platform[] = platforms;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
        Platforms
      </div>
      {list.map((p) => {
        const active = p.slug === activeSlug;
        return (
          <NavItem
            key={p.slug}
            href={buildHref(p.slug)}
            active={active}
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
          </NavItem>
        );
      })}
    </div>
  );
}
