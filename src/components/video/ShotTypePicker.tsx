import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import {
  SHOT_TYPES,
  SHOT_CATEGORY_LABELS,
  shotsByCategory,
  type ShotType,
  type ShotCategory,
  type ShotTypeConfig,
} from "@/lib/shot-types";
import { Coins } from "lucide-react";
import { ShotMotionPreview } from "./ShotMotionPreview";

interface ShotTypePickerProps {
  value: ShotType;
  onChange: (shotType: ShotType) => void;
}

/**
 * Single shot card with a preview video that plays on hover/focus.
 *
 * Each ShotTypeConfig may define `previewVideo` (a 5-second loop showing the
 * camera move on a real listing) and `posterImage` (frame-zero still shown
 * before the video plays). When the user hovers the card, the video plays
 * muted + looping so they can see the move before committing credits.
 * The poster shows when neither is hovering nor playing.
 */
// Auto-resolve a preview video path by convention. Looks in the user's
// drop folder first, then a fallback location:
//
//   PRIMARY:  /public/vantage/animate-single/{shot_id}.mp4
//             (where the user dropped their shot-demo videos)
//
//   FALLBACK: /public/videos/shots/{shot_id}.mp4
//             (legacy convention from the earlier wiring)
//
// If you dropped files using a slightly different name (e.g. "push-in.mp4"
// instead of "push_in.mp4"), the picker tries kebab-case as a third option.
//
// Missing files silently fail (the <video> tag's onError hides the element
// — the card still shows the title, tagline, and description).
function resolvePreviewVideo(shot: ShotTypeConfig): string | undefined {
  if (shot.previewVideo) return shot.previewVideo;
  return `/vantage/animate-single/${shot.id}.mp4`;
}
// Alternate paths the <video> tag will try via fallback <source> entries.
// Filename conventions vary — try snake_case, kebab-case, and the label
// slug so any reasonable drop works without code changes.
function alternatePreviewVideos(shot: ShotTypeConfig): string[] {
  const kebab = shot.id.replace(/_/g, "-");
  const labelSlug = shot.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return [
    // shot id with snake_case in legacy folder
    `/videos/shots/${shot.id}.mp4`,
    // shot id in kebab-case in the user's animate-single folder
    `/vantage/animate-single/${kebab}.mp4`,
    // label slug variant (e.g. "push-in.mp4" from label "Push In")
    `/vantage/animate-single/${labelSlug}.mp4`,
    `/videos/shots/${kebab}.mp4`,
    `/videos/shots/${labelSlug}.mp4`,
  ].filter((p, i, arr) => arr.indexOf(p) === i); // dedupe
}
function resolvePosterImage(shot: ShotTypeConfig): string | undefined {
  if (shot.posterImage) return shot.posterImage;
  return `/vantage/animate-single/${shot.id}.jpg`;
}

