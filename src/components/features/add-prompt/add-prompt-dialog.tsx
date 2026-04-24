"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import {
  X,
  Loader2,
  UploadCloud,
  Sparkles,
  ImagePlus,
  Trash2,
  Link as LinkIcon,
  Wand2,
  User as UserIcon,
  AtSign,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Model,
  Platform,
  PlatformSlug,
  Profile,
  SocialAccount,
} from "@/types/domain";
import { createClient } from "@/lib/supabase/browser";
import { modelVisual } from "@/lib/brand";
import {
  PlatformBadge,
  PLATFORM_THEME,
  isPlatformSlug,
} from "@/lib/platform-icon";
import { BrandSquare } from "@/components/ui/brand-square";
import { PrettySelect, type SelectOption } from "@/components/ui/select";
import { cn, formatCount } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  profile: Profile | null;
  socials: SocialAccount[];
  models: Model[];
  platforms: Platform[];
}

const MAX_SIZE_MB = 8;
const PROMPT_MAX = 4000;

function hostnameFromUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const normalized = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const h = new URL(normalized).hostname.replace(/^www\./, "");
    return h || null;
  } catch {
    return null;
  }
}

type PromptType = "standard" | "remix";
type AttributionMode = "self" | "reference";

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "png";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileSlot {
  file: File | null;
  url: string | null;
  dims: { w: number; h: number } | null;
}

const EMPTY_SLOT: FileSlot = { file: null, url: null, dims: null };

