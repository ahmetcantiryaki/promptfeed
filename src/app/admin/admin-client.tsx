"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Flag,
  BarChart3,
  BadgeCheck,
  Ban,
  Search,
  Shield,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  ImagePlus,
  Pencil,
  Trash2,
  Wand2,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/ui/logo-mark";
import { TaxonomyPanel } from "@/components/features/admin/taxonomy-panel";
import type {
  ProfileRow,
  ProfileWithEmail,
  ReportRow,
  PlatformStats,
  TaxonomyData,
} from "@/lib/admin";
import type {
  Model,
  Platform,
  Post,
  Profile,
  SocialAccount,
} from "@/types/domain";
import { AddPromptDialog } from "@/components/features/add-prompt/add-prompt-dialog";
import { createClient } from "@/lib/supabase/browser";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import { deletePostWithToast } from "@/lib/admin-post-actions";
import { EditPostDialog } from "@/components/features/admin/edit-post-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { prettyModel, prettyPlatform } from "@/lib/labels";

interface Props {
  profile: Profile | null;
  profiles: ProfileWithEmail[];
  reports: ReportRow[];
  stats: PlatformStats;
  posts: Post[];
  taxonomy: TaxonomyData;
  userId: string;
  socials: SocialAccount[];
  models: Model[];
  platforms: Platform[];
}

type SectionKey = "stats" | "prompts" | "users" | "reports" | "taxonomy";

interface SectionEntry {
  key: SectionKey;
  label: string;
  description: string;
  Icon: typeof BarChart3;
}

const SECTIONS: SectionEntry[] = [
  {
    key: "stats",
    label: "Stats",
    description: "Platform pulse — users, prompts, engagement, reports.",
    Icon: BarChart3,
  },
  {
    key: "prompts",
    label: "Prompts",
    description: "Browse, edit and remove published prompts.",
    Icon: ImageIcon,
  },
  {
    key: "users",
    label: "Users",
    description: "Verify, ban, and manage member accounts.",
    Icon: Users,
  },
  {
    key: "reports",
    label: "Reports",
    description: "Review and act on flagged content.",
    Icon: Flag,
  },
  {
    key: "taxonomy",
    label: "Taxonomy",
    description: "Manage AI models and source platforms.",
    Icon: Tag,
  },
];

export function AdminClient({
  profile,
  profiles,
  reports,
  stats,
  posts,
  taxonomy,
  userId,
  socials,
  models,
  platforms,
}: Props) {
  const [section, setSection] = useState<SectionKey>("stats");
  const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0]!;

  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr]">
      <AdminSidebar
        section={section}
        onSectionChange={setSection}
        counts={{
          prompts: posts.length,
          users: profiles.length,
          openReports: stats.openReports,
        }}
      />

      <main className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between gap-3 border-b bg-surface px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-surface-2 text-text-muted">
              <current.Icon className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="flex flex-col leading-tight">
              <h1 className="text-[15px] font-semibold tracking-tight text-text">
                {current.label}
              </h1>
              <span className="text-[11px] text-text-subtle">
                {current.description}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile?.handle ? (
              <span className="hidden text-[12px] text-text-subtle sm:inline">
                @{profile.handle}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-text/30 bg-surface-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text">
              <Shield className="h-3 w-3" strokeWidth={2} />
              Admin
            </span>
          </div>
        </header>

        <div className="flex-1 px-7 pb-10 pt-6">
          {section === "stats" ? <StatsPanel stats={stats} /> : null}
          {section === "prompts" ? (
            <PromptsPanel
              posts={posts}
              userId={userId}
              profile={profile}
              socials={socials}
              models={models}
              platforms={platforms}
            />
          ) : null}
          {section === "users" ? <UsersPanel profiles={profiles} /> : null}
          {section === "reports" ? <ReportsPanel reports={reports} /> : null}
          {section === "taxonomy" ? <TaxonomyPanel taxonomy={taxonomy} /> : null}
        </div>
      </main>
    </div>
  );
}

interface SidebarProps {
  section: SectionKey;
  onSectionChange: (next: SectionKey) => void;
  counts: { prompts: number; users: number; openReports: number };
}