function ShotCard({
  shot,
  isSelected,
  onClick,
}: {
  shot: ShotTypeConfig;
  isSelected: boolean;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewSrc = resolvePreviewVideo(shot);
  const altSources = alternatePreviewVideos(shot);
  const posterSrc = resolvePosterImage(shot);

  // If *no* preview video successfully loaded (we never dropped per-shot
  // files), we fall back to the animated SVG motion indicator. Track that
  // here so the indicator stays visible.
  const [videoLoaded, setVideoLoaded] = useState(false);

  const handleHoverStart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {
      /* Autoplay can be blocked — silent fallback to poster */
    });
  };
  const handleHoverEnd = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onFocus={handleHoverStart}
      onBlur={handleHoverEnd}
      className={cn(
        "text-left rounded-none border transition-all flex flex-col overflow-hidden",
        isSelected
          ? "bg-ink border-ink text-bone"
          : "bg-bone border-hairline hover:border-ink"
      )}
      style={
        isSelected
          ? {
              backgroundColor: "#0E0E0C",
              borderColor: "#0E0E0C",
              color: "#F4EFE6",
            }
          : {
              backgroundColor: "#F4EFE6",
              borderColor: "var(--lux-hairline)",
              color: "#0E0E0C",
            }
      }
    >
      {/* Preview media — always rendered. We always paint the animated
          SVG motion indicator first so the user *immediately* understands
          what the camera does. If a per-shot preview video file actually
          exists at /vantage/animate-single/{id}.mp4 (or any of the
          alternate paths), it autoplays on top of the SVG on hover.
          Without that file, the SVG keeps animating — no black panels,
          no broken icons. */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "9 / 16",
          maxHeight: 180,
          background: "#0E0E0C",
          borderBottom: isSelected
            ? "1px solid rgba(244,239,230,0.18)"
            : "1px solid var(--lux-hairline)",
        }}
      >
        {/* Animated camera-motion indicator — always-on visual that
            explains the move with no asset dependency. */}
        <ShotMotionPreview shotId={shot.id} isSelected={isSelected} />

        <video
          ref={videoRef}
          poster={posterSrc}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setVideoLoaded(true)}
          // Hide the element entirely if EVERY source 404s so the SVG
          // indicator behind it stays the visible preview.
          onError={(e) => {
            (e.currentTarget as HTMLVideoElement).style.opacity = "0";
            setVideoLoaded(false);
          }}
          className="absolute inset-0 w-full h-full object-cover transition-opacity"
          style={{ opacity: videoLoaded ? 1 : 0 }}
        >
          {/* Primary path — the vantage/animate-single folder. */}
          <source src={previewSrc} type="video/mp4" />
          {/* Alternate filenames the user might have dropped. The browser
              tries each in order until one loads. */}
          {altSources.map((src) => (
            <source key={src} src={src} type="video/mp4" />
          ))}
        </video>
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Shot label in serif */}
        <h3 className="lux-display text-lg mb-1 leading-tight">{shot.label}</h3>

        {/* Tagline */}
        <div
          className="lux-eyebrow mb-3"
          style={{
            color: isSelected ? "#C9A96E" : "#8C7A52",
            fontSize: 10,
            letterSpacing: "0.16em",
          }}
        >
          {shot.tagline}
        </div>

        {/* Description */}
        <p
          className="lux-prose text-sm mb-4 flex-1"
          style={{
            color: isSelected ? "#A39E94" : "#6B6760",
            lineHeight: 1.45,
          }}
        >
          {shot.description}
        </p>

        {/* Credits + premium badge */}
        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{
            borderColor: isSelected
              ? "rgba(201, 169, 110, 0.2)"
              : "var(--lux-hairline)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{shot.creditCost}</span>
          </div>
          {shot.isPremium && (
            <span
              className="lux-eyebrow"
              style={{
                color: isSelected ? "#C9A96E" : "#8C7A52",
                fontSize: 9,
                letterSpacing: "0.18em",
              }}
            >
              PREMIUM
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// Show categories in this order. Research finding: "Forward & Back" is the
// most-requested family — surface it first.
const CATEGORY_ORDER: ShotCategory[] = [
  "linear",
  "lateral",
  "vertical",
  "rotational",
  "architectural",
];

export function ShotTypePicker({ value, onChange }: ShotTypePickerProps) {
  const groups = shotsByCategory();

  return (
    <div className="space-y-10">
      {CATEGORY_ORDER.map((category) => {
        const shotsInGroup = groups[category];
        if (!shotsInGroup.length) return null;

        return (
          <section key={category}>
            <header
              className="lux-eyebrow mb-4 flex items-center gap-3"
              style={{ color: "var(--lux-brass)" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 28,
                  height: 1,
                  background: "var(--lux-brass)",
                }}
              />
              {SHOT_CATEGORY_LABELS[category]}
              <span style={{ color: "var(--lux-ink)", opacity: 0.35, fontSize: 11 }}>
                · {shotsInGroup.length} {shotsInGroup.length === 1 ? "move" : "moves"}
              </span>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shotsInGroup.map((shot) => {
                const isSelected = value === shot.id;
                return (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    isSelected={isSelected}
                    onClick={() => onChange(shot.id)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
