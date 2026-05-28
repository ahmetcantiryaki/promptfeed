"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Loader2,
  UploadCloud,
  Sparkles,
  ImagePlus,
  Trash2,
  Link as LinkIcon,
  Wand2,
  Braces,
  Image as ImageIcon,
  Film,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Model,
  Platform,
  Profile,
  SocialAccount,
  TagsByAxis,
} from "@/types/domain";
import { MIN_TAGS_PER_POST } from "@/types/domain";
import { TagAxisPicker } from "./tag-axis-picker";
import { createClient } from "@/lib/supabase/browser";
import { ModelBadge } from "@/lib/model-icon";
import { PlatformBadge, isPlatformSlug } from "@/lib/platform-icon";
import { parseSourceUrl, sourceDisplayLabel } from "@/lib/source-url";
import { PrettySelect, type SelectOption } from "@/components/ui/select";
import { tryParseJson, prettifyJson } from "@/lib/prompt-format";
import { processImage } from "@/lib/image-processing";
import { safeImageSrc } from "@/lib/safe-url";
import { cn, formatCount } from "@/lib/utils";
import {
  deriveTitleFromPrompt,
  slugify,
  TITLE_MAX_LEN,
  SLUG_MAX_LEN,
} from "@/lib/slug";
import { detectEmbedProvider } from "@/lib/video-embed";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  profile: Profile | null;
  socials: SocialAccount[];
  models: Model[];
  platforms: Platform[];
  tagsByAxis: TagsByAxis;
}

const MAX_SIZE_MB = 5;
const PROMPT_MAX = 32000;
const UPLOAD_CACHE_CONTROL = "31536000";

function isLikelyImageUrl(raw: string): boolean {
  return safeImageSrc(raw) !== null;
}

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
type MediaTypeSel = "image" | "video";

