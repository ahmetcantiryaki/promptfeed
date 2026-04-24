"use client";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Shuffle, Ban } from "lucide-react";
import type { AvatarConfig } from "@/types/domain";
import {
  BG_COLORS,
  EAR_SIZES,
  EYE_STYLES,
  EYEBROW_STYLES,
  FACE_COLORS,
  GLASSES_STYLES,
  HAIR_COLORS,
  HAIR_STYLES_MAN,
  HAIR_STYLES_WOMAN,
  HAT_STYLES,
  MOUTH_STYLES,
  NOSE_STYLES,
  SHIRT_COLORS,
  SHIRT_STYLES,
  generatePresets,
  randomAvatarConfig,
} from "@/lib/avatar";
import Face from "@/lib/avatar-parts/face";
import Hair from "@/lib/avatar-parts/hair";
import Hat from "@/lib/avatar-parts/hat";
import Eyes from "@/lib/avatar-parts/eyes";
import Eyebrow from "@/lib/avatar-parts/eyebrow";
import Glasses from "@/lib/avatar-parts/glasses";
import Ear from "@/lib/avatar-parts/ear";
import Nose from "@/lib/avatar-parts/nose";
import Mouth from "@/lib/avatar-parts/mouth";
import Shirt from "@/lib/avatar-parts/shirt";
import { cn } from "@/lib/utils";

const NiceAvatar = dynamic(() => import("react-nice-avatar"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-full bg-surface-2" />,
});

interface Props {
  config: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
  size?: number;
}

export interface AvatarEditorHandle {
  getPreviewHost: () => HTMLDivElement | null;
}

function nextOf<T>(list: readonly T[], current: T | undefined): T {
  if (list.length === 0) throw new Error("empty list");
  const idx = current === undefined ? -1 : list.indexOf(current);
  return list[(idx + 1) % list.length] as T;
}

function nextColor(list: readonly string[], current: string | undefined): string {
  const norm = current?.toLowerCase();
  const idx = norm ? list.findIndex((c) => c.toLowerCase() === norm) : -1;
  return list[(idx + 1) % list.length] as string;
}

