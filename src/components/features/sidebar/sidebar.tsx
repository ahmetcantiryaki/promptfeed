import Link from "next/link";
import { Compass, Flame, Clock, Users, Bookmark } from "lucide-react";
import type { Model, Platform } from "@/types/domain";
import { BrandSquare } from "@/components/ui/brand-square";
import { modelVisual } from "@/lib/brand";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { cn, formatCount } from "@/lib/utils";

export type SidebarRoute =
  | "discover"
  | "trending"
  | "recent"
  | "saved"
  | "following"
  | null;

interface SidebarProps {
  models: Model[];
  platforms: Platform[];
  activeModel?: string;
  activePlatform?: string;
  activeRoute: SidebarRoute;
  savedCount?: number;
  followingCount?: number;
}

interface NavEntry {
  key: Exclude<SidebarRoute, null>;
  href: string;
  label: string;
  Icon: typeof Compass;
  authOnly?: boolean;
}

const MAIN_NAV: NavEntry[] = [
  { key: "discover", href: "/", label: "Discover", Icon: Compass },
  { key: "trending", href: "/?sort=top", label: "Trending", Icon: Flame },
  { key: "recent", href: "/?sort=newest", label: "Recent", Icon: Clock },
  { key: "saved", href: "/?view=saved", label: "Saved", Icon: Bookmark, authOnly: true },
  { key: "following", href: "/?tab=following", label: "Following", Icon: Users, authOnly: true },
];

export function Sidebar({
  models,
  platforms,
  activeModel,
  activePlatform,
  activeRoute,
  savedCount,
  followingCount,
}: SidebarProps) {
  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-4 overflow-hidden border-r bg-surface px-3 py-4">
      <Link href="/" className="flex items-center gap-2.5 px-2 py-0.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-[16px] font-bold text-accent-fg">
          P
        </span>
        <span className="text-[16px] font-semibold tracking-tight">
          PromptFeed
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {MAIN_NAV.map(({ key, href, label, Icon }) => {
          const active = activeRoute === key;
          const count =
            key === "saved"
              ? savedCount
              : key === "following"
              ? followingCount
              : undefined;
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
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
            </Link>
          );
        })}
      </nav>

      <ModelsList
        items={models.map((m) => ({
          slug: m.slug,
          name: m.name,
          count: m.post_count,
          visual: modelVisual(m.slug),
        }))}
        activeSlug={activeModel}
      />

      <PlatformsList platforms={platforms} activeSlug={activePlatform} />

      <footer className="mt-auto flex items-center gap-3 border-t px-2 pt-2.5 text-[11px] text-text-subtle">
        <a href="#" className="hover:text-text">Help</a>
        <a href="#" className="hover:text-text">Privacy</a>
        <a href="#" className="hover:text-text">Terms</a>
      </footer>
    </aside>
  );
}

interface ModelItem {
  slug: string;
  name: string;
  count: number;
  visual: ReturnType<typeof modelVisual>;
}

function ModelsList({
  items,
  activeSlug,
}: {
  items: ModelItem[];
  activeSlug?: string;
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
          <Link
            key={it.slug}
            href={href}
            data-active={active ? "true" : undefined}
            className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-[14px] font-medium text-text-subtle transition-colors hover:bg-hover hover:text-text data-[active=true]:bg-surface-2 data-[active=true]:font-semibold data-[active=true]:text-text"
          >
            <BrandSquare visual={it.visual} size={20} />
            <span className="flex-1 truncate">{it.name}</span>
            <span className="tabular-nums text-[11px] font-medium text-text-subtle">
              {formatCount(it.count)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function PlatformsList({
  platforms,
  activeSlug,
}: {
  platforms: Platform[];
  activeSlug?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
        Platforms
      </div>
      {platforms.map((p) => {
        const active = p.slug === activeSlug;
        const href = active ? "/" : `/?platform=${p.slug}`;
        return (
          <Link
            key={p.slug}
            href={href}
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
          </Link>
        );
      })}
    </div>
  );
}