function isHttpsUrl(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** YouTube auto-poster: img.youtube.com/vi/{ID}/maxresdefault.jpg. */
function youtubePosterFromUrl(url: string): string | null {
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  const youtu = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  const embed = url.match(/youtube\.com\/(?:embed|shorts)\/([a-zA-Z0-9_-]{6,})/i);
  const id = watch?.[1] ?? youtu?.[1] ?? embed?.[1] ?? null;
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
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
  externalUrl: string;
}

const EMPTY_SLOT: FileSlot = {
  file: null,
  url: null,
  dims: null,
  externalUrl: "",
};

function slotIsFilled(s: FileSlot): boolean {
  return Boolean(s.file) || isLikelyImageUrl(s.externalUrl);
}

function slotPreviewUrl(s: FileSlot): string | null {
  if (s.file && s.url) return s.url;
  if (isLikelyImageUrl(s.externalUrl)) return s.externalUrl.trim();
  return null;
}

export function AddPromptDialog({
  open,
  onOpenChange,
  userId,
  profile: _profile,
  socials: _socials,
  models,
  platforms,
  tagsByAxis,
}: Props) {
  const router = useRouter();
  const [mediaType, setMediaType] = useState<MediaTypeSel>("image");
  const [promptType, setPromptType] = useState<PromptType>("standard");

  const [result, setResult] = useState<FileSlot>(EMPTY_SLOT);
  const [source, setSource] = useState<FileSlot>(EMPTY_SLOT);
  const [extras, setExtras] = useState<FileSlot[]>(() => [
    EMPTY_SLOT,
    EMPTY_SLOT,
    EMPTY_SLOT,
  ]);

  // Video mode — pure-embed architecture. Video is referenced by source
  // URL (provider iframe at render time) plus a poster image URL the
  // card and modal use for the preview.
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterAutoFilled, setPosterAutoFilled] = useState(false);

  const detectedProvider = useMemo(
    () => (videoUrl.trim() ? detectEmbedProvider(videoUrl.trim()) : null),
    [videoUrl],
  );

  // SEO/URL customization is collapsed by default to keep the form tight
  // — title and slug are auto-derived from the prompt body and only need
  // attention for the occasional override.
  const [showSeo, setShowSeo] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [modelSlug, setModelSlug] = useState(models[0]?.slug ?? "");
  const [platformSlug, setPlatformSlug] = useState(platforms[0]?.slug ?? "");
  const [tagSlugs, setTagSlugs] = useState<Set<string>>(() => new Set());

  const [creatorUrl, setCreatorUrl] = useState("");
  const parsedCreator = useMemo(
    () => parseSourceUrl(creatorUrl),
    [creatorUrl],
  );

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

  const parsedJson = useMemo(() => tryParseJson(prompt), [prompt]);
  const isJson = parsedJson !== null;

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
    const update: FileSlot = {
      file: selected,
      url,
      dims: null,
      externalUrl: "",
    };
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

  function setSlotExternalUrl(slot: "result" | "source", value: string) {
    setError(null);
    if (slot === "result") {
      if (result.url) URL.revokeObjectURL(result.url);
      if (resultInputRef.current) resultInputRef.current.value = "";
      setResult({ file: null, url: null, dims: null, externalUrl: value });
    } else {
      if (source.url) URL.revokeObjectURL(source.url);
      if (sourceInputRef.current) sourceInputRef.current.value = "";
      setSource({ file: null, url: null, dims: null, externalUrl: value });
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
      next[index] = { file, url, dims: null, externalUrl: "" };
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
    setTitle("");
    setTitleTouched(false);
    setSlug("");
    setSlugTouched(false);
    setCreatorUrl("");
    setPromptType("standard");
    setMediaType("image");
    setVideoUrl("");
    setPosterUrl("");
    setPosterAutoFilled(false);
    setShowSeo(false);
    setTagSlugs(new Set());
    setError(null);
  }

  function onChangeVideoUrl(next: string) {
    setVideoUrl(next);
    // Auto-fill poster from YouTube if the user hasn't touched it. Once
    // they hand-edit posterUrl the autofill stops chasing them.
    const yt = youtubePosterFromUrl(next);
    if (yt && (posterUrl === "" || posterAutoFilled)) {
      setPosterUrl(yt);
      setPosterAutoFilled(true);
    }
  }
  function onChangePosterUrl(next: string) {
    setPosterUrl(next);
    setPosterAutoFilled(false);
  }

  // Auto-fill title from prompt's first sentence until the user types in
  // the title field — once they edit, we stop overwriting.
  const previewTitle = useMemo(
    () => (titleTouched ? title : deriveTitleFromPrompt(prompt)),
    [titleTouched, title, prompt],
  );
  const previewSlug = useMemo(
    () => (slugTouched ? slugify(slug) : slugify(previewTitle)),
    [slugTouched, slug, previewTitle],
  );

  function onOpenChangeInternal(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  interface UploadedImage {
    mainUrl: string;
    thumbUrl: string;
  }

  async function uploadImage(
    file: File,
    postId: string,
    tag: string,
  ): Promise<UploadedImage> {
    const supabase = createClient();
    const processed = await processImage(file);
    const mainPath = `${userId}/${postId}-${tag}.webp`;
    const thumbPath = `${userId}/${postId}-${tag}-thumb.webp`;

    const [mainResult, thumbResult] = await Promise.all([
      supabase.storage.from("user-uploads").upload(mainPath, processed.full, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: UPLOAD_CACHE_CONTROL,
      }),
      supabase.storage.from("user-uploads").upload(thumbPath, processed.thumb, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: UPLOAD_CACHE_CONTROL,
      }),
    ]);
    if (mainResult.error) throw mainResult.error;
    if (thumbResult.error) throw thumbResult.error;

    const mainUrl = supabase.storage.from("user-uploads").getPublicUrl(mainPath)
      .data.publicUrl;
    const thumbUrl = supabase.storage
      .from("user-uploads")
      .getPublicUrl(thumbPath).data.publicUrl;
    return { mainUrl, thumbUrl };
  }

  async function resolveSlot(
    slot: FileSlot,
    postId: string,
    tag: string,
  ): Promise<UploadedImage | null> {
    if (slot.file) return await uploadImage(slot.file, postId, tag);
    if (isLikelyImageUrl(slot.externalUrl)) {
      const trimmed = slot.externalUrl.trim();
      return { mainUrl: trimmed, thumbUrl: trimmed };
    }
    return null;
  }

  async function submit() {
    setError(null);
    if (mediaType === "image") {
      if (!slotIsFilled(result)) {
        setError("Upload the result image or paste an image URL.");
        return;
      }
      if (promptType === "remix" && !slotIsFilled(source)) {
        setError("Remix prompts need the input image too.");
        return;
      }
    } else {
      if (!isHttpsUrl(videoUrl)) {
        setError("Paste the video URL (https://…).");
        return;
      }
      if (!isHttpsUrl(posterUrl)) {
        setError("Paste a poster image URL for the card preview.");
        return;
      }
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
    if (tagSlugs.size < MIN_TAGS_PER_POST) {
      setError("Pick at least one tag.");
      return;
    }
    if (!parsedCreator) {
      setError("Paste a valid source URL (https://…).");
      return;
    }

    setSubmitting(true);
    try {
      const postId = crypto.randomUUID();

      // Resolve media URLs depending on the chosen media type. Image mode
      // uploads (or accepts external URLs) like before; video mode uses
      // the source URL directly + a separate poster URL for the card.
      let mainMediaUrl: string;
      let thumbnailUrl: string;
      let sourceImageUrl: string | null = null;
      let extraUrls: string[] = [];

      if (mediaType === "image") {
        const resultImage = await resolveSlot(result, postId, "out");
        if (!resultImage) throw new Error("Result image is missing.");
        const sourceImage =
          promptType === "remix"
            ? await resolveSlot(source, postId, "in")
            : null;
        mainMediaUrl = resultImage.mainUrl;
        thumbnailUrl = resultImage.thumbUrl;
        sourceImageUrl = sourceImage?.mainUrl ?? null;

        if (promptType === "standard") {
          for (let i = 0; i < extras.length; i++) {
            const slot = extras[i];
            if (slot?.file) {
              const uploaded = await uploadImage(slot.file, postId, `x${i + 1}`);
              extraUrls.push(uploaded.mainUrl);
            }
          }
        }
      } else {
        mainMediaUrl = videoUrl.trim();
        thumbnailUrl = posterUrl.trim();
      }

      if (!parsedCreator) throw new Error("Source URL missing.");
      const sourceUserLabel = sourceDisplayLabel(parsedCreator);
      const sourceLinkForPost = parsedCreator.url;
      const extCreatorHandle = parsedCreator.handle;
      const extCreatorUrl = parsedCreator.url;
      const extCreatorPlatform = parsedCreator.platform;

      const supabase = createClient();
      // The BEFORE INSERT trigger (migration 0011) derives + uniqueifies
      // title/slug, but the regenerated types now require them NOT NULL. We
      // always send the previewed values; the trigger still appends `-2`,
      // `-3` … suffixes to slug on collision.
      const finalTitle = (titleTouched ? title.trim() : previewTitle).slice(
        0,
        TITLE_MAX_LEN,
      );
      const finalSlug = (slugTouched ? slugify(slug) : previewSlug).slice(
        0,
        SLUG_MAX_LEN,
      );
      const videoExtras =
        mediaType === "video"
          ? {
              embed_provider:
                detectedProvider ?? detectEmbedProvider(mainMediaUrl),
            }
          : {};

      const { error: insertErr } = await supabase.from("posts").insert({
        id: postId,
        owner_id: userId,
        media_url: mainMediaUrl,
        media_type: mediaType,
        thumbnail_url: thumbnailUrl,
        prompt: prompt.trim(),
        title: finalTitle || "Untitled prompt",
        slug: finalSlug || "prompt",
        model_slug: modelSlug,
        platform_slug: platformSlug,
        source_user: sourceUserLabel,
        source_url: sourceLinkForPost,
        posted_at: new Date().toISOString(),
        prompt_type: mediaType === "video" ? "standard" : promptType,
        source_image_url: sourceImageUrl,
        extra_image_urls: extraUrls,
        external_creator_handle: extCreatorHandle,
        external_creator_url: extCreatorUrl,
        external_creator_platform: extCreatorPlatform,
        ...videoExtras,
      });
      if (insertErr) throw insertErr;

      // Attach tags. If this fails we clean up the orphan post so the user
      // can retry with a clean slate (counter trigger reconciles itself).
      const tagRows = Array.from(tagSlugs).map((slug) => ({
        post_id: postId,
        tag_slug: slug,
      }));
      if (tagRows.length > 0) {
        const { error: tagsErr } = await supabase
          .from("post_tags")
          .insert(tagRows);
        if (tagsErr) {
          await supabase.from("posts").delete().eq("id", postId);
          throw tagsErr;
        }
      }

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

  function beautifyPrompt() {
    const pretty = prettifyJson(prompt);
    if (pretty !== null) setPrompt(pretty);
  }

  const modelOptions: SelectOption<string>[] = models.map((m) => ({
    value: m.slug,
    label: m.name,
    icon: <ModelBadge slug={m.slug} size={20} />,
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
  const promptCount = prompt.length;
  const promptNearLimit = promptCount > PROMPT_MAX * 0.9;

  const canSubmit = useMemo(() => {
    if (mediaType === "image") {
      if (!slotIsFilled(result)) return false;
      if (promptType === "remix" && !slotIsFilled(source)) return false;
    } else {
      if (!isHttpsUrl(videoUrl)) return false;
      if (!isHttpsUrl(posterUrl)) return false;
    }
    if (prompt.trim().length < 6) return false;
    if (prompt.length > PROMPT_MAX) return false;
    if (!modelSlug || !platformSlug) return false;
    if (tagSlugs.size < MIN_TAGS_PER_POST) return false;
    if (!parsedCreator) return false;
    return !submitting;
  }, [
    mediaType,
    result,
    promptType,
    source,
    videoUrl,
    posterUrl,
    prompt,
    modelSlug,
    platformSlug,
    tagSlugs,
    parsedCreator,
    submitting,
  ]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChangeInternal}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-modal-overlay fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="pf-modal-content fixed left-1/2 top-1/2 z-[70] flex max-h-[100dvh] w-[min(96vw,1120px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border bg-surface shadow-2xl"
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
                  Reference the original creator and attach the source.
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

          <div className="grid grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,1fr)]">
            {/* LEFT: media area (image upload OR video URL inputs) */}
            <div className="flex flex-col gap-3 overflow-y-auto border-b bg-surface-2/40 p-5 lg:border-b-0 lg:border-r">
              {/* Media type segmented control — picks the entire flow. */}
              <div
                role="radiogroup"
                aria-label="Media type"
                className="inline-flex overflow-hidden rounded-[10px] border bg-surface p-0.5"
              >
                {(
                  [
                    { key: "image", label: "Image", Icon: ImageIcon },
                    { key: "video", label: "Video", Icon: Film },
                  ] as const
                ).map(({ key, label, Icon }) => {
                  const active = mediaType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMediaType(key)}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-text text-bg"
                          : "text-text-muted hover:bg-hover hover:text-text",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {mediaType === "video" ? (
                <VideoSection
                  videoUrl={videoUrl}
                  posterUrl={posterUrl}
                  detectedProvider={detectedProvider}
                  onChangeVideoUrl={onChangeVideoUrl}
                  onChangePosterUrl={onChangePosterUrl}
                />
              ) : (
                <>
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
                  <SlotPicker
                    label="Input"
                    inputRef={sourceInputRef}
                    slot={source}
                    onPick={(f) => pickFile("source", f)}
                    onClear={() => clearSlot("source")}
                    onUrlChange={(v) => setSlotExternalUrl("source", v)}
                    dragging={dragging === "source"}
                    onDragState={(d) => setDragging(d ? "source" : null)}
                  />
                  <SlotPicker
                    label="Output"
                    inputRef={resultInputRef}
                    slot={result}
                    onPick={(f) => pickFile("result", f)}
                    onClear={() => clearSlot("result")}
                    onUrlChange={(v) => setSlotExternalUrl("result", v)}
                    dragging={dragging === "result"}
                    onDragState={(d) => setDragging(d ? "result" : null)}
                  />
                </div>
              ) : (
                <SlotPicker
                  label="Image"
                  inputRef={resultInputRef}
                  slot={result}
                  onPick={(f) => pickFile("result", f)}
                  onClear={() => clearSlot("result")}
                  onUrlChange={(v) => setSlotExternalUrl("result", v)}
                  dragging={dragging === "result"}
                  onDragState={(d) => setDragging(d ? "result" : null)}
                />
              )}

              {promptType === "standard" ? (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
                    Extra images (optional)
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                </>
              )}
            </div>

            {/* RIGHT: form */}
            <div className="flex flex-col gap-3.5 overflow-y-auto p-5">
              {/* Source URL — single field, platform + handle parsed from it */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-text-muted">
                  <LinkIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Source URL<span className="text-red-500">*</span>
                </div>
                <div className="flex items-center gap-2 rounded-[10px] border bg-surface px-3 py-2.5 focus-within:border-border-strong">
                  <LinkIcon
                    className="h-3.5 w-3.5 shrink-0 text-text-subtle"
                    strokeWidth={1.8}
                  />
                  <input
                    value={creatorUrl}
                    onChange={(e) => setCreatorUrl(e.target.value)}
                    placeholder="https://x.com/handle, instagram.com/handle, or any URL"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
                  />
                </div>
                {parsedCreator ? (
                  <div className="flex items-center gap-2 rounded-[8px] border bg-surface-2/60 px-2.5 py-1.5 text-[12px]">
                    <PlatformBadge
                      platform={parsedCreator.platform}
                      size={18}
                      rounded={5}
                    />
                    <span className="font-semibold text-text">
                      {sourceDisplayLabel(parsedCreator)}
                    </span>
                    {parsedCreator.handle === null &&
                    parsedCreator.platform !== "web" ? (
                      <span className="text-text-subtle">
                        · no handle in URL — will link to source
                      </span>
                    ) : null}
                  </div>
                ) : creatorUrl.trim() ? (
                  <p className="text-[11px] text-red-500">
                    Could not parse URL — paste a valid https:// link.
                  </p>
                ) : null}
              </div>

              <div className="h-px w-full bg-border" />

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-text-muted">
                  <span className="flex items-center gap-2">
                    Prompt<span className="text-red-500">*</span>
                    {isJson ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-[1px] text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-600">
                        <Braces className="h-2.5 w-2.5" strokeWidth={2.2} />
                        JSON
                      </span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-2">
                    {isJson ? (
                      <button
                        type="button"
                        onClick={beautifyPrompt}
                        className="text-[11px] font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
                      >
                        Beautify
                      </button>
                    ) : null}
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
                </div>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={PROMPT_MAX + 100}
                  rows={6}
                  spellCheck={!isJson}
                  placeholder={'Cinematic photograph of a cat astronaut…\n\nor JSON, e.g.:\n{ "subject": "cat", "lighting": "rim, cool" }'}
                  className={cn(
                    "resize-y rounded-[10px] border bg-surface px-3.5 py-2.5 text-[13px] leading-[1.55] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30 sm:min-h-[212px]",
                    isJson && "font-mono text-[12.5px]",
                  )}
                />
              </div>

              {/* Title + URL slug — collapsed by default. They auto-derive
                  from the prompt body, so most submissions never need to
                  open this section. */}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSeo((v) => !v)}
                  aria-expanded={showSeo}
                  className="flex items-center justify-between gap-2 rounded-[8px] py-1 text-[11px] font-medium text-text-subtle transition-colors hover:text-text"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        showSeo ? "rotate-0" : "-rotate-90",
                      )}
                      strokeWidth={2}
                    />
                    Customize title &amp; URL
                  </span>
                  {!showSeo ? (
                    <span className="truncate font-mono text-[10.5px] text-text-subtle">
                      /prompt/{previewSlug || "auto"}
                    </span>
                  ) : null}
                </button>
                {showSeo ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-text-muted">
                      <span>Title (SEO)</span>
                      <span className="text-[10px] text-text-subtle">
                        {previewTitle.length}/{TITLE_MAX_LEN}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={titleTouched ? title : previewTitle}
                      onFocus={() => {
                        if (!titleTouched) {
                          setTitle(previewTitle);
                          setTitleTouched(true);
                        }
                      }}
                      onChange={(e) => {
                        setTitleTouched(true);
                        setTitle(e.target.value.slice(0, TITLE_MAX_LEN));
                      }}
                      placeholder="Auto-derived from your prompt's first sentence"
                      maxLength={TITLE_MAX_LEN}
                      className="rounded-[10px] border bg-surface px-3 py-2 text-[13px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <div className="flex items-center justify-between gap-2 text-[11px] text-text-subtle">
                      <span>
                        URL slug:{" "}
                        <span className="font-mono text-text-muted">
                          /prompt/{previewSlug || "auto-generated"}
                        </span>
                      </span>
                    </div>
                    <input
                      type="text"
                      value={slugTouched ? slug : previewSlug}
                      onFocus={() => {
                        if (!slugTouched) {
                          setSlug(previewSlug);
                          setSlugTouched(true);
                        }
                      }}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(
                          e.target.value.toLowerCase().slice(0, SLUG_MAX_LEN),
                        );
                      }}
                      placeholder="auto-generated from title"
                      maxLength={SLUG_MAX_LEN}
                      className="rounded-[10px] border bg-surface px-3 py-2 font-mono text-[12px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                ) : null}
              </div>

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

              <TagAxisPicker
                tagsByAxis={tagsByAxis}
                selected={tagSlugs}
                onChange={setTagSlugs}
              />

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
                {parsedCreator ? sourceDisplayLabel(parsedCreator) : "—"}
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

interface VideoSectionProps {
  videoUrl: string;
  posterUrl: string;
  detectedProvider: string | null;
  onChangeVideoUrl: (v: string) => void;
  onChangePosterUrl: (v: string) => void;
}

/**
 * Video-mode left column. Two URL fields (source URL + poster URL) plus
 * a live provider hint and a small poster preview. No file upload — the
 * pure-embed architecture renders the source URL inside an iframe, so
 * we never host the video bytes ourselves.
 */
function VideoSection({
  videoUrl,
  posterUrl,
  detectedProvider,
  onChangeVideoUrl,
  onChangePosterUrl,
}: VideoSectionProps) {
  const providerLabel = detectedProvider
    ? detectedProvider === "x"
      ? "X (Twitter)"
      : detectedProvider === "youtube"
        ? "YouTube"
        : detectedProvider === "tiktok"
          ? "TikTok"
          : detectedProvider === "instagram"
            ? "Instagram"
            : detectedProvider === "reddit"
              ? "Reddit"
              : detectedProvider === "vimeo"
                ? "Vimeo"
                : detectedProvider
    : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5" strokeWidth={2} />
            Video source URL<span className="text-red-500">*</span>
          </span>
          {providerLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-600">
              {providerLabel}
            </span>
          ) : videoUrl.trim() ? (
            <span className="text-[10px] text-amber-500">
              Unknown provider — will fall back to &ldquo;Open at source&rdquo;
            </span>
          ) : null}
        </div>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => onChangeVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=… or any provider URL"
          className="rounded-[10px] border bg-surface px-3 py-2.5 text-[13px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-text-muted">
          Poster image URL<span className="text-red-500">*</span>
        </span>
        <input
          type="url"
          value={posterUrl}
          onChange={(e) => onChangePosterUrl(e.target.value)}
          placeholder="https://… (used for the card preview)"
          className="rounded-[10px] border bg-surface px-3 py-2.5 text-[13px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        {posterUrl && safeImageSrc(posterUrl) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <div className="mt-1 overflow-hidden rounded-[10px] border bg-black">
            <img
              src={posterUrl.trim()}
              alt="Poster preview"
              className="block aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-[10px] border bg-surface-2/40 px-3 py-2 text-[11px] leading-[1.5] text-text-subtle">
        Videos embed via iframe — we never host the bytes. Paste any
        public provider URL (YouTube, X, TikTok, Instagram, Reddit,
        Vimeo) and a poster image for the card preview.
      </div>
    </div>
  );
}

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
            className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-red-500 sm:h-6 sm:w-6"
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
  const previewUrl = slotPreviewUrl(slot);
  const isExternal = !slot.file && Boolean(previewUrl);
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
        previewUrl
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

      {previewUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={label}
            className="absolute inset-0 h-full w-full object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10">
            <div className="min-w-0 text-[11px] text-white/80">
              <div className="truncate font-medium text-white">
                {slot.file?.name ?? (isExternal ? "Linked image" : "")}
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
                {isExternal ? (
                  <span className="rounded-full bg-white/15 px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-[0.06em]">
                    URL
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {!isExternal ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-black">
                  <UploadCloud className="h-3 w-3" strokeWidth={2} />
                  Replace
                </span>
              ) : null}
              <button
                type="button"
                aria-label="Remove image"
                onClick={(e) => {
                  e.preventDefault();
                  onClear();
                }}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-red-500 sm:h-7 sm:w-7"
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

interface SlotPickerProps extends AspectDropZoneProps {
  onUrlChange: (value: string) => void;
}

function SlotPicker({ onUrlChange, ...rest }: SlotPickerProps) {
  const { slot } = rest;
  const hasFile = Boolean(slot.file);
  return (
    <div className="flex flex-col gap-1.5">
      <AspectDropZone {...rest} />
      <div
        className={cn(
          "flex items-center gap-2 rounded-[10px] border bg-surface px-2.5 py-1.5 transition-colors focus-within:border-border-strong",
          hasFile && "opacity-50",
        )}
        title={hasFile ? "Clear the file to paste a URL" : undefined}
      >
        <LinkIcon
          className="h-3.5 w-3.5 shrink-0 text-text-subtle"
          strokeWidth={1.8}
        />
        <input
          type="url"
          value={slot.externalUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          disabled={hasFile}
          placeholder="…or paste an image URL"
          className="min-w-0 flex-1 bg-transparent text-[12px] text-text placeholder:text-text-subtle focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