function prettyValue(v: unknown): string {
  if (v === undefined || v === null) return "—";
  const s = String(v);
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const AvatarEditor = forwardRef<AvatarEditorHandle, Props>(
  function AvatarEditor({ config, onChange, size = 140 }, ref) {
    const previewRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => ({
      getPreviewHost: () => previewRef.current,
    }));

    // Presets regenerate on mount and on explicit shuffle.
    const [presets, setPresets] = useState<AvatarConfig[]>(() => generatePresets());

    const patch = (partial: Partial<AvatarConfig>) =>
      onChange({ ...config, ...partial });

    const hairStyles =
      config.sex === "woman" ? HAIR_STYLES_WOMAN : HAIR_STYLES_MAN;

    const currentPresetKey = useMemo(
      () =>
        JSON.stringify({
          h: config.hairStyle,
          hc: config.hairColor,
          fc: config.faceColor,
          bc: config.bgColor,
          ht: config.hatStyle,
        }),
      [config],
    );

    return (
      <Tooltip.Provider delayDuration={120} skipDelayDuration={60}>
        <div className="flex w-full flex-col items-center gap-5">
          {/* ---------- Preview ---------- */}
          <div className="flex flex-col items-center gap-3">
            <div
              ref={previewRef}
              className="overflow-hidden rounded-full border shadow-surface"
              style={{ width: size, height: size }}
            >
              {/* NiceAvatar draws its own circular bg; no wrapper bg so
                  html-to-image preserves transparent corners. */}
              <NiceAvatar style={{ width: size, height: size }} {...config} />
            </div>

            <SegControl
              value={config.sex ?? "man"}
              options={[
                { value: "man", label: "Man" },
                { value: "woman", label: "Woman" },
              ]}
              onChange={(v) =>
                patch({
                  sex: v as "man" | "woman",
                  hairStyle: v === "woman" ? "womanLong" : "normal",
                  eyeBrowStyle: v === "woman" ? "upWoman" : "up",
                })
              }
            />

            <button
              type="button"
              onClick={() => onChange(randomAvatarConfig())}
              className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3.5 py-2 text-[12px] font-medium text-text transition-colors hover:bg-hover"
            >
              <Shuffle className="h-3.5 w-3.5" strokeWidth={1.8} />
              Shuffle avatar
            </button>
          </div>

          {/* ---------- Controls ---------- */}
          <div className="flex w-full flex-col gap-4">
            {/* Chip toolbar */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-[14px] border bg-surface-2 p-1.5">
              <ToolChip
                tip="Face"
                value={config.faceColor}
                onClick={() =>
                  patch({ faceColor: nextColor(FACE_COLORS, config.faceColor) })
                }
              >
                <Face color={config.faceColor ?? "#F9C9B6"} />
              </ToolChip>

              <ToolChip
                tip="Hair"
                value={config.hairStyle}
                onClick={() =>
                  patch({ hairStyle: nextOf(hairStyles, config.hairStyle) })
                }
              >
                <Hair
                  style={config.hairStyle ?? "normal"}
                  color={config.hairColor ?? "#000"}
                  colorRandom={false}
                />
              </ToolChip>

              <ToolChip
                tip="Hair color"
                value={config.hairColor}
                onClick={() =>
                  patch({ hairColor: nextColor(HAIR_COLORS, config.hairColor) })
                }
              >
                <Swatch color={config.hairColor} />
              </ToolChip>

              <ToolChip
                tip="Hat"
                value={config.hatStyle}
                onClick={() =>
                  patch({ hatStyle: nextOf(HAT_STYLES, config.hatStyle) })
                }
              >
                {config.hatStyle && config.hatStyle !== "none" ? (
                  <Hat
                    style={config.hatStyle}
                    color={config.hatColor ?? "#000"}
                  />
                ) : (
                  <DisabledDot />
                )}
              </ToolChip>

              <ToolChip
                tip="Eyes"
                value={config.eyeStyle}
                onClick={() =>
                  patch({ eyeStyle: nextOf(EYE_STYLES, config.eyeStyle) })
                }
              >
                <Eyes style={config.eyeStyle ?? "circle"} />
              </ToolChip>

              <ToolChip
                tip="Eyebrow"
                value={config.eyeBrowStyle}
                onClick={() =>
                  patch({
                    eyeBrowStyle: nextOf(EYEBROW_STYLES, config.eyeBrowStyle),
                  })
                }
              >
                <Eyebrow style={config.eyeBrowStyle ?? "up"} />
              </ToolChip>

              <ToolChip
                tip="Glasses"
                value={config.glassesStyle}
                onClick={() =>
                  patch({
                    glassesStyle: nextOf(GLASSES_STYLES, config.glassesStyle),
                  })
                }
              >
                {config.glassesStyle && config.glassesStyle !== "none" ? (
                  <Glasses style={config.glassesStyle} />
                ) : (
                  <DisabledDot />
                )}
              </ToolChip>

              <ToolChip
                tip="Ears"
                value={config.earSize}
                onClick={() =>
                  patch({ earSize: nextOf(EAR_SIZES, config.earSize) })
                }
              >
                <Ear
                  size={config.earSize ?? "small"}
                  color={config.faceColor ?? "#F9C9B6"}
                />
              </ToolChip>

              <ToolChip
                tip="Nose"
                value={config.noseStyle}
                onClick={() =>
                  patch({ noseStyle: nextOf(NOSE_STYLES, config.noseStyle) })
                }
              >
                <Nose style={config.noseStyle ?? "short"} />
              </ToolChip>

              <ToolChip
                tip="Mouth"
                value={config.mouthStyle}
                onClick={() =>
                  patch({ mouthStyle: nextOf(MOUTH_STYLES, config.mouthStyle) })
                }
              >
                <Mouth style={config.mouthStyle ?? "smile"} />
              </ToolChip>

              <ToolChip
                tip="Shirt"
                value={config.shirtStyle}
                onClick={() =>
                  patch({ shirtStyle: nextOf(SHIRT_STYLES, config.shirtStyle) })
                }
              >
                <Shirt
                  style={config.shirtStyle ?? "short"}
                  color={config.shirtColor ?? "#9287FF"}
                />
              </ToolChip>

              <ToolChip
                tip="Shirt color"
                value={config.shirtColor}
                onClick={() =>
                  patch({
                    shirtColor: nextColor(SHIRT_COLORS, config.shirtColor),
                  })
                }
              >
                <Swatch color={config.shirtColor} />
              </ToolChip>

              <ToolChip
                tip="Background"
                value={config.bgColor}
                onClick={() =>
                  patch({ bgColor: nextColor(BG_COLORS, config.bgColor) })
                }
              >
                <Swatch color={config.bgColor} />
              </ToolChip>
            </div>

            {/* Preset gallery */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
                  Pick a preset
                </div>
                <button
                  type="button"
                  onClick={() => setPresets(generatePresets())}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text active:scale-95"
                  aria-label="Shuffle presets"
                >
                  <Shuffle className="h-3 w-3" strokeWidth={1.8} />
                  Shuffle
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {presets.map((cfg, i) => {
                  const key = JSON.stringify({
                    h: cfg.hairStyle,
                    hc: cfg.hairColor,
                    fc: cfg.faceColor,
                    bc: cfg.bgColor,
                    ht: cfg.hatStyle,
                  });
                  const active = key === currentPresetKey;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onChange(cfg)}
                      aria-label={`Preset ${i + 1}`}
                      className={cn(
                        "aspect-square w-full overflow-hidden rounded-full border transition-transform hover:scale-105 active:scale-95",
                        active &&
                          "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                      )}
                      style={{ background: cfg.bgColor }}
                    >
                      <NiceAvatar
                        style={{ width: "100%", height: "100%" }}
                        {...cfg}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Tooltip.Provider>
    );
  },
);

interface ToolChipProps {
  tip: string;
  value: string | undefined;
  onClick: () => void;
  children: ReactNode;
}

function ToolChip({ tip, value, onClick, children }: ToolChipProps) {
  const valueLabel = prettyValue(value);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={`${tip}: ${valueLabel}`}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="pf-chip-jelly grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border bg-surface text-text transition-colors hover:bg-hover active:scale-90"
        >
          <span className="pf-chip-child block h-[22px] w-[22px]">
            {children}
          </span>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={8}
          className="z-[100] select-none rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg"
        >
          <span>{tip}</span>
          <span className="ml-1 text-zinc-400">· {valueLabel}</span>
          <Tooltip.Arrow className="fill-zinc-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function Swatch({ color }: { color: string | undefined }) {
  return (
    <span
      className="block h-full w-full rounded-full ring-1 ring-black/20 dark:ring-white/20"
      style={{ background: color ?? "var(--surface-2)" }}
    />
  );
}

function DisabledDot() {
  return (
    <span className="grid h-full w-full place-items-center rounded-full bg-surface-2 text-text-subtle">
      <Ban className="h-3 w-3" strokeWidth={2} />
    </span>
  );
}

function SegControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border bg-surface">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "px-4 py-2 text-[12px] font-medium transition-colors",
            value === o.value
              ? "bg-accent text-accent-fg"
              : "text-text-muted hover:bg-hover hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
