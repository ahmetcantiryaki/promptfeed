"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Loader2,
  Upload,
  Trash2,
  Plus,
  Wand2,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Post, PromptStatus, Tag, TagAxis, TagsByAxis } from "@/types/domain";
import { MIN_TAGS_PER_POST, PROMPT_STATUSES, TAG_AXES } from "@/types/domain";
import { PROMPT_STATUS_META, promptStatusOf } from "@/lib/prompt-status";
import { createClient } from "@/lib/supabase/browser";
import {
  applyPostTagsDiff,
  getPostTagSlugs,
  updatePost,
  uploadReplacementImage,
  type UpdatePostInput,
} from "@/lib/admin-post-actions";
import { PrettySelect, type SelectOption } from "@/components/ui/select";
import { ModelBadge } from "@/lib/model-icon";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { cn } from "@/lib/utils";
import { slugify, SLUG_MAX_LEN, TITLE_MAX_LEN } from "@/lib/slug";
import { safeImageSrc, safeVideoSrc } from "@/lib/safe-url";
import { TagAxisPicker } from "@/components/features/add-prompt/tag-axis-picker";

const EMPTY_TAGS_BY_AXIS: TagsByAxis = {
  subject: [],
  style: [],
  use_case: [],
};

function isTagAxis(value: string): value is TagAxis {
  return value === "subject" || value === "style" || value === "use_case";
}

function groupTagsByAxis(rows: readonly Tag[]): TagsByAxis {
  const grouped: TagsByAxis = { subject: [], style: [], use_case: [] };
  for (const tag of rows) {
    if (!isTagAxis(tag.axis)) continue;
    grouped[tag.axis].push(tag);
  }
  return grouped;
}

interface ModelOpt {
  slug: string;
  name: string;
}
interface PlatformOpt {
  slug: string;
  name: string;
}

interface ImageSlot {
  /** Existing remote URL (kept if no new file is chosen and no externalUrl set). */
  url: string | null;
  /** Newly chosen file to upload. */
  file: File | null;
  /** Local preview URL (object URL when file is set, otherwise the remote/external URL). */
  preview: string | null;
  /** Pasted external image URL — overrides any uploaded file when set. */
  externalUrl: string;
}