function AdminSidebar({ section, onSectionChange, counts }: SidebarProps) {
  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-4 overflow-hidden border-r bg-surface px-3 py-4">
      <Link
        href="/"
        aria-label="Feedlens.ai"
        className="flex items-center justify-center px-2 py-0.5"
      >
        <LogoMark height={27} width={126} />
      </Link>

      <div className="flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        <Shield className="h-3 w-3" strokeWidth={2} />
        Admin panel
      </div>

      <nav className="flex flex-col gap-0.5">
        {SECTIONS.map(({ key, label, Icon }) => {
          const active = section === key;
          const count =
            key === "prompts"
              ? counts.prompts
              : key === "users"
                ? counts.users
                : key === "reports"
                  ? counts.openReports
                  : undefined;
          const isOpenReports = key === "reports" && counts.openReports > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSectionChange(key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[14px] transition-colors",
                active
                  ? "bg-surface-2 font-medium text-text"
                  : "text-text-muted hover:bg-hover hover:text-text",
              )}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
              <span className="flex-1 text-left">{label}</span>
              {count !== undefined && count > 0 ? (
                <span
                  className={cn(
                    "tabular-nums text-[11px] font-medium",
                    isOpenReports
                      ? "rounded-full bg-red-500 px-1.5 py-[1px] text-white"
                      : "text-text-subtle",
                  )}
                >
                  {formatCount(count)}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t pt-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          Back to feed
        </Link>
        <footer className="flex items-center gap-3 px-2 text-[11px] text-text-subtle">
          <a href="#" className="hover:text-text">Help</a>
          <a href="#" className="hover:text-text">Privacy</a>
          <a href="#" className="hover:text-text">Terms</a>
        </footer>
      </div>
    </aside>
  );
}

/* ----------------- Prompts ----------------- */

function PromptsPanel({
  posts,
  userId,
  profile,
  socials,
  models,
  platforms,
}: {
  posts: Post[];
  userId: string;
  profile: Profile | null;
  socials: SocialAccount[];
  models: Model[];
  platforms: Platform[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState<Post | null>(null);
  const [adding, setAdding] = useState(false);

  const addButton = (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90"
    >
      <ImagePlus className="h-3.5 w-3.5" strokeWidth={2} />
      Add prompt
    </button>
  );

  const addDialog = (
    <AddPromptDialog
      open={adding}
      onOpenChange={setAdding}
      userId={userId}
      profile={profile}
      socials={socials}
      models={models}
      platforms={platforms}
    />
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.prompt.toLowerCase().includes(q) ||
        p.source_user.toLowerCase().includes(q) ||
        p.model_slug.toLowerCase().includes(q) ||
        p.platform_slug.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [posts, query]);

  if (posts.length === 0) {
    return (
      <>
        <div className="grid place-items-center rounded-[12px] border bg-surface-2/40 py-20 text-center">
          <div className="flex max-w-[360px] flex-col items-center gap-3 px-6">
            <ImageIcon className="h-6 w-6 text-text-subtle" strokeWidth={1.6} />
            <div className="text-[15px] font-semibold text-text">
              Henüz prompt yok
            </div>
            <p className="text-[13px] text-text-muted">
              İlk promptu ekleyerek başla.
            </p>
            <div className="mt-1">{addButton}</div>
          </div>
        </div>
        {addDialog}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex w-full items-center gap-2 rounded-[10px] border bg-surface-2 px-3 py-2 sm:w-[420px]">
            <Search
              className="h-3.5 w-3.5 shrink-0 text-text-subtle"
              strokeWidth={2}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Prompt, kullanıcı, model, platform ara…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
            />
          </label>
          {addButton}
        </div>

        <div className="overflow-x-auto rounded-[12px] border bg-surface">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="bg-surface-2/50 text-[11px] uppercase tracking-[0.08em] text-label">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Prompt</th>
                <th className="px-4 py-2.5 font-semibold">Creator</th>
                <th className="px-4 py-2.5 font-semibold">Model / Platform</th>
                <th className="px-4 py-2.5 font-semibold">Posted</th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.thumbnail_url ?? p.media_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-[8px] bg-surface-2 object-cover"
                      />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="line-clamp-2 max-w-[420px] text-[13px] text-text">
                          {p.prompt}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-text-subtle">
                          {p.prompt_type === "remix" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border bg-surface-2 px-1.5 py-0.5 font-semibold uppercase tracking-[0.06em]">
                              <Wand2 className="h-2.5 w-2.5" strokeWidth={2} />
                              Remix
                            </span>
                          ) : null}
                          <code className="rounded bg-surface-2 px-1 py-[1px] font-mono">
                            {p.id.slice(0, 8)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {p.source_user}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    <div className="flex flex-col">
                      <span className="text-[13px] text-text">
                        {prettyModel(p.model_slug)}
                      </span>
                      <span className="text-[11px] text-text-subtle">
                        {prettyPlatform(p.platform_slug)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-subtle">
                    {timeAgo(p.posted_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/prompt/${p.id}`}
                        target="_blank"
                        className="grid h-8 w-8 place-items-center rounded-[8px] border bg-surface text-text-muted hover:bg-hover hover:text-text"
                        aria-label="Open"
                      >
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditing(p)}
                        className="grid h-8 w-8 place-items-center rounded-[8px] border bg-surface text-text-muted hover:bg-hover hover:text-text"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(p)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border bg-surface text-text-muted hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-text-muted"
                  >
                    No prompts match that search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {addDialog}

      {editing ? (
        <EditPostDialog
          post={editing}
          open={true}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Bu promptu silmek istiyor musun?"
        description="Prompt ve ona bağlı görsel/like/save kayıtları kalıcı olarak silinir. Bu işlem geri alınamaz."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        tone="danger"
        icon={<Trash2 className="h-5 w-5" strokeWidth={2} />}
        onConfirm={async () => {
          if (!deleting) return;
          await deletePostWithToast(deleting.id, () => router.refresh());
          setDeleting(null);
        }}
      />
    </>
  );
}

/* ----------------- Stats ----------------- */

function StatsPanel({ stats }: { stats: PlatformStats }) {
  const items = [
    { label: "Users", value: stats.users, tone: "neutral" as const },
    { label: "Total prompts", value: stats.prompts, tone: "neutral" as const },
    {
      label: "User-submitted",
      value: stats.userPrompts,
      tone: "neutral" as const,
    },
    { label: "Likes", value: stats.likes, tone: "neutral" as const },
    { label: "Saves", value: stats.saves, tone: "neutral" as const },
    {
      label: "Open reports",
      value: stats.openReports,
      tone: stats.openReports > 0 ? "danger" : ("neutral" as const),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <div
          key={i.label}
          className={cn(
            "flex flex-col gap-1 rounded-[12px] border bg-surface-2/40 px-4 py-3",
            i.tone === "danger" && "border-red-500/40 bg-red-500/5",
          )}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
            {i.label}
          </div>
          <div
            className={cn(
              "text-[22px] font-semibold tabular-nums tracking-tight",
              i.tone === "danger" ? "text-red-500" : "text-text",
            )}
          >
            {formatCount(i.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------- Users ----------------- */

function UsersPanel({ profiles }: { profiles: ProfileWithEmail[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.handle?.toLowerCase().includes(q) ||
        p.display_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [profiles, query]);

  async function toggleFlag(
    id: string,
    field: "is_banned" | "is_verified",
    next: boolean,
  ) {
    setUpdating(id + field);
    try {
      const supabase = createClient();
      const payload =
        field === "is_banned" ? { is_banned: next } : { is_verified: next };
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      toast.success(
        `${field === "is_banned" ? (next ? "Banned" : "Unbanned") : next ? "Verified" : "Unverified"}`,
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-full items-center gap-2 rounded-[10px] border bg-surface-2 px-3 py-2 sm:w-[360px]">
        <Search
          className="h-3.5 w-3.5 shrink-0 text-text-subtle"
          strokeWidth={2}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by handle, name, or id…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
        />
      </label>

      <div className="overflow-x-auto rounded-[12px] border bg-surface">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-surface-2/50 text-[11px] uppercase tracking-[0.08em] text-label">
            <tr>
              <th className="px-4 py-2.5 font-semibold">User</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Joined</th>
              <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const verifying = updating === p.id + "is_verified";
              const banning = updating === p.id + "is_banned";
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-t",
                    p.is_banned && "bg-red-500/5",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.avatar_url ?? ""}
                        alt=""
                        className="h-8 w-8 rounded-full bg-surface-2 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.visibility =
                            "hidden";
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 truncate font-medium text-text">
                          {p.display_name ?? p.email ?? "—"}
                          {p.is_verified ? (
                            <BadgeCheck
                              className="h-3.5 w-3.5 text-text"
                              strokeWidth={2}
                            />
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-text-subtle">
                          {p.handle ? (
                            <span>@{p.handle}</span>
                          ) : (
                            <code className="rounded bg-surface-2 px-1 py-[1px] font-mono text-[10px]">
                              {p.id.slice(0, 8)}
                            </code>
                          )}
                          {p.email ? (
                            <>
                              <span>·</span>
                              <span className="truncate" title={p.email}>
                                {p.email}
                              </span>
                            </>
                          ) : null}
                          {p.email && !p.email_confirmed ? (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-500">
                              unconfirmed
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {p.is_admin ? (
                      <span className="rounded-full border border-text/30 bg-surface-2 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]">
                        Admin
                      </span>
                    ) : p.is_banned ? (
                      <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-red-500">
                        Banned
                      </span>
                    ) : (
                      <span className="text-[11px]">Member</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-subtle">
                    {timeAgo(p.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          toggleFlag(p.id, "is_verified", !p.is_verified)
                        }
                        disabled={verifying || p.is_admin}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-50",
                          p.is_verified
                            ? "border-text bg-surface text-text hover:bg-hover"
                            : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text",
                        )}
                      >
                        {verifying ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <BadgeCheck className="h-3 w-3" strokeWidth={2} />
                        )}
                        {p.is_verified ? "Verified" : "Verify"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toggleFlag(p.id, "is_banned", !p.is_banned)
                        }
                        disabled={banning || p.is_admin}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-50",
                          p.is_banned
                            ? "border-red-500 bg-red-500 text-white hover:opacity-90"
                            : "border-border bg-surface text-text-muted hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500",
                        )}
                      >
                        {banning ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Ban className="h-3 w-3" strokeWidth={2} />
                        )}
                        {p.is_banned ? "Banned" : "Ban"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-text-muted">
                  No users match that search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------- Reports ----------------- */

function ReportsPanel({ reports }: { reports: ReportRow[] }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  async function updateStatus(
    id: string,
    status: "reviewed" | "dismissed" | "actioned",
  ) {
    setUpdating(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Marked as ${status}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  if (reports.length === 0) {
    return (
      <div className="grid place-items-center rounded-[12px] border bg-surface-2/40 py-20 text-center">
        <div className="flex max-w-[320px] flex-col items-center gap-2 px-6">
          <Flag className="h-6 w-6 text-text-subtle" strokeWidth={1.6} />
          <div className="text-[15px] font-semibold text-text">All clear</div>
          <p className="text-[13px] text-text-muted">
            There are no reports right now. When members flag a prompt,
            it&apos;ll appear here for review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {reports.map((r) => (
        <li
          key={r.id}
          className="flex items-start gap-3 rounded-[12px] border bg-surface p-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2 text-[11px] text-text-subtle">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 font-medium uppercase tracking-[0.06em]",
                  r.status === "open"
                    ? "border-red-500/40 bg-red-500/10 text-red-500"
                    : "border-border bg-surface-2 text-text-muted",
                )}
              >
                {r.status}
              </span>
              <span>· {timeAgo(r.created_at)}</span>
            </div>
            <div className="text-[13px] text-text">
              {r.reason ?? "(no reason given)"}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-text-subtle">
              <span>post</span>
              <code className="rounded bg-surface-2 px-1 py-[1px] font-mono text-[10px]">
                {r.post_id.slice(0, 8)}…
              </code>
              <a
                href={`/?post=${r.post_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 hover:text-text"
              >
                <ExternalLink className="h-3 w-3" strokeWidth={2} />
                open
              </a>
            </div>
          </div>
          {r.status === "open" ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateStatus(r.id, "dismissed")}
                disabled={updating === r.id}
                className="rounded-[8px] border bg-surface px-2.5 py-1 text-[12px] font-medium text-text-muted hover:bg-hover hover:text-text disabled:opacity-50"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => updateStatus(r.id, "actioned")}
                disabled={updating === r.id}
                className="inline-flex items-center gap-1 rounded-[8px] border border-red-500 bg-red-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {updating === r.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                Take action
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
