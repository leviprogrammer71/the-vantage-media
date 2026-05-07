import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Download, Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { SUNO_PRESETS, type SunoPreset } from "@/lib/suno-presets";

const NO_MUSIC_LABEL = "No music (you'll add yours)";

const CATEGORY_LABELS: Record<NonNullable<SunoPreset["category"]>, string> = {
  "editorial-luxury":   "EDITORIAL · LUXURY",
  "cinema-anamorphic":  "CINEMA · ANAMORPHIC",
  "snappy-social":      "SNAPPY · SOCIAL FEED",
  "minimal-quiet":      "MINIMAL · QUIET",
  "world-vacation":     "WORLD · VACATION",
  "hybrid":             "HYBRID & SPECIALIST",
};

const CATEGORY_ORDER: SunoPreset["category"][] = [
  "editorial-luxury",
  "cinema-anamorphic",
  "snappy-social",
  "minimal-quiet",
  "world-vacation",
  "hybrid",
];

interface SunoMusicPickerProps {
  selectedLabel: string;
  onSelect: (label: string) => void;
}

/**
 * Music picker — surfaces all 31 pre-rendered Suno tracks (62 audio files)
 * grouped by category. Each row has an inline preview <audio>, a variant
 * toggle (A / B — Suno generates two takes per prompt), a Suno-prompt copy
 * button, and a download. One audio plays at a time.
 */