function isHttpUrl(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

interface Props {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save; parent can refresh local state. */
  onSaved?: () => void;
}

const EXTRA_LIMIT = 3;

function makeSlot(url: string | null): ImageSlot {
  return { url, file: null, preview: url, externalUrl: "" };
}

export function EditPostDialog({ post, open, onOpenChange, onSaved }: Props) {
  const router = useRouter();
  const isRemix = post.prompt_type === "remix";
  const isVideo = post.media_type === "video";

  const [userId, setUserId] = useState<string | null>(null);
  const [models, setModels] = useState<ModelOpt[]>([]);
  const [platforms, setPlatforms] = useState<PlatformOpt[]>([]);
  const [tagsByAxis, setTagsByAxis] = useState<TagsByAxis>(EMPTY_TAGS_BY_AXIS);
  // initialTagSlugs lets us diff at save time without re-querying the server.
  const [initialTagSlugs, setInitialTagSlugs] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [tagSlugs, setTagSlugs] = useState<Set<string>>(() => new Set());
  const [tagsLoading, setTagsLoading] = useState(false);

  const [prompt, setPrompt] = useState(post.prompt);
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [modelSlug, setModelSlug] = useState(post.model_slug);
  const [platformSlug, setPlatformSlug] = useState(post.platform_slug);
  const [promptStatus, setPromptStatus] = useState<PromptStatus>(
    promptStatusOf(post.prompt_status),
  );
  const [extHandle, setExtHandle] = useState(
    post.external_creator_handle ?? "",
  );
  const [extUrl, setExtUrl] = useState(post.external_creator_url ?? "");
  const [extPlatform, setExtPlatform] = useState(
    post.external_creator_platform ?? "",
  );

  const [videoUrl, setVideoUrl] = useState(post.media_url);
  const [main, setMain] = useState<ImageSlot>(makeSlot(post.media_url));
  const [source, setSource] = useState<ImageSlot>(
    makeSlot(post.source_image_url ?? null),
  );
  const [extras, setExtras] = useState<ImageSlot[]>(
    (post.extra_image_urls ?? []).map(makeSlot),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track object URLs we created so we can revoke them on unmount/reset.
  const objectUrlsRef = useRef<string[]>([]);

  // Reset whenever a different post is opened.
  useEffect(() => {
    if (!open) return;
    setPrompt(post.prompt);
    setTitle(post.title);
    setSlug(post.slug);
    setModelSlug(post.model_slug);
    setPlatformSlug(post.platform_slug);
    setPromptStatus(promptStatusOf(post.prompt_status));
    setExtHandle(post.external_creator_handle ?? "");
    setExtUrl(post.external_creator_url ?? "");
    setExtPlatform(post.external_creator_platform ?? "");
    setVideoUrl(post.media_url);
    setMain(makeSlot(post.media_url));
    setSource(makeSlot(post.source_image_url ?? null));
    setExtras((post.extra_image_urls ?? []).map(makeSlot));
    // Reset tag selection too — we'll repopulate from the DB in the fetch effect.
    setInitialTagSlugs(new Set());
    setTagSlugs(new Set());
    setError(null);
  }, [open, post]);

  // Revoke any object URLs when the dialog closes or unmounts.
  useEffect(() => {
    if (open) return;
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  }, [open]);

  // Lazy-load model/platform options + tag vocabulary + the post's current
  // tags + current user id the first time we open. The tag vocabulary and
  // model/platform lists are cached after the first open; post_tags refreshes
  // every open since each post can have a different selection.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTagsLoading(true);
    (async () => {
      const supabase = createClient();
      const tagsVocabPromise =
        tagsByAxis.subject.length +
          tagsByAxis.style.length +
          tagsByAxis.use_case.length >
        0
          ? Promise.resolve(null)
          : supabase
              .from("tags")
              .select("*")
              .order("axis", { ascending: true })
              .order("display_order", { ascending: true });
      const [m, p, auth, vocab, currentTagSlugs] = await Promise.all([
        models.length > 0
          ? Promise.resolve({ data: null })
          : supabase.from("models").select("slug, name").order("name"),
        platforms.length > 0
          ? Promise.resolve({ data: null })
          : supabase.from("platforms").select("slug, name").order("name"),
        userId
          ? Promise.resolve({ data: { user: { id: userId } } })
          : supabase.auth.getUser(),
        tagsVocabPromise,
        getPostTagSlugs(post.id),
      ]);
      if (cancelled) return;
      if (m.data) setModels(m.data as ModelOpt[]);
      if (p.data) setPlatforms(p.data as PlatformOpt[]);
      if (auth.data?.user?.id) setUserId(auth.data.user.id);
      if (vocab && vocab.data) {
        setTagsByAxis(groupTagsByAxis(vocab.data as Tag[]));
      }
      const initial = new Set(currentTagSlugs);
      setInitialTagSlugs(initial);
      setTagSlugs(new Set(initial));
      setTagsLoading(false);
    })().catch((e) => {
      if (cancelled) return;
      setTagsLoading(false);
      setError(e instanceof Error ? e.message : "Failed to load tags");
    });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    post.id,
    models.length,
    platforms.length,
    userId,
    tagsByAxis.subject.length,
    tagsByAxis.style.length,
    tagsByAxis.use_case.length,
  ]);

  const modelOptions: SelectOption<string>[] = models.map((m) => ({
    value: m.slug,
    label: m.name,
    icon: <ModelBadge slug={m.slug} size={18} />,
  }));
  const platformOptions: SelectOption<string>[] = platforms.map((p) => ({
    value: p.slug,
    label: p.name,
    icon: isPlatformSlug(p.slug) ? (
      <PlatformBadge platform={p.slug} size={18} rounded={4} />
    ) : (
      <span className="h-[18px] w-[18px] rounded-[4px] bg-surface-2" />
    ),
  }));

  function pickFile(setter: (slot: ImageSlot) => void, currentUrl: string | null) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const preview = URL.createObjectURL(f);
      objectUrlsRef.current.push(preview);
      setter({ url: currentUrl, file: f, preview, externalUrl: "" });
    };
    input.click();
  }

  function setExternalUrl(
    setter: (next: ImageSlot) => void,
    current: ImageSlot,
    value: string,
  ) {
    const trimmed = value.trim();
    const valid = isHttpUrl(trimmed);
    setter({
      url: current.url,
      file: null,
      externalUrl: value,
      preview: valid ? trimmed : current.url,
    });
  }

  function replaceMain() {
    pickFile(setMain, main.url);
  }
  function replaceSource() {
    pickFile(setSource, source.url);
  }
  function replaceExtra(i: number) {
    pickFile((slot) => {
      setExtras((prev) => prev.map((s, j) => (j === i ? slot : s)));
    }, extras[i]?.url ?? null);
  }
  function removeExtra(i: number) {
    setExtras((prev) => prev.filter((_, j) => j !== i));
  }
  function addExtra() {
    if (extras.length >= EXTRA_LIMIT) return;
    pickFile((slot) => {
      setExtras((prev) => [...prev, slot]);
    }, null);
  }

  async function save() {
    setError(null);
    if (promptStatus !== "reference" && prompt.trim().length < 6) {
      setError("Prompt must be at least 6 characters.");
      return;
    }
    if (!userId) {
      setError("You need to be signed in to upload images.");
      return;
    }
    if (isVideo) {
      if (!safeVideoSrc(videoUrl)) {
        setError("Enter a valid direct video URL (.mp4/.webm).");
        return;
      }
    } else if (!main.preview) {
      setError("Main image can't be empty.");
      return;
    }
    if (tagSlugs.size < MIN_TAGS_PER_POST) {
      setError("Pick at least one tag.");
      return;
    }

    setSaving(true);
    try {
      const patch: UpdatePostInput = {
        // References carry no prompt; clearing keeps the data honest to the tier.
        prompt: promptStatus === "reference" ? "" : prompt.trim(),
        prompt_status: promptStatus,
        // Send title/slug only when changed; the trigger keeps existing
        // values if both are absent in the patch (UPDATE OF clause).
        ...(title.trim() && title.trim() !== post.title
          ? { title: title.trim().slice(0, TITLE_MAX_LEN) }
          : {}),
        ...(slug.trim() && slug.trim() !== post.slug
          ? { slug: slugify(slug, SLUG_MAX_LEN) }
          : {}),
        model_slug: modelSlug,
        platform_slug: platformSlug,
        external_creator_handle: extHandle.trim() || null,
        external_creator_url: extUrl.trim() || null,
        external_creator_platform: extPlatform || null,
      };

      if (isVideo) {
        const safeVideo = safeVideoSrc(videoUrl);
        if (!safeVideo) throw new Error("Invalid video URL.");
        patch.media_url = safeVideo;
        // Input image (image-to-video) → source_image_url; clearing it
        // leaves the post as text-to-video. safeImageSrc also rejects
        // private/loopback hosts (SSRF), unlike the bare isHttpUrl check.
        const safeSource = safeImageSrc(source.externalUrl);
        if (safeSource) {
          patch.source_image_url = safeSource;
        } else if (source.file) {
          const url = await uploadReplacementImage(
            userId,
            post.id,
            "in",
            source.file,
          );
          patch.source_image_url = url;
        } else if (source.url === null) {
          patch.source_image_url = null;
        }
      } else {
        if (isHttpUrl(main.externalUrl)) {
          patch.media_url = main.externalUrl.trim();
          patch.thumbnail_url = main.externalUrl.trim();
        } else if (main.file) {
          const url = await uploadReplacementImage(
            userId,
            post.id,
            "out",
            main.file,
          );
          patch.media_url = url;
          patch.thumbnail_url = url;
        }

        if (isRemix) {
          if (isHttpUrl(source.externalUrl)) {
            patch.source_image_url = source.externalUrl.trim();
          } else if (source.file) {
            const url = await uploadReplacementImage(
              userId,
              post.id,
              "in",
              source.file,
            );
            patch.source_image_url = url;
          } else if (source.url === null) {
            patch.source_image_url = null;
          }
        }

        // Rebuild the extras array preserving order.
        const newExtras: string[] = [];
        for (let i = 0; i < extras.length; i++) {
          const e = extras[i]!;
          if (isHttpUrl(e.externalUrl)) {
            newExtras.push(e.externalUrl.trim());
          } else if (e.file) {
            const url = await uploadReplacementImage(
              userId,
              post.id,
              `x${i + 1}`,
              e.file,
            );
            newExtras.push(url);
          } else if (e.url) {
            newExtras.push(e.url);
          }
        }
        patch.extra_image_urls = newExtras;
      }

      await updatePost(post.id, patch);
      await applyPostTagsDiff(post.id, initialTagSlugs, tagSlugs);
      toast.success("Prompt updated");
      onSaved?.();
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-md" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[90] flex max-h-[100dvh] w-[min(96vw,820px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[14px] border bg-surface shadow-2xl outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <Dialog.Title className="text-[15px] font-semibold tracking-tight text-text">
              Edit prompt
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-hover hover:text-text"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
            {/* Images section */}
            <section className="flex flex-col gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                {isVideo ? "Video" : "Images"}
              </div>
              {isVideo ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
                      Video file URL
                    </span>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://…/clip.mp4"
                      className="w-full rounded-[10px] border bg-surface-2 px-3 py-2 text-[13px] text-text placeholder:text-text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    {videoUrl.trim() && !safeVideoSrc(videoUrl) ? (
                      <span className="text-[11px] text-red-500">
                        Invalid or unsafe video URL.
                      </span>
                    ) : null}
                  </div>
                  <ImageEditorCard
                    label="Input image (image-to-video)"
                    badge={<Wand2 className="h-3 w-3" strokeWidth={2} />}
                    preview={source.preview}
                    externalUrl={source.externalUrl}
                    hasFile={Boolean(source.file)}
                    onReplace={replaceSource}
                    onUrlChange={(v) => setExternalUrl(setSource, source, v)}
                    onRemove={
                      source.preview
                        ? () =>
                            setSource({
                              url: null,
                              file: null,
                              preview: null,
                              externalUrl: "",
                            })
                        : undefined
                    }
                  />
                  <p className="text-[11px] text-text-subtle">
                    Leave the input image empty for text-to-video. We
                    don&rsquo;t host the file — paste a direct .mp4/.webm URL.
                  </p>
                </div>
              ) : (
              <div
                className={cn(
                  "grid gap-3",
                  isRemix ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2",
                )}
              >
                <ImageEditorCard
                  label={isRemix ? "Output" : "Main image"}
                  preview={main.preview}
                  externalUrl={main.externalUrl}
                  hasFile={Boolean(main.file)}
                  onReplace={replaceMain}
                  onUrlChange={(v) => setExternalUrl(setMain, main, v)}
                />
                {isRemix ? (
                  <ImageEditorCard
                    label="Input (source)"
                    badge={<Wand2 className="h-3 w-3" strokeWidth={2} />}
                    preview={source.preview}
                    externalUrl={source.externalUrl}
                    hasFile={Boolean(source.file)}
                    onReplace={replaceSource}
                    onUrlChange={(v) => setExternalUrl(setSource, source, v)}
                  />
                ) : null}
              </div>
              )}

              {!isRemix && !isVideo ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-medium text-text-muted">
                      Extra images{" "}
                      <span className="text-text-subtle">
                        ({extras.length}/{EXTRA_LIMIT})
                      </span>
                    </div>
                    {extras.length < EXTRA_LIMIT ? (
                      <button
                        type="button"
                        onClick={addExtra}
                        className="inline-flex items-center gap-1 rounded-[8px] border bg-surface px-2.5 py-1 text-[12px] font-medium text-text-muted hover:bg-hover hover:text-text"
                      >
                        <Plus className="h-3 w-3" strokeWidth={2} />
                        Add
                      </button>
                    ) : null}
                  </div>
                  {extras.length === 0 ? (
                    <p className="text-[12px] text-text-subtle">
                      No extra images for this prompt.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {extras.map((e, i) => (
                        <ImageEditorCard
                          key={i}
                          label={`#${i + 1}`}
                          preview={e.preview}
                          externalUrl={e.externalUrl}
                          hasFile={Boolean(e.file)}
                          onReplace={() => replaceExtra(i)}
                          onRemove={() => removeExtra(i)}
                          onUrlChange={(v) =>
                            setExtras((prev) =>
                              prev.map((slot, j) =>
                                j === i
                                  ? {
                                      url: slot.url,
                                      file: null,
                                      externalUrl: v,
                                      preview: isHttpUrl(v)
                                        ? v.trim()
                                        : slot.url,
                                    }
                                  : slot,
                              ),
                            )
                          }
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            {/* Text section */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={`Title (SEO) — ${title.length}/${TITLE_MAX_LEN}`}>
                <input
                  type="text"
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value.slice(0, TITLE_MAX_LEN))
                  }
                  placeholder="Short SEO title"
                  maxLength={TITLE_MAX_LEN}
                  className="w-full rounded-[10px] border bg-surface-2 px-3 py-2 text-[13px] text-text placeholder:text-text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </Field>
              <Field label="URL slug">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().slice(0, SLUG_MAX_LEN))
                  }
                  placeholder="auto-from-title"
                  maxLength={SLUG_MAX_LEN}
                  className="w-full rounded-[10px] border bg-surface-2 px-3 py-2 font-mono text-[12px] text-text placeholder:text-text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </Field>
            </div>

            <Field label="Prompt status">
              <div
                role="radiogroup"
                aria-label="Prompt status"
                className="grid grid-cols-3 gap-1.5"
              >
                {PROMPT_STATUSES.map((s) => {
                  const meta = PROMPT_STATUS_META[s];
                  const active = promptStatus === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPromptStatus(s)}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-[8px] border px-2 py-1.5 text-[12px] font-medium transition-colors",
                        active
                          ? meta.tintedClass
                          : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          meta.dotClass,
                        )}
                      />
                      <span className="truncate">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field
              label={
                promptStatus === "reference"
                  ? "Prompt (cleared for references)"
                  : "Prompt"
              }
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                disabled={promptStatus === "reference"}
                className="w-full resize-y rounded-[10px] border bg-surface-2 px-3 py-2.5 text-[13px] text-text placeholder:text-text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Model">
                <PrettySelect
                  value={modelSlug}
                  onValueChange={setModelSlug}
                  options={modelOptions}
                  ariaLabel="Model"
                />
              </Field>
              <Field label="Platform">
                <PrettySelect
                  value={platformSlug}
                  onValueChange={setPlatformSlug}
                  options={platformOptions}
                  ariaLabel="Platform"
                />
              </Field>
            </div>

            {tagsLoading ? (
              <div className="rounded-[10px] border bg-surface-2/40 px-3 py-3 text-[12px] text-text-subtle">
                Loading tags…
              </div>
            ) : (
              <TagAxisPicker
                tagsByAxis={tagsByAxis}
                selected={tagSlugs}
                onChange={setTagSlugs}
                axes={TAG_AXES}
              />
            )}

            <Field label="Original creator handle (optional)">
              <input
                value={extHandle}
                onChange={(e) => setExtHandle(e.target.value)}
                placeholder="@someone"
                className="w-full rounded-[10px] border bg-surface-2 px-3 py-2 text-[13px] text-text placeholder:text-text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Creator URL">
                <input
                  value={extUrl}
                  onChange={(e) => setExtUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-[10px] border bg-surface-2 px-3 py-2 text-[13px] text-text placeholder:text-text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </Field>
              <Field label="Creator platform">
                <input
                  value={extPlatform}
                  onChange={(e) => setExtPlatform(e.target.value)}
                  placeholder="x, instagram…"
                  className="w-full rounded-[10px] border bg-surface-2 px-3 py-2 text-[13px] text-text placeholder:text-text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </Field>
            </div>

            {error ? (
              <div className="rounded-[10px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t bg-surface-2/40 px-5 py-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[10px] border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-muted hover:bg-hover hover:text-text"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        {label}
      </span>
      {children}
    </label>
  );
}

interface ImageEditorCardProps {
  label: string;
  preview: string | null;
  externalUrl: string;
  hasFile: boolean;
  onReplace: () => void;
  onUrlChange: (next: string) => void;
  onRemove?: () => void;
  badge?: React.ReactNode;
  compact?: boolean;
}

function ImageEditorCard({
  label,
  preview,
  externalUrl,
  hasFile,
  onReplace,
  onUrlChange,
  onRemove,
  badge,
  compact,
}: ImageEditorCardProps) {
  const isExternal = !hasFile && isHttpUrl(externalUrl);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        {badge}
        {label}
        {isExternal ? (
          <span className="rounded-full border border-text/20 bg-surface-2 px-1.5 py-[1px] text-[9px] font-semibold tracking-[0.06em] text-text-muted">
            URL
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-[10px] border bg-surface-2",
          compact ? "aspect-square" : "aspect-[4/3]",
        )}
      >
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[11px] text-text-subtle">
            No image
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onReplace}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-text-muted hover:bg-hover hover:text-text"
        >
          <Upload className="h-3 w-3" strokeWidth={2} />
          {preview ? "Replace" : "Upload"}
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="grid h-7 w-7 place-items-center rounded-[8px] border bg-surface text-text-muted hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-[8px] border bg-surface px-2 py-1 transition-colors focus-within:border-border-strong",
          hasFile && "opacity-50",
        )}
        title={hasFile ? "Remove the uploaded file before pasting a URL" : undefined}
      >
        <LinkIcon
          className="h-3 w-3 shrink-0 text-text-subtle"
          strokeWidth={1.8}
        />
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          disabled={hasFile}
          placeholder="…or paste an image URL"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-text placeholder:text-text-subtle focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
