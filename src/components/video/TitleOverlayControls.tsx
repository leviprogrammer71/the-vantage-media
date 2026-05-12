import { Type, Sparkles } from "lucide-react";
import { useEffect } from "react";

/**
 * TitleOverlayControls — burn-in title configurator.
 *
 * Empirically validated May 11, 2026: Seedance 2.0 renders text directly
 * into the output frame when the prompt names the typography style and the
 * literal text. The model respects named Google fonts (Tangerine, Noto Sans),
 * which we surface as preset styles below.
 *
 * Working prompt patterns user A/B tested:
 *   - "scribble title \"0.25 acres\"" → handwritten cursive
 *   - "san-serif title \"1487 N Echo, Fresno, CA\"" → clean modern overlay
 *   - "font: Tangerine + Noto Sans, title \"1487 N Echo, Fresno, CA\""
 *       → luxury cursive heading + clean address line (BEST FOR REAL ESTATE)
 */

export type TitleFontPreset =
  | "luxury"        // font: Tangerine + Noto Sans, — luxury real-estate default
  | "scribble"      // handwritten cursive
  | "sans"          // clean san-serif
  | "serif"         // elegant serif
  | "neon"          // glowing modern
  | "stamp";        // bold display block

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
  sans: "san-serif",
  serif: "elegant serif",
  neon: "glowing neon",
  stamp: "bold block stamp",
};

const FONT_PRESETS: { id: TitleFontPreset; label: string; subtitle: string; sample: string; sampleFont: string }[] = [
  {
    id: "luxury",
    label: "Luxury",
    subtitle: "Tangerine + Noto Sans",
    sample: "1487 N Echo",
    sampleFont: "'Tangerine', 'Times New Roman', serif",
  },
  {
    id: "scribble",
    label: "Scribble",
    subtitle: "Handwritten cursive",
    sample: "0.25 acres",
    sampleFont: "'Caveat', 'Comic Sans MS', cursive",
  },
  {
    id: "sans",
    label: "Sans",
    subtitle: "Clean & modern",
    sample: "1487 N Echo",
    sampleFont: "system-ui, sans-serif",
  },
  {
    id: "serif",
    label: "Serif",
    subtitle: "Editorial display",
    sample: "1487 N Echo",
    sampleFont: "Georgia, 'Times New Roman', serif",
  },
  {
    id: "neon",
    label: "Neon",
    subtitle: "Glowing accent",
    sample: "Just listed",
    sampleFont: "system-ui, sans-serif",
  },
  {
    id: "stamp",
    label: "Stamp",
    subtitle: "Bold display block",
    sample: "FOR SALE",
    sampleFont: "Impact, 'Arial Black', sans-serif",
  },
];

const TIMING_OPTIONS: { id: TitleTiming; label: string; hint: string }[] = [
  { id: "intro", label: "Intro", hint: "Appears at the opening" },
  { id: "middle", label: "Middle", hint: "Reveals halfway through" },
  { id: "outro", label: "Outro", hint: "Lands at the closing beat" },
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
    <div className="space-y-5">
      {/* Toggle row */}
      <label
        className="flex items-start gap-4 p-5 cursor-pointer border transition-colors"
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
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4" style={{ color: value.enabled ? "#C9A96E" : "#8C7A52" }} />
            <span className="lux-display text-lg leading-tight">
              Burn title into the video
            </span>
          </div>
          <p
            className="lux-prose text-sm"
            style={{ color: value.enabled ? "#A39E94" : "#6B6760" }}
          >
            Seedance 2.0 renders the text directly into the frame —
            handwritten, luxury serif, or neon. No post-production needed.
          </p>
        </div>
      </label>

      {value.enabled && (
        <div
          className="space-y-6 p-5 border"
          style={{
            backgroundColor: "#F4EFE6",
            borderColor: "var(--lux-hairline)",
          }}
        >
          {/* Text input */}
          <div>
            <label className="lux-eyebrow mb-2 block" style={{ color: "var(--lux-brass)" }}>
              <Type className="inline h-3 w-3 mr-1" />
              Title text
            </label>
            <input
              type="text"
              value={value.text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder={suggestedText || "e.g., 1487 N Echo, Fresno, CA"}
              maxLength={80}
              className="w-full px-4 py-3 border bg-bone text-ink lux-prose text-base focus:outline-none focus:border-ink"
              style={{
                borderColor: "var(--lux-hairline)",
                backgroundColor: "#FFFFFF",
              }}
            />
            <div
              className="lux-eyebrow mt-1.5"
              style={{ color: "#8C7A52", fontSize: 10 }}
            >
              {value.text.length}/80 · Address, price, sq ft, or any short callout
            </div>
          </div>

          {/* Font preset grid */}
          <div>
            <label className="lux-eyebrow mb-3 block" style={{ color: "var(--lux-brass)" }}>
              Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONT_PRESETS.map((preset) => {
                const isSelected = value.fontStyle === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => update({ fontStyle: preset.id })}
                    className="text-left p-3 border transition-colors"
                    style={{
                      backgroundColor: isSelected ? "#0E0E0C" : "#FFFFFF",
                      borderColor: isSelected ? "#0E0E0C" : "var(--lux-hairline)",
                      color: isSelected ? "#F4EFE6" : "#0E0E0C",
                    }}
                  >
                    <div
                      className="text-xl leading-none mb-2"
                      style={{
                        fontFamily: preset.sampleFont,
                        color: isSelected ? "#F4EFE6" : "#0E0E0C",
                      }}
                    >
                      {preset.sample}
                    </div>
                    <div
                      className="lux-display text-sm leading-tight"
                      style={{ color: isSelected ? "#F4EFE6" : "#0E0E0C" }}
                    >
                      {preset.label}
                    </div>
                    <div
                      className="lux-eyebrow"
                      style={{
                        color: isSelected ? "#C9A96E" : "#8C7A52",
                        fontSize: 9,
                        letterSpacing: "0.14em",
                      }}
                    >
                      {preset.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timing toggle */}
          <div>
            <label className="lux-eyebrow mb-3 block" style={{ color: "var(--lux-brass)" }}>
              When does it appear?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIMING_OPTIONS.map((opt) => {
                const isSelected = value.timing === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update({ timing: opt.id })}
                    className="p-3 text-left border transition-colors"
                    style={{
                      backgroundColor: isSelected ? "#0E0E0C" : "#FFFFFF",
                      borderColor: isSelected ? "#0E0E0C" : "var(--lux-hairline)",
                      color: isSelected ? "#F4EFE6" : "#0E0E0C",
                    }}
                  >
                    <div className="lux-display text-sm leading-tight">{opt.label}</div>
                    <div
                      className="lux-eyebrow"
                      style={{
                        color: isSelected ? "#C9A96E" : "#8C7A52",
                        fontSize: 9,
                        letterSpacing: "0.14em",
                      }}
                    >
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
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
