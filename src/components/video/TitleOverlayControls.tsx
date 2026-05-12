import { Sparkles } from "lucide-react";
import { useEffect } from "react";

/**
 * TitleOverlayControls — burn-in title configurator.
 *
 * Empirically validated May 11, 2026: Seedance 2.0 renders text directly
 * into the output frame when the prompt names the typography style and the
 * literal text. The model respects named Google fonts (Tangerine, Noto Sans),
 * which we surface as preset styles below.
 *
 * SCOPE — only the two prompt templates the user A/B tested with success:
 *   - "font: Tangerine + Noto Sans, title \"…\""   → luxury (real-estate default)
 *   - "scribble title \"…\""                        → handwritten cursive
 *
 * Other style words ("san-serif", "elegant serif", "neon", "stamp") were
 * removed pending empirical validation — they may work, but until tested we
 * don't ship them as presets.
 */

export type TitleFontPreset =
  | "luxury"        // font: Tangerine + Noto Sans, — luxury real-estate default
  | "scribble";     // handwritten cursive — playful / casual

export type TitleTiming = "intro" | "middle" | "outro";

export interface TitleOverlayValue {
  enabled: boolean;
  text: string;
  fontStyle: TitleFontPreset;
  timing: TitleTiming;
}

interface TitleOverlayControlsProps {
  value: TitleOverlayValue;
  onChange: (next: TitleOverlayValue) => void;
  /** Auto-fill suggestion (e.g. listing address) used as a placeholder. */
  suggestedText?: string;
}

// Maps the preset to the literal Seedance prompt phrase we inject.
// These strings landed in user testing — do not edit without re-validating.
export const FONT_PRESET_TO_PROMPT: Record<TitleFontPreset, string> = {
  luxury: "font: Tangerine + Noto Sans,",
  scribble: "scribble",
};

const FONT_PRESETS: { id: TitleFontPreset; label: string; sample: string; sampleFont: string }[] = [
  {
    id: "luxury",
    label: "Luxury",
    sample: "Aa",
    sampleFont: "'Tangerine', 'Times New Roman', serif",
  },
  {
    id: "scribble",
    label: "Scribble",
    sample: "Aa",
    sampleFont: "'Caveat', 'Comic Sans MS', cursive",
  },
];

const TIMING_OPTIONS: { id: TitleTiming; label: string }[] = [
  { id: "intro", label: "Intro" },
  { id: "middle", label: "Middle" },
  { id: "outro", label: "Outro" },
];

export function TitleOverlayControls({
  value,
  onChange,
  suggestedText,
}: TitleOverlayControlsProps) {
  // Auto-populate the text field with the suggested value the first time
  // the user toggles overlay ON. Don't clobber anything the user has typed.
  useEffect(() => {
    if (value.enabled && !value.text && suggestedText) {
      onChange({ ...value, text: suggestedText });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.enabled]);

  const update = (partial: Partial<TitleOverlayValue>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="space-y-3">
      {/* Compact toggle row */}
      <label
        className="flex items-center gap-3 px-4 py-3 cursor-pointer border transition-colors"
        style={{
          backgroundColor: value.enabled ? "#0E0E0C" : "#F4EFE6",
          borderColor: value.enabled ? "#0E0E0C" : "var(--lux-hairline)",
          color: value.enabled ? "#F4EFE6" : "#0E0E0C",
        }}
      >
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
        <Sparkles className="h-4 w-4" style={{ color: value.enabled ? "#C9A96E" : "#8C7A52" }} />
        <span className="lux-display text-base leading-tight flex-1">
          Burn title into the video
        </span>
        <span
          className="lux-eyebrow hidden sm:inline"
          style={{
            color: value.enabled ? "#A39E94" : "#8C7A52",
            fontSize: 10,
            letterSpacing: "0.16em",
          }}
        >
          {value.enabled ? "ON" : "OFF"}
        </span>
      </label>

      {value.enabled && (
        <div
          className="space-y-3 p-4 border"
          style={{
            backgroundColor: "#F4EFE6",
            borderColor: "var(--lux-hairline)",
          }}
        >
          {/* Compact single-row text input */}
          <input
            type="text"
            value={value.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder={suggestedText || "Address, price, or short callout"}
            maxLength={80}
            className="w-full px-3 py-2 border bg-bone text-ink lux-prose text-sm focus:outline-none focus:border-ink"
            style={{
              borderColor: "var(--lux-hairline)",
              backgroundColor: "#FFFFFF",
            }}
          />

          {/* Style — only 2 presets, compact pill-style */}
          <div className="grid grid-cols-2 gap-2">
            {FONT_PRESETS.map((preset) => {
              const isSelected = value.fontStyle === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => update({ fontStyle: preset.id })}
                  className="flex items-center justify-center gap-2 px-3 py-2 border transition-colors"
                  style={{
                    backgroundColor: isSelected ? "#0E0E0C" : "#FFFFFF",
                    borderColor: isSelected ? "#0E0E0C" : "var(--lux-hairline)",
                    color: isSelected ? "#F4EFE6" : "#0E0E0C",
                  }}
                >
                  <span
                    className="leading-none"
                    style={{
                      fontFamily: preset.sampleFont,
                      fontSize: 22,
                      color: isSelected ? "#C9A96E" : "#8C7A52",
                    }}
                  >
                    {preset.sample}
                  </span>
                  <span className="lux-display text-sm leading-tight">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Timing — compact tri-toggle */}
          <div className="grid grid-cols-3 gap-2">
            {TIMING_OPTIONS.map((opt) => {
              const isSelected = value.timing === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => update({ timing: opt.id })}
                  className="px-2 py-2 border transition-colors lux-display text-xs"
                  style={{
                    backgroundColor: isSelected ? "#0E0E0C" : "#FFFFFF",
                    borderColor: isSelected ? "#0E0E0C" : "var(--lux-hairline)",
                    color: isSelected ? "#F4EFE6" : "#0E0E0C",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Convert a TitleOverlayValue into the API payload the edge function expects.
 * Returns undefined when overlay is disabled or text is empty.
 */
export function buildTextOverlayPayload(value: TitleOverlayValue) {
  if (!value.enabled || !value.text.trim()) return undefined;
  return {
    text: value.text.trim(),
    fontStyle: FONT_PRESET_TO_PROMPT[value.fontStyle],
    timing: value.timing,
  };
}

export const DEFAULT_TITLE_OVERLAY: TitleOverlayValue = {
  enabled: false,
  text: "",
  fontStyle: "luxury",
  timing: "middle",
};