export function AddPromptDialog({
  open,
  onOpenChange,
  userId,
  profile,
  socials,
  models,
  platforms,
}: Props) {
  const router = useRouter();

  const [attribution, setAttribution] = useState<AttributionMode>("self");
  const [promptType, setPromptType] = useState<PromptType>("standard");

  const [result, setResult] = useState<FileSlot>(EMPTY_SLOT);
  const [source, setSource] = useState<FileSlot>(EMPTY_SLOT);
  const [extras, setExtras] = useState<FileSlot[]>(() => [
    EMPTY_SLOT,
    EMPTY_SLOT,
    EMPTY_SLOT,
  ]);

  const [prompt, setPrompt] = useState("");
  const [modelSlug, setModelSlug] = useState(models[0]?.slug ?? "");
  const [platformSlug, setPlatformSlug] = useState(platforms[0]?.slug ?? "");

  // External creator (reference mode)
  const [extHandle, setExtHandle] = useState("");
  const [extPlatform, setExtPlatform] = useState<PlatformSlug>("x");
  const [extUrl, setExtUrl] = useState("");

  // Self reference (optional source URL)
  const [selfSourceUrl, setSelfSourceUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<null | "result" | "source">(null);

  const resultInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      if (result.url) URL.revokeObjectURL(result.url);
      if (source.url) URL.revokeObjectURL(source.url);
    };
  }, [result.url, source.url]);

  // Pre-fill "self" source URL from socials on open
  useEffect(() => {
    if (!open) return;
    const xLink = socials.find((s) => s.platform === "x")?.url;
    if (xLink && !selfSourceUrl) setSelfSourceUrl(xLink);
  }, [open, socials, selfSourceUrl]);

  function pickFile(slot: "result" | "source", selected: File | null) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be smaller than ${MAX_SIZE_MB} MB.`);
      return;
    }
    setError(null);
    const url = URL.createObjectURL(selected);
    const update: FileSlot = { file: selected, url, dims: null };
    const img = new Image();
    img.onload = () => {
      const dims = { w: img.naturalWidth, h: img.naturalHeight };
      if (slot === "result") {
        setResult((prev) => (prev.url === url ? { ...prev, dims } : prev));
      } else {
        setSource((prev) => (prev.url === url ? { ...prev, dims } : prev));
      }
    };
    img.src = url;
    if (slot === "result") {
      if (result.url) URL.revokeObjectURL(result.url);
      setResult(update);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } else {
      if (source.url) URL.revokeObjectURL(source.url);
      setSource(update);
    }
  }

  function clearSlot(slot: "result" | "source") {
    if (slot === "result") {
      if (result.url) URL.revokeObjectURL(result.url);
      setResult(EMPTY_SLOT);
      if (resultInputRef.current) resultInputRef.current.value = "";
    } else {
      if (source.url) URL.revokeObjectURL(source.url);
      setSource(EMPTY_SLOT);
      if (sourceInputRef.current) sourceInputRef.current.value = "";
    }
  }

  function setExtra(index: number, file: File | null) {
    if (!file) {
      setExtras((prev) => {
        const next = [...prev];
        const slot = next[index];
        if (slot?.url) URL.revokeObjectURL(slot.url);
        next[index] = EMPTY_SLOT;
        return next;
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be smaller than ${MAX_SIZE_MB} MB.`);
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setExtras((prev) => {
      const next = [...prev];
      if (next[index]?.url) URL.revokeObjectURL(next[index]!.url!);
      next[index] = { file, url, dims: null };
      return next;
    });
  }

  function reset() {
    clearSlot("result");
    clearSlot("source");
    extras.forEach((s) => {
      if (s.url) URL.revokeObjectURL(s.url);
    });
    setExtras([EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT]);
    setPrompt("");
    setExtHandle("");
    setExtUrl("");
    setExtPlatform("x");
    setSelfSourceUrl("");
    setAttribution("self");
    setPromptType("standard");
    setError(null);
  }

  function onOpenChangeInternal(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function uploadImage(file: File, postId: string, tag: string): Promise<string> {
    const supabase = createClient();
    const ext = extOf(file.name) || "png";
    const path = `${userId}/${postId}-${tag}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("user-uploads")
      .upload(path, file, {
        contentType: file.type || "image/png",
        upsert: false,
      });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("user-uploads").getPublicUrl(path);
    return data.publicUrl;
  }

  async function submit() {
    setError(null);
    if (!result.file) {
      setError("Upload the result image.");
      return;
    }
    if (promptType === "remix" && !source.file) {
      setError("Remix prompts need the input image too.");
      return;
    }
    if (prompt.trim().length < 6) {
      setError("Prompt must be at least 6 characters.");
      return;
    }
    if (prompt.length > PROMPT_MAX) {
      setError(`Prompt exceeds ${PROMPT_MAX} characters.`);
      return;
    }
    if (!modelSlug || !platformSlug) {
      setError("Pick a model and a platform.");
      return;
    }
    if (attribution === "reference") {
      if (extPlatform === "other") {
        if (!extUrl.trim() && !extHandle.trim()) {
          setError("Add a source URL or a creator handle.");
          return;
        }
      } else if (!extHandle.trim()) {
        setError("Add the creator's handle (e.g. @someone).");
        return;
      }
    }

    setSubmitting(true);
    try {
      const postId = crypto.randomUUID();
      const resultUrl = await uploadImage(result.file, postId, "out");
      const sourceUrl =
        promptType === "remix" && source.file
          ? await uploadImage(source.file, postId, "in")
          : null;

      // Extras only for standard prompts — upload each in order
      const extraUrls: string[] = [];
      if (promptType === "standard") {
        for (let i = 0; i < extras.length; i++) {
          const slot = extras[i];
          if (slot?.file) {
            const url = await uploadImage(slot.file, postId, `x${i + 1}`);
            extraUrls.push(url);
          }
        }
      }

      // Determine attribution
      let sourceUserLabel: string;
      let sourceLinkForPost: string;
      let extCreatorHandle: string | null = null;
      let extCreatorUrl: string | null = null;
      let extCreatorPlatform: string | null = null;

      if (attribution === "reference") {
        const rawHandle = extHandle.trim().replace(/^@+/, "");
        const trimmedUrl = extUrl.trim();
        if (extPlatform === "other") {
          const host = hostnameFromUrl(trimmedUrl);
          sourceUserLabel = rawHandle ? `@${rawHandle}` : host ?? "Web";
          sourceLinkForPost = trimmedUrl || `promptfeed://web/${postId}`;
          extCreatorHandle = rawHandle ? `@${rawHandle}` : null;
          extCreatorUrl = trimmedUrl || null;
          extCreatorPlatform = "other";
        } else {
          sourceUserLabel = `@${rawHandle}`;
          const autoUrl = PLATFORM_THEME[extPlatform].urlPrefix + rawHandle;
          sourceLinkForPost = trimmedUrl || autoUrl;
          extCreatorHandle = `@${rawHandle}`;
          extCreatorUrl = sourceLinkForPost;
          extCreatorPlatform = extPlatform;
        }
      } else {
        sourceUserLabel = profile?.handle
          ? `@${profile.handle}`
          : profile?.display_name ?? "@anonymous";
        sourceLinkForPost =
          selfSourceUrl.trim() || `promptfeed://${userId}/${postId}`;
      }

      const supabase = createClient();
      const { error: insertErr } = await supabase.from("posts").insert({
        id: postId,
        owner_id: userId,
        media_url: resultUrl,
        media_type: "image",
        thumbnail_url: resultUrl,
        prompt: prompt.trim(),
        model_slug: modelSlug,
        platform_slug: platformSlug,
        source_user: sourceUserLabel,
        source_url: sourceLinkForPost,
        posted_at: new Date().toISOString(),
        prompt_type: promptType,
        source_image_url: sourceUrl,
        extra_image_urls: extraUrls,
        external_creator_handle: extCreatorHandle,
        external_creator_url: extCreatorUrl,
        external_creator_platform: extCreatorPlatform,
      });
      if (insertErr) throw insertErr;

      toast.success("Prompt published");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      console.error("add-prompt failed", e);
      const msg =
        e instanceof Error
          ? e.message
          : e && typeof e === "object" && "message" in e
            ? String((e as { message: unknown }).message)
            : null;
      setError(msg ?? "Could not add prompt.");
    } finally {
      setSubmitting(false);
    }
  }

  const modelOptions: SelectOption<string>[] = models.map((m) => ({
    value: m.slug,
    label: m.name,
    icon: <BrandSquare visual={modelVisual(m.slug)} size={20} />,
    meta: `${formatCount(m.post_count)} posts`,
  }));
  const platformOptions: SelectOption<string>[] = platforms.map((p) => ({
    value: p.slug,
    label: p.name,
    icon: isPlatformSlug(p.slug) ? (
      <PlatformBadge platform={p.slug} size={20} rounded={5} />
    ) : (
      <span className="h-5 w-5 rounded-[5px] bg-surface-2" />
    ),
    meta: `${formatCount(p.post_count)} posts`,
  }));
  const extPlatformOptions: SelectOption<PlatformSlug>[] = (
    ["x", "instagram", "reddit", "youtube", "tiktok", "other"] as PlatformSlug[]
  ).map((slug) => ({
    value: slug,
    label: PLATFORM_THEME[slug].label,
    icon: <PlatformBadge platform={slug} size={20} rounded={5} />,
  }));

  const extIsOther = extPlatform === "other";

  const promptCount = prompt.length;
  const promptNearLimit = promptCount > PROMPT_MAX * 0.9;

  const canSubmit = useMemo(() => {
    if (!result.file) return false;
    if (promptType === "remix" && !source.file) return false;
    if (prompt.trim().length < 6) return false;
    if (prompt.length > PROMPT_MAX) return false;
    if (!modelSlug || !platformSlug) return false;
    if (attribution === "reference") {
      if (extPlatform === "other") {
        if (!extUrl.trim() && !extHandle.trim()) return false;
      } else if (!extHandle.trim()) {
        return false;
      }
    }
    return !submitting;
  }, [
    result.file,
    promptType,
    source.file,
    prompt,
    modelSlug,
    platformSlug,
    attribution,
    extHandle,
    extUrl,
    extPlatform,
    submitting,
  ]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChangeInternal}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="pf-modal-content fixed left-1/2 top-1/2 z-[70] flex max-h-[94vh] w-[min(96vw,1120px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border bg-surface shadow-2xl"
          aria-describedby="add-prompt-desc"
        >
          <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
            <div className="flex items-start gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-text-muted">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <Dialog.Title className="text-[17px] font-semibold tracking-tight">
                  Publish a prompt
                </Dialog.Title>
                <p
                  id="add-prompt-desc"
                  className="mt-0.5 text-[13px] text-text-muted"
                >
                  Attribute it to yourself or reference the original creator.
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </Dialog.Close>
          </div>

          {/* ---------- BODY: two columns, content-sized ---------- */}
          <div className="grid grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,1fr)]">
            {/* LEFT: remix toggle + drop zones (fixed aspect, landscape-friendly) */}
            <div className="flex flex-col gap-3 border-b bg-surface-2/40 p-5 lg:border-b-0 lg:border-r">
              <label className="flex items-center gap-2.5 rounded-[10px] border bg-surface px-3 py-2 text-[13px] font-medium text-text">
                <input
                  type="checkbox"
                  checked={promptType === "remix"}
                  onChange={(e) =>
                    setPromptType(e.target.checked ? "remix" : "standard")
                  }
                  className="h-4 w-4 cursor-pointer accent-accent"
                />
                <Wand2 className="h-4 w-4" strokeWidth={1.8} />
                <span>Image-to-image remix</span>
                <span className="ml-auto text-[11px] font-normal text-text-subtle">
                  {promptType === "remix" ? "Input + Output" : "Single result"}
                </span>
              </label>

              {promptType === "remix" ? (
                <div className="grid grid-cols-2 gap-3">
                  <AspectDropZone
                    label="Input"
                    inputRef={sourceInputRef}
                    slot={source}
                    onPick={(f) => pickFile("source", f)}
                    onClear={() => clearSlot("source")}
                    dragging={dragging === "source"}
                    onDragState={(d) => setDragging(d ? "source" : null)}
                  />
                  <AspectDropZone
                    label="Output"
                    inputRef={resultInputRef}
                    slot={result}
                    onPick={(f) => pickFile("result", f)}
                    onClear={() => clearSlot("result")}
                    dragging={dragging === "result"}
                    onDragState={(d) => setDragging(d ? "result" : null)}
                  />
                </div>
              ) : (
                <AspectDropZone
                  label="Image"
                  inputRef={resultInputRef}
                  slot={result}
                  onPick={(f) => pickFile("result", f)}
                  onClear={() => clearSlot("result")}
                  dragging={dragging === "result"}
                  onDragState={(d) => setDragging(d ? "result" : null)}
                />
              )}

              {promptType === "standard" ? (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
                    Extra images (optional)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {extras.map((slot, i) => (
                      <MiniSlot
                        key={i}
                        slot={slot}
                        onPick={(f) => setExtra(i, f)}
                        onClear={() => setExtra(i, null)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="text-[11px] text-text-subtle">
                Any aspect ratio works — 16:9 landscape, 1:1 square, 9:16
                portrait. Cards show a <b>+N</b> badge when a post has extras.
              </p>
            </div>

            {/* RIGHT: form */}
            <div className="flex flex-col gap-3.5 p-5">
              {/* Attribution */}
              <Tabs.Root
                value={attribution}
                onValueChange={(v) => setAttribution(v as AttributionMode)}
                className="flex flex-col gap-2"
              >
                <Tabs.List className="inline-flex gap-1 self-start rounded-[10px] border bg-surface-2/40 p-1">
                  <Tabs.Trigger
                    value="self"
                    className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-text-muted outline-none transition-colors data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-surface"
                  >
                    <UserIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Myself {profile?.handle ? `(@${profile.handle})` : ""}
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="reference"
                    className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-text-muted outline-none transition-colors data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-surface"
                  >
                    <AtSign className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Another creator
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="self" className="outline-none">
                  <div className="flex items-center gap-2 rounded-[10px] border bg-surface px-3 py-2.5 focus-within:border-border-strong">
                    <LinkIcon
                      className="h-3.5 w-3.5 shrink-0 text-text-subtle"
                      strokeWidth={1.8}
                    />
                    <input
                      value={selfSourceUrl}
                      onChange={(e) => setSelfSourceUrl(e.target.value)}
                      placeholder="Your source URL (optional)"
                      className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
                    />
                  </div>
                </Tabs.Content>

                <Tabs.Content value="reference" className="outline-none">
                  <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-2">
                    <PrettySelect
                      value={extPlatform}
                      onValueChange={(v) => setExtPlatform(v)}
                      options={extPlatformOptions}
                      ariaLabel="External platform"
                    />
                    <div className="flex items-center gap-2 rounded-[10px] border bg-surface px-3 py-2.5 focus-within:border-border-strong">
                      <AtSign
                        className="h-3.5 w-3.5 shrink-0 text-text-subtle"
                        strokeWidth={1.8}
                      />
                      <input
                        value={extHandle}
                        onChange={(e) =>
                          setExtHandle(e.target.value.replace(/^@+/, ""))
                        }
                        placeholder={
                          extIsOther
                            ? "handle (optional)"
                            : "handle (required)"
                        }
                        className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 rounded-[10px] border bg-surface px-3 py-2.5 focus-within:border-border-strong">
                    <LinkIcon
                      className="h-3.5 w-3.5 shrink-0 text-text-subtle"
                      strokeWidth={1.8}
                    />
                    <input
                      value={extUrl}
                      onChange={(e) => setExtUrl(e.target.value)}
                      placeholder={
                        extIsOther
                          ? "Source URL (required — https://…)"
                          : `Source URL (optional — ${PLATFORM_THEME[extPlatform].urlPrefix}...)`
                      }
                      className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
                    />
                  </div>
                  {extIsOther ? (
                    <p className="mt-1.5 text-[11px] text-text-subtle">
                      Use this when the source isn&apos;t a social profile — a
                      blog, portfolio, article, or any webpage.
                    </p>
                  ) : null}
                </Tabs.Content>
              </Tabs.Root>

              <div className="h-px w-full bg-border" />

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[12px] font-medium text-text-muted">
                  <span>
                    Prompt<span className="ml-0.5 text-red-500">*</span>
                  </span>
                  <span
                    className={cn(
                      "tabular-nums text-[11px]",
                      promptNearLimit ? "text-amber-500" : "text-text-subtle",
                      promptCount > PROMPT_MAX && "text-red-500",
                    )}
                  >
                    {promptCount} / {PROMPT_MAX}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={PROMPT_MAX + 100}
                  rows={6}
                  placeholder="Cinematic photograph of a cat astronaut, 35mm film grain…"
                  className="resize-none rounded-[10px] border bg-surface px-3.5 py-2.5 text-[13px] leading-[1.55] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              {/* Model + Platform */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-text-muted">
                    Model<span className="ml-0.5 text-red-500">*</span>
                  </span>
                  <PrettySelect
                    value={modelSlug}
                    onValueChange={setModelSlug}
                    options={modelOptions}
                    ariaLabel="Model"
                    placeholder="Pick a model"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-text-muted">
                    Platform<span className="ml-0.5 text-red-500">*</span>
                  </span>
                  <PrettySelect
                    value={platformSlug}
                    onValueChange={setPlatformSlug}
                    options={platformOptions}
                    ariaLabel="Platform"
                    placeholder="Pick a platform"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t bg-surface px-6 py-3.5">
            <div className="text-[11px] text-text-subtle">
              Will be published as{" "}
              <b className="text-text-muted">
                {attribution === "reference"
                  ? extHandle
                    ? `@${extHandle}`
                    : extIsOther
                      ? hostnameFromUrl(extUrl) ?? "web source"
                      : "@creator"
                  : profile?.handle
                    ? `@${profile.handle}`
                    : "admin"}
              </b>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChangeInternal(false)}
                className="rounded-[10px] border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" strokeWidth={2} />
                )}
                Publish prompt
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* --------------- MiniSlot (square extra-image slot) --------------- */

interface MiniSlotProps {
  slot: FileSlot;
  onPick: (f: File | null) => void;
  onClear: () => void;
}

function MiniSlot({ slot, onPick, onClear }: MiniSlotProps) {
  return (
    <label
      className={cn(
        "group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border-2 border-dashed bg-surface-2/60 transition-colors",
        slot.url
          ? "border-solid border-border bg-black"
          : "hover:border-border-strong hover:bg-surface-2",
      )}
    >
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
      {slot.url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slot.url}
            alt="extra"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            aria-label="Remove extra image"
            onClick={(e) => {
              e.preventDefault();
              onClear();
            }}
            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-red-500"
          >
            <Trash2 className="h-3 w-3" strokeWidth={2} />
          </button>
        </>
      ) : (
        <div className="grid h-7 w-7 place-items-center rounded-full bg-surface text-text-muted shadow-surface">
          <UploadCloud className="h-3.5 w-3.5" strokeWidth={1.8} />
        </div>
      )}
    </label>
  );
}

/* --------------- AspectDropZone (4:3 landscape-friendly) --------------- */

interface AspectDropZoneProps {
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  slot: FileSlot;
  onPick: (f: File | null) => void;
  onClear: () => void;
  dragging: boolean;
  onDragState: (d: boolean) => void;
}

function AspectDropZone({
  label,
  inputRef,
  slot,
  onPick,
  onClear,
  dragging,
  onDragState,
}: AspectDropZoneProps) {
  return (
    <label
      onDragEnter={(e) => {
        e.preventDefault();
        onDragState(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragState(true);
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragState(false);
        onPick(e.dataTransfer.files?.[0] ?? null);
      }}
      className={cn(
        "group relative flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[14px] border-2 border-dashed bg-surface-2/60 transition-all",
        slot.url
          ? "border-solid border-border bg-black"
          : "hover:border-border-strong hover:bg-surface-2",
        dragging && "border-accent bg-accent/5 ring-2 ring-accent/20",
      )}
    >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="sr-only"
        />

        {slot.url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slot.url}
              alt={label}
              className="absolute inset-0 h-full w-full object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10">
              <div className="min-w-0 text-[11px] text-white/80">
                <div className="truncate font-medium text-white">
                  {slot.file?.name}
                </div>
                <div className="flex items-center gap-1.5 text-white/70">
                  {slot.dims ? (
                    <span>
                      {slot.dims.w} × {slot.dims.h}
                    </span>
                  ) : null}
                  {slot.file ? (
                    <>
                      <span>·</span>
                      <span>{formatBytes(slot.file.size)}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-black">
                  <UploadCloud className="h-3 w-3" strokeWidth={2} />
                  Replace
                </span>
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={(e) => {
                    e.preventDefault();
                    onClear();
                  }}
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-surface text-text-muted shadow-surface">
              <UploadCloud className="h-6 w-6" strokeWidth={1.6} />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-text">
                {dragging ? "Drop it" : "Drag an image here"}
              </div>
              <div className="mt-0.5 text-[12px] text-text-muted">
                or{" "}
                <span className="underline decoration-text-subtle decoration-dotted underline-offset-2">
                  click to browse
                </span>
              </div>
            </div>
          </div>
        )}
    </label>
  );
}
