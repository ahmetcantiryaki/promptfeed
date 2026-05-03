"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Trash2, X, Loader2, Check, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { ModelBadge, MODEL_BRAND } from "@/lib/model-icon";
import { PlatformBadge, PLATFORM_THEME, isPlatformSlug } from "@/lib/platform-icon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { TaxonomyData, TaxonomyRow } from "@/lib/admin";

type Kind = "model" | "platform";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string | null;
  postCount?: number;
}

interface CreatedRow {
  slug: string;
  name: string;
  icon_url: string | null;
  created_at: string;
}

async function postTaxonomy(body: unknown): Promise<ApiResult<CreatedRow>> {
  const res = await fetch("/api/admin/taxonomy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) {
    return { success: false, error: "Too fast — try again in a moment." };
  }
  try {
    return (await res.json()) as ApiResult<CreatedRow>;
  } catch {
    return { success: false, error: "request_failed" };
  }
}

async function deleteTaxonomy(body: unknown): Promise<ApiResult<never>> {
  const res = await fetch("/api/admin/taxonomy", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) {
    return { success: false, error: "Too fast — try again in a moment." };
  }
  try {
    return (await res.json()) as ApiResult<never>;
  } catch {
    return { success: false, error: "request_failed" };
  }
}

export function TaxonomyPanel({ taxonomy }: { taxonomy: TaxonomyData }) {
  const router = useRouter();
  const [adding, setAdding] = useState<Kind | null>(null);
  const [deleting, setDeleting] = useState<{ kind: Kind; row: TaxonomyRow } | null>(
    null,
  );

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Models"
        description="AI models referenced by published prompts."
        rows={taxonomy.models}
        kind="model"
        onAdd={() => setAdding("model")}
        onDelete={(row) => setDeleting({ kind: "model", row })}
      />
      <Section
        title="Platforms"
        description="Source platforms (X, Reddit, Instagram, etc)."
        rows={taxonomy.platforms}
        kind="platform"
        onAdd={() => setAdding("platform")}
        onDelete={(row) => setDeleting({ kind: "platform", row })}
      />

      <AddDialog
        kind={adding}
        onClose={() => setAdding(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title={`Delete ${deleting?.row.name ?? ""}?`}
        description={
          deleting && deleting.row.post_count > 0
            ? `${deleting.row.post_count} prompts still use this ${deleting.kind}. Reassign them first.`
            : `This removes the ${deleting?.kind} from the taxonomy. Cannot be undone.`
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (!deleting) return;
          if (deleting.row.post_count > 0) {
            toast.error("Reassign the posts using this slug first.");
            return;
          }
          const res = await deleteTaxonomy({
            kind: deleting.kind,
            slug: deleting.row.slug,
          });
          if (!res.success) {
            toast.error(res.error ?? "Could not delete");
            return;
          }
          toast.success(`${deleting.row.name} deleted`);
          setDeleting(null);
          router.refresh();
        }}
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  description: string;
  rows: TaxonomyRow[];
  kind: Kind;
  onAdd: () => void;
  onDelete: (row: TaxonomyRow) => void;
}

function Section({ title, description, rows, kind, onAdd, onDelete }: SectionProps) {
  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-text">
            {title}
          </h2>
          <p className="text-[12px] text-text-subtle">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-[8px] border bg-surface px-3 py-1.5 text-[12px] font-semibold text-text transition-colors hover:bg-hover"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add {kind}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 ? (
          <div className="col-span-full rounded-[10px] border bg-surface-2/40 px-4 py-8 text-center text-[12px] text-text-subtle">
            None yet — add the first one.
          </div>
        ) : (
          rows.map((row) => (
            <Row key={row.slug} kind={kind} row={row} onDelete={onDelete} />
          ))
        )}
      </div>
    </section>
  );
}

