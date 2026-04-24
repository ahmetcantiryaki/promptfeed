"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AtSign, Download, Save } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import type {
  AvatarConfig,
  PlatformSlug,
  Profile,
  SocialAccount,
} from "@/types/domain";
import type { Json } from "@/types/database";
import { createClient } from "@/lib/supabase/browser";
import { PlatformBadge, PLATFORM_THEME } from "@/lib/platform-icon";
import { rasterizeAvatar, randomAvatarConfig } from "@/lib/avatar";
import { AvatarEditor, type AvatarEditorHandle } from "./avatar-editor";

const PLATFORMS: PlatformSlug[] = [
  "x",
  "instagram",
  "reddit",
  "youtube",
  "tiktok",
];

interface Props {
  user: User;
  profile: Profile | null;
  socials: SocialAccount[];
  onSaved?: () => void;
  /** When true, show the secondary "Download PNG" action. Default true. */
  showDownload?: boolean;
}

function handleFromEmail(email: string | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  return local
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 24);
}

function isValidHandle(handle: string): boolean {
  return /^[a-z0-9_]{3,24}$/i.test(handle);
}

function toAvatarConfig(json: unknown): AvatarConfig | null {
  if (!json || typeof json !== "object") return null;
  return json as AvatarConfig;
}

export function ProfileEditor({
  user,
  profile,
  socials,
  onSaved,
  showDownload = true,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<AvatarEditorHandle>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [handle, setHandle] = useState(
    profile?.handle ?? handleFromEmail(user.email ?? ""),
  );
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatar, setAvatar] = useState<AvatarConfig>(
    () => toAvatarConfig(profile?.avatar_config) ?? randomAvatarConfig(),
  );
  const initialSocials = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of socials) map[s.platform] = s.handle;
    return map;
  }, [socials]);
  const [social, setSocial] = useState<Record<string, string>>(initialSocials);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(true);
  }, [displayName, handle, bio, avatar, social]);

  useEffect(() => {
    // Initial mount shouldn't be "dirty"
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadAvatarPng(): Promise<string | null> {
    const host = editorRef.current?.getPreviewHost();
    if (!host) return null;
    try {
      const blob = await rasterizeAvatar(host, 512);
      const supabase = createClient();
      const path = `${user.id}/avatar.png`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      return `${data.publicUrl}?v=${Date.now()}`;
    } catch (e) {
      console.error("avatar upload failed:", e);
      return null;
    }
  }

  async function downloadAvatar() {
    const host = editorRef.current?.getPreviewHost();
    if (!host) return;
    try {
      const blob = await rasterizeAvatar(host, 512);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `promptfeed-avatar-${handle || user.id.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export PNG");
    }
  }

  async function save() {
    setError(null);
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    if (!isValidHandle(handle)) {
      setError(
        "Handle must be 3–24 characters: letters, numbers, or underscore.",
      );
      return;
    }
    setSaving(true);
    try {
      const avatarUrl = await uploadAvatarPng();
      const supabase = createClient();
      const profilePayload = {
        id: user.id,
        display_name: displayName.trim(),
        handle: handle.trim().toLowerCase(),
        bio: bio.trim() || null,
        avatar_config: avatar as unknown as Json,
        avatar_url: avatarUrl,
      };
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(profilePayload);
      if (profileErr) {
        if (profileErr.code === "23505") {
          setError("That handle is already taken — try another.");
        } else {
          setError(profileErr.message);
        }
        return;
      }

      const cleaned = PLATFORMS.map((p) => ({
        platform: p,
        handle: social[p]?.trim() ?? "",
      })).filter((r) => r.handle.length > 0);

      await supabase.from("social_accounts").delete().eq("profile_id", user.id);
      if (cleaned.length > 0) {
        const { error: socErr } = await supabase.from("social_accounts").insert(
          cleaned.map((r) => ({
            profile_id: user.id,
            platform: r.platform,
            handle: r.handle.replace(/^@+/, ""),
            url:
              PLATFORM_THEME[r.platform].urlPrefix +
              r.handle.replace(/^@+/, ""),
          })),
        );
        if (socErr) {
          setError(socErr.message);
          return;
        }
      }

      toast.success("Profile saved");
      setDirty(false);
      router.refresh();
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Avatar editor column — fixed 280px on lg+, full width stacked below */}
        <div className="flex flex-col items-center gap-3 rounded-[12px] border bg-surface-2/40 p-4">
          <AvatarEditor
            ref={editorRef}
            config={avatar}
            onChange={setAvatar}
            size={140}
          />
          {showDownload ? (
            <button
              type="button"
              onClick={downloadAvatar}
              className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
              Download PNG
            </button>
          ) : null}
        </div>

        {/* Form column */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Display name"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Alex Rivers"
              required
            />
            <HandleField value={handle} onChange={setHandle} />
          </div>

          <Field
            label="Bio"
            value={bio}
            onChange={setBio}
            placeholder="What kind of prompts do you make?"
            textarea
          />

          <section className="flex flex-col gap-2.5">
            <div>
              <div className="text-[13px] font-semibold text-text">
                Social accounts
              </div>
              <div className="text-[11px] text-text-subtle">
                Add handles so visitors can find your feed on other platforms.
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {PLATFORMS.map((p) => (
                <SocialRow
                  key={p}
                  platform={p}
                  value={social[p] ?? ""}
                  onChange={(v) =>
                    setSocial((prev) => ({ ...prev, [p]: v }))
                  }
                />
              ))}
            </div>
          </section>

          {error ? (
            <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer row inside the editor */}
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="text-[11px] text-text-subtle">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-4 py-2 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" strokeWidth={2} />
          )}
          Save profile
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const shared =
    "rounded-[10px] border bg-surface px-3.5 py-2.5 text-[14px] text-text placeholder:text-text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30";
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-text-muted">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={shared}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={shared}
        />
      )}
    </label>
  );
}

function HandleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-text-muted">
        Handle<span className="ml-0.5 text-red-500">*</span>
      </span>
      <div className="flex items-center gap-1.5 rounded-[10px] border bg-surface px-3 py-2.5 focus-within:border-border-strong focus-within:ring-2 focus-within:ring-accent/30">
        <AtSign className="h-3.5 w-3.5 text-text-subtle" strokeWidth={1.8} />
        <input
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "")
                .slice(0, 24),
            )
          }
          placeholder="promptmaster"
          className="flex-1 bg-transparent text-[14px] text-text placeholder:text-text-subtle focus:outline-none"
        />
      </div>
    </label>
  );
}

function SocialRow({
  platform,
  value,
  onChange,
}: {
  platform: PlatformSlug;
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = PLATFORM_THEME[platform];
  const prefix = theme.urlPrefix
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "/");
  return (
    <div className="flex items-center gap-2 rounded-[10px] border bg-surface p-2 transition-colors focus-within:border-border-strong focus-within:ring-2 focus-within:ring-accent/30">
      <PlatformBadge platform={platform} size={26} rounded={7} />
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="hidden shrink-0 text-[11px] text-text-subtle md:inline">
          {prefix}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/^@+/, ""))}
          placeholder={`${prefix}your_handle`}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle focus:outline-none"
          autoComplete="off"
        />
      </div>
      <span className="hidden shrink-0 pr-1 text-[11px] font-medium text-text-subtle sm:inline">
        {theme.label}
      </span>
    </div>
  );
}