export function SunoMusicPicker({ selectedLabel, onSelect }: SunoMusicPickerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  // Map preset id → which variant is active. "v1" or "v2".
  const [variants, setVariants] = useState<Record<string, "v1" | "v2">>({});

  const grouped = useMemo(() => {
    const map = new Map<SunoPreset["category"], SunoPreset[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const p of SUNO_PRESETS) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return map;
  }, []);

  const audioFor = (p: SunoPreset) => (variants[p.id] === "v2" && p.audioVariant ? p.audioVariant : p.audio);

  const togglePlay = (p: SunoPreset) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => setPlayingId(null));
      audioRef.current.addEventListener("pause", () => {
        if (audioRef.current?.ended === false) {
          // pause from outside (e.g. another track started) — nothing extra
        }
      });
    }
    const url = audioFor(p);
    const id = `${p.id}::${variants[p.id] === "v2" ? "v2" : "v1"}`;
    if (playingId === id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      audioRef.current.src = url;
      audioRef.current.play().catch(() => {
        toast.error("Couldn't play preview — try downloading instead.");
        setPlayingId(null);
      });
      setPlayingId(id);
    }
  };

  const switchVariant = (p: SunoPreset) => {
    if (!p.audioVariant) return;
    setVariants((m) => ({ ...m, [p.id]: m[p.id] === "v2" ? "v1" : "v2" }));
    // If currently playing, swap the source mid-flight
    if (playingId?.startsWith(p.id)) {
      const next = variants[p.id] === "v2" ? p.audio : p.audioVariant;
      if (audioRef.current) {
        audioRef.current.src = next;
        audioRef.current.play().catch(() => {});
        setPlayingId(`${p.id}::${variants[p.id] === "v2" ? "v1" : "v2"}`);
      }
    }
  };

  // Stop on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return (
    <div>
      <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-ink)", fontWeight: 700 }}>
        MUSIC · 31 PRE-RENDERED TRACKS · CLICK PLAY TO PREVIEW
      </label>

      {/* No-music option — sits above the categories */}
      <button
        type="button"
        onClick={() => onSelect(NO_MUSIC_LABEL)}
        className="text-left p-3 w-full mb-3 transition-colors"
        style={{
          background: selectedLabel === NO_MUSIC_LABEL ? "var(--lux-ink)" : "var(--lux-bone)",
          color: selectedLabel === NO_MUSIC_LABEL ? "var(--lux-bone)" : "var(--lux-ink)",
          border: `1px solid ${selectedLabel === NO_MUSIC_LABEL ? "var(--lux-ink)" : "var(--lux-hairline-strong)"}`,
        }}
      >
        <div className="lux-eyebrow" style={{ fontSize: "0.62rem", letterSpacing: "0.18em", fontWeight: 700 }}>
          {NO_MUSIC_LABEL}
        </div>
        <div style={{ fontSize: "0.78rem", opacity: 0.85, marginTop: 4, lineHeight: 1.4 }}>
          Skip — we'll deliver the reel silent so you can drop your own track.
        </div>
      </button>

      {/* Category-grouped list */}
      <div
        className="max-h-[28rem] overflow-y-auto pr-1 space-y-5"
        style={{ border: "1px solid var(--lux-hairline-strong)", padding: 12, background: "var(--lux-bone)" }}
      >
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div
                className="lux-eyebrow mb-2"
                style={{
                  color: "var(--lux-rust)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.22em",
                  fontWeight: 700,
                  borderBottom: "1px solid var(--lux-hairline)",
                  paddingBottom: 6,
                }}
              >
                {CATEGORY_LABELS[cat]} · {items.length}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((p) => {
                  const isSelected = selectedLabel === p.label;
                  const variantKey = variants[p.id] === "v2" ? "v2" : "v1";
                  const isPlaying = playingId === `${p.id}::${variantKey}`;
                  return (
                    <div
                      key={p.id}
                      className="p-3"
                      style={{
                        background: isSelected ? "var(--lux-ink)" : "var(--lux-cream)",
                        color: isSelected ? "var(--lux-bone)" : "var(--lux-ink)",
                        border: `1px solid ${isSelected ? "var(--lux-ink)" : "var(--lux-hairline)"}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelect(p.label)}
                          className="text-left flex-1"
                        >
                          <div
                            className="lux-eyebrow"
                            style={{ fontSize: "0.62rem", letterSpacing: "0.18em", fontWeight: 700 }}
                          >
                            {p.label}
                          </div>
                          <div style={{ fontSize: "0.74rem", opacity: 0.85, marginTop: 4, lineHeight: 1.4 }}>
                            {p.description}
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label={isPlaying ? "Pause preview" : "Play preview"}
                          onClick={() => togglePlay(p)}
                          className="grid place-items-center flex-shrink-0"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9999,
                            background: isPlaying ? "var(--lux-rust)" : isSelected ? "var(--lux-bone)" : "var(--lux-ink)",
                            color: isPlaying ? "var(--lux-bone)" : isSelected ? "var(--lux-ink)" : "var(--lux-bone)",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {p.audioVariant && (
                          <button
                            type="button"
                            onClick={() => switchVariant(p)}
                            className="lux-eyebrow inline-flex items-center px-2 py-1"
                            style={{
                              fontSize: "0.55rem",
                              letterSpacing: "0.18em",
                              background: "transparent",
                              color: isSelected ? "var(--lux-bone)" : "var(--lux-ink)",
                              border: `1px solid ${isSelected ? "rgba(244,239,230,0.4)" : "var(--lux-hairline-strong)"}`,
                              opacity: 0.85,
                            }}
                            title="Switch to alternate Suno variant"
                          >
                            {variantKey === "v2" ? "TAKE B ↻" : "TAKE A ↻"}
                          </button>
                        )}
                        <a
                          href={audioFor(p)}
                          download
                          className="lux-eyebrow inline-flex items-center gap-1 px-2 py-1"
                          style={{
                            fontSize: "0.55rem",
                            letterSpacing: "0.18em",
                            background: "transparent",
                            color: isSelected ? "var(--lux-bone)" : "var(--lux-ink)",
                            border: `1px solid ${isSelected ? "rgba(244,239,230,0.4)" : "var(--lux-hairline-strong)"}`,
                            opacity: 0.85,
                            textDecoration: "none",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={10} /> MP3
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(p.prompt);
                            toast.success("Suno prompt copied");
                          }}
                          className="lux-eyebrow inline-flex items-center gap-1 px-2 py-1"
                          style={{
                            fontSize: "0.55rem",
                            letterSpacing: "0.18em",
                            background: "transparent",
                            color: isSelected ? "var(--lux-bone)" : "var(--lux-ink)",
                            border: `1px solid ${isSelected ? "rgba(244,239,230,0.4)" : "var(--lux-hairline-strong)"}`,
                            opacity: 0.85,
                          }}
                          title="Copy Suno prompt to regenerate at suno.com"
                        >
                          <CopyIcon size={10} /> PROMPT
                        </button>
                      </div>

                      <div
                        className="lux-eyebrow"
                        style={{
                          fontSize: "0.55rem",
                          letterSpacing: "0.16em",
                          opacity: 0.7,
                          marginTop: 8,
                        }}
                      >
                        {p.bestFor}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p
        className="text-xs mt-3"
        style={{ color: "var(--lux-ink)", opacity: 0.75, fontFamily: "'Inter', sans-serif" }}
      >
        Press <strong style={{ color: "var(--lux-rust)" }}>Play</strong> on any row to preview. <strong>Take A / Take B</strong> swaps between the two Suno variants. <strong>MP3</strong> downloads the file. <strong>Prompt</strong> copies the Suno prompt so you can regenerate at <span style={{ color: "var(--lux-rust)", fontWeight: 600 }}>suno.com</span>.
      </p>
    </div>
  );
}

export default SunoMusicPicker;