function Row({
  kind,
  row,
  onDelete,
}: {
  kind: Kind;
  row: TaxonomyRow;
  onDelete: (row: TaxonomyRow) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border bg-surface px-3 py-2.5">
      <Preview kind={kind} slug={row.slug} iconUrl={row.icon_url} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-text">
          {row.name}
        </div>
        <div className="truncate text-[11px] text-text-subtle">
          {row.slug} · {row.post_count} posts
        </div>
      </div>
      <button
        type="button"
        aria-label={`Delete ${row.name}`}
        onClick={() => onDelete(row)}
        className="grid h-8 w-8 place-items-center rounded-[8px] text-text-subtle transition-colors hover:bg-hover hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}

function Preview({
  kind,
  slug,
  iconUrl,
}: {
  kind: Kind;
  slug: string;
  iconUrl: string | null;
}) {
  if (iconUrl) {
    return (
      <span
        className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[7px] bg-surface-2"
        title={slug}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl}
          alt=""
          width={32}
          height={32}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  if (kind === "model") return <ModelBadge slug={slug} size={32} rounded={7} />;
  if (isPlatformSlug(slug)) return <PlatformBadge platform={slug} size={32} rounded={7} />;
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] bg-surface-2 text-[13px] font-semibold text-text">
      {slug.charAt(0).toUpperCase()}
    </span>
  );
}

/* ---------- Add dialog ---------- */

function AddDialog({ kind, onClose }: { kind: Kind | null; onClose: () => void }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const presets = useMemo(() => {
    if (!kind) return [] as PresetOption[];
    return kind === "model"
      ? Object.entries(MODEL_BRAND).map(([slug, b]) => ({
          slug,
          label: b.label,
          kind: "model" as const,
        }))
      : Object.entries(PLATFORM_THEME).map(([slug, b]) => ({
          slug,
          label: b.label,
          kind: "platform" as const,
        }));
  }, [kind]);

  const open = kind !== null;
  const onChangeOpen = (next: boolean) => {
    if (!next) {
      setSlug("");
      setName("");
      setIconUrl("");
      setSubmitting(false);
      onClose();
    }
  };

  const slugValid = !slug || SLUG_RE.test(slug);
  const canSubmit =
    Boolean(slug) && SLUG_RE.test(slug) && Boolean(name.trim()) && !submitting;

  async function handleSubmit() {
    if (!kind) return;
    setSubmitting(true);
    const res = await postTaxonomy({
      kind,
      slug,
      name: name.trim(),
      iconUrl: iconUrl.trim() || null,
    });
    setSubmitting(false);
    if (!res.success) {
      const msg =
        res.error === "slug_taken"
          ? "That slug is already taken."
          : res.error ?? "Could not save";
      toast.error(msg);
      return;
    }
    toast.success(`${name} added`);
    onChangeOpen(false);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onChangeOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/65 backdrop-blur" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border bg-surface shadow-2xl outline-none">
          <header className="flex items-center justify-between gap-2 border-b px-5 py-4">
            <Dialog.Title className="text-[15px] font-semibold text-text">
              Add {kind}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-full text-text-subtle transition-colors hover:bg-hover hover:text-text"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </Dialog.Close>
          </header>

          <div className="flex flex-col gap-4 px-5 py-5">
            <Field
              label="Display name"
              hint="Shown in feeds and filters (e.g. “Midjourney v8.1”)."
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Midjourney v8.1"
                maxLength={60}
                className="w-full rounded-[8px] border bg-surface-2 px-3 py-2 text-[13px] text-text outline-none focus:border-text/50"
              />
            </Field>

            <Field
              label="Slug"
              hint="Lowercase, hyphenated. Used in URLs and stored on posts. Cannot change later."
              error={!slugValid ? "Use only a–z, 0–9, dashes (2–40 chars)." : null}
            >
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="midjourney-v8-1"
                maxLength={40}
                className={cn(
                  "w-full rounded-[8px] border bg-surface-2 px-3 py-2 font-mono text-[12px] text-text outline-none focus:border-text/50",
                  !slugValid && "border-red-500/60",
                )}
              />
            </Field>

            <Field
              label="Icon URL (optional)"
              hint="Absolute path under /logos, /icons, /assets, or a full https URL."
            >
              <input
                type="text"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="/logos/midjourney.svg"
                maxLength={500}
                className="w-full rounded-[8px] border bg-surface-2 px-3 py-2 font-mono text-[12px] text-text outline-none focus:border-text/50"
              />
              {iconUrl ? (
                <div className="mt-2 flex items-center gap-2 rounded-[8px] border bg-surface-2/40 px-3 py-2">
                  <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-[6px] bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={iconUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="truncate text-[11px] text-text-subtle">
                    Preview
                  </span>
                </div>
              ) : null}
            </Field>

            {presets.length > 0 ? (
              <Field
                label="Or pick a preset glyph"
                hint="Use one of the built-in icons. Picking a preset clears the URL and the badge falls back to its built-in glyph (slug must match)."
              >
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {presets.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => {
                        setSlug(p.slug);
                        if (!name) setName(p.label);
                        setIconUrl("");
                      }}
                      title={`${p.label} (${p.slug})`}
                      className={cn(
                        "group relative grid aspect-square place-items-center rounded-[8px] border bg-surface-2 transition-colors hover:bg-hover",
                        slug === p.slug && "ring-2 ring-text/50",
                      )}
                    >
                      <Preview kind={p.kind} slug={p.slug} iconUrl={null} />
                      {slug === p.slug ? (
                        <Check
                          className="absolute right-1 top-1 h-3 w-3 text-text"
                          strokeWidth={2.5}
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}

            {!slug && !name && !iconUrl ? (
              <div className="flex items-center gap-2 rounded-[8px] border border-text/10 bg-surface-2/40 px-3 py-2 text-[11px] text-text-subtle">
                <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                Tip: drop your icon under <code className="font-mono">/public/logos/</code> first, then paste the path here.
              </div>
            ) : null}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t bg-surface-2/40 px-5 py-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[8px] border bg-surface px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[8px] bg-text px-3 py-1.5 text-[12px] font-semibold text-bg transition-opacity",
                canSubmit ? "hover:opacity-90" : "cursor-not-allowed opacity-50",
              )}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              Save
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface PresetOption {
  slug: string;
  label: string;
  kind: Kind;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[12px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-[11px] text-red-500">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-text-subtle">{hint}</span>
      ) : null}
    </label>
  );
}
