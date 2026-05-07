import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Download,
  Trash2,
  Copy,
  Coins,
  AlertCircle,
  Film,
  Share2,
  RefreshCw,
  Search,
  X,
  Maximize2,
  ImageIcon,
  Eye,
  Calendar,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import ReferralNudge from "@/components/ReferralNudge";

interface Submission {
  id: string;
  transformation_type: string;
  build_type: string | null;
  video_style: string;
  project_description: string;
  status: string;
  prompt_status: string;
  output_video_url: string | null;
  output_video_path: string | null;
  /** All individual per-photo clips — present for Done-For-You / Listing
   *  Bundle generations. Each entry is a permanent Supabase Storage path. */
  output_clip_paths: string[] | null;
  generated_before_image_path: string | null;
  before_photo_paths: string[] | null;
  after_photo_paths: string[] | null;
  generated_video_prompt: string | null;
  video_type: string | null;
  is_public: boolean | null;
  created_at: string;
}

interface SignedUrls {
  [key: string]: string;
}

type StatusFilter = "all" | "ready" | "generating" | "failed";
type CategoryFilter = "all" | "listing" | "transformation";

// Maximum signed-URL lifetime allowed by Supabase Storage. Was 3600 (1h)
// previously — that caused 17 users to perceive "lost media" once their
// signed URLs expired between sessions. 7 days makes intra-week revisits
// always work; the gallery also re-signs every URL on mount as a backup.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Defensive resolver. Accepts full URLs, "bucket/path" keys, or bare paths;
// tries project-submissions then property-photos (listing flow uploads land
// in property-photos).
async function signPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  for (const bucket of ["project-submissions", "property-photos"]) {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {
      /* try next */
    }
  }
  return null;
}

// Cross-device download — desktop anchor click, Android anchor click, iOS
// Web Share API → blob open in new tab fallback.
// iOS Safari quirks fixture — separated for testing.
const isiOSDevice = () =>
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  !/CriOS|FxiOS/.test(navigator.userAgent); // exclude Chrome/Firefox on iOS, which behave better

const isAndroid = () =>
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

/**
 * Download a video to the user's device.
 *
 * Strategy:
 *   • Desktop (any browser): blob → anchor `download` → done.
 *   • Android (Chrome / Firefox / Samsung): blob → anchor `download` → done.
 *   • iOS Chrome / Firefox: blob → anchor `download` → done.
 *   • iOS Safari with Web Share Files: native Save sheet (Photos / Files).
 *   • iOS Safari WITHOUT Web Share Files: instruction toast + scroll the
 *     video into view — there's no programmatic save path on iOS Safari
 *     for arbitrary blob URLs, so we tell the user to long-press the video.
 *
 * The "opens in another tab" bug came from anchor click + window.open.
 * Both have been removed; we never call window.open here.
 */
async function downloadFile(pathOrUrl: string, filename: string) {
  const iOS = isiOSDevice();
  const Android = isAndroid();

  // 1. Pull the bytes.
  let blob: Blob | null = null;
  try {
    if (pathOrUrl.startsWith("http")) {
      const res = await fetch(pathOrUrl);
      if (res.ok) blob = await res.blob();
    } else {
      for (const bucket of ["project-submissions", "property-photos"]) {
        const { data } = await supabase.storage.from(bucket).download(pathOrUrl);
        if (data) { blob = data; break; }
      }
    }
  } catch { /* fall through */ }

  // 2. iOS Safari path — always prefer Web Share Sheet for best UX.
  if (iOS && blob) {
    const canShareFn = (navigator as any).canShare;
    if (typeof canShareFn === "function") {
      try {
        const file = new File([blob], filename, { type: blob.type || "video/mp4" });
        const shareData: any = { files: [file], title: filename };
        if (canShareFn(shareData)) {
          await (navigator as any).share(shareData);
          return;
        }
      } catch (err) {
        // User cancelled the share sheet — that's fine, just bail.
        if ((err as any)?.name === "AbortError") return;
      }
    }

    // No Web Share Files support on this iOS version. There's no clean
    // programmatic save path for arbitrary blobs on iOS Safari, so we
    // tell the user how to save manually. The video element on the
    // gallery card supports the long-press → "Save Video" gesture
    // natively — the user just needs to know they can use it.
    toast({
      title: "Save to Photos",
      description: "iOS Safari can't auto-download videos. Long-press the playing video and tap 'Save Video' to save it to Photos.",
      duration: 9000,
    });
    return;
  }

  // 3. Android + Desktop + iOS Chrome/Firefox — blob anchor click works.
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.target = "_self";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch { /* gone */ }
      URL.revokeObjectURL(url);
    }, 1500);
    return;
  }

  // 4. Last resort — signed URL with Content-Disposition: attachment.
  if (!pathOrUrl.startsWith("http")) {
    for (const bucket of ["project-submissions", "property-photos"]) {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, 300, { download: filename });
      if (data?.signedUrl) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = filename;
        a.rel = "noopener";
        a.target = "_self";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { document.body.removeChild(a); } catch { /* gone */ } }, 1500);
        return;
      }
    }
  }

  // Mute the unused warning on Android — kept for future per-platform UX hooks.
  void Android;
  toast({
    title: "Download failed",
    description: "Network error — please try again or refresh the page.",
    variant: "destructive",
  });
}

const TRANSFORMATION_LABELS: Record<string, string> = {
  backyard_outdoor: "Backyard / Outdoor",
  full_home: "Full Home",
  interior_room: "Interior Room",
  pool_water: "Pool / Water",
  kitchen_bathroom: "Kitchen / Bath",
  landscaping: "Landscaping",
  exterior: "Exterior",
  interior: "Interior",
  animate_single: "Animate Single",
  sun_to_sun: "Sun-Up to Sundown",
  listing_bundle: "Listing Bundle",
  done_for_you_reel: "Done-For-You Reel",
  virtual_staging: "Virtual Staging",
  sketch_to_real: "Sketch to Reality",
  floor_plan_pan: "Floor Plan Walkthrough",
};

function getTransformationLabel(type: string) {
  return TRANSFORMATION_LABELS[type] || type.replace(/_/g, " ");
}

function getStatus(s: Submission): "ready" | "generating" | "failed" | "queued" {
  if (s.prompt_status === "error" || s.status === "error") return "failed";
  if (s.prompt_status === "complete" || s.status === "delivered") return "ready";
  if (s.prompt_status === "generating" || s.status === "in progress") return "generating";
  return "queued";
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  ready:      { label: "READY",       bg: "rgba(58,99,73,0.14)",  color: "#3a6349", dot: "#3a6349" },
  generating: { label: "GENERATING",  bg: "rgba(140,63,46,0.14)", color: "#8C3F2E", dot: "#8C3F2E" },
  failed:     { label: "FAILED",      bg: "rgba(140,63,46,0.18)", color: "#8C3F2E", dot: "#8C3F2E" },
  queued:     { label: "QUEUED",      bg: "rgba(108,109,103,0.14)", color: "#6c6d67", dot: "#6c6d67" },
};

// ────────────────────────────────────────────────────────────────────────────
// Submission card — every field rendered, lux aesthetic, mobile-first.
// ────────────────────────────────────────────────────────────────────────────
interface SubmissionCardProps {
  submission: Submission;
  signedUrls: SignedUrls;
  signing: boolean;
  onDelete: (id: string) => void;
  onTogglePublic: (id: string, value: boolean) => void;
  onRegenerate: (s: Submission) => void;
  onCopyPrompt: (prompt: string) => void;
  onCopyShareLink: (id: string) => void;
  onOpenFullscreenImage: (url: string) => void;
  onOpenFullscreenVideo: (url: string) => void;
  onRefreshVideo: (s: Submission) => void;
  deleting: boolean;
}

function SubmissionCard({
  submission,
  signedUrls,
  signing,
  onDelete,
  onTogglePublic,
  onRegenerate,
  onCopyPrompt,
  onCopyShareLink,
  onOpenFullscreenImage,
  onOpenFullscreenVideo,
  onRefreshVideo,
  deleting,
}: SubmissionCardProps) {
  const [videoErrored, setVideoErrored] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const status = getStatus(submission);
  const statusStyle = STATUS_STYLES[status];
  const isListing = submission.video_type === "listing";
  const generatedBeforeUrl = signedUrls[`gen-before-${submission.id}`];
  const beforeUrls = (submission.before_photo_paths || [])
    .map((_, i) => signedUrls[`before-${submission.id}-${i}`])
    .filter(Boolean);
  const afterUrls = (submission.after_photo_paths || [])
    .map((_, i) => signedUrls[`after-${submission.id}-${i}`])
    .filter(Boolean);
  const videoUrl = signedUrls[`video-${submission.id}`];
  const hasVideo = Boolean(videoUrl) && !videoErrored;

  const dateStr = new Date(submission.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <article
      className="lux-bg-bone overflow-hidden flex flex-col"
      style={{ border: "1px solid var(--lux-hairline)" }}
    >
      {/* ─── VIDEO / STATE ─── */}
      <div className="relative w-full overflow-hidden lux-bg-ink" style={{ aspectRatio: "16/9" }}>
        {hasVideo ? (
          <>
            <video
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setVideoErrored(true)}
            />
            <button
              onClick={() => onOpenFullscreenVideo(videoUrl)}
              aria-label="Expand video"
              className="absolute top-3 right-3 grid place-items-center"
              style={{
                width: 36, height: 36,
                background: "rgba(14,14,12,0.65)",
                color: "var(--lux-bone)",
                border: "1px solid rgba(244,239,230,0.3)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Maximize2 size={14} />
            </button>
          </>
        ) : videoUrl && videoErrored ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Film size={28} style={{ color: "rgba(244,239,230,0.4)" }} />
            <p className="text-xs" style={{ color: "rgba(244,239,230,0.7)", maxWidth: 280 }}>
              Preview unavailable. The signed URL may have expired.
            </p>
            <button
              onClick={() => { setVideoErrored(false); onRefreshVideo(submission); }}
              className="lux-eyebrow inline-flex items-center gap-2 px-3 py-2"
              style={{
                background: "var(--lux-bone)", color: "var(--lux-ink)",
                fontSize: "0.65rem", letterSpacing: "0.2em",
              }}
            >
              <RefreshCw size={12} /> Refresh link
            </button>
          </div>
        ) : status === "generating" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--lux-champagne)" }} />
            <p className="lux-eyebrow" style={{ color: "var(--lux-champagne)", fontSize: "0.7rem" }}>
              GENERATING
            </p>
            <p className="text-xs" style={{ color: "rgba(244,239,230,0.6)", maxWidth: 280 }}>
              Cinematic render in progress. Typically 3–5 minutes.
            </p>
          </div>
        ) : status === "failed" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle size={28} style={{ color: "#8C3F2E" }} />
            <p className="lux-eyebrow" style={{ color: "#c97565", fontSize: "0.7rem" }}>
              GENERATION FAILED
            </p>
            <button
              onClick={() => onRegenerate(submission)}
              className="lux-eyebrow inline-flex items-center gap-2 px-3 py-2 mt-1"
              style={{
                background: "var(--lux-bone)", color: "var(--lux-ink)",
                fontSize: "0.65rem", letterSpacing: "0.2em",
              }}
            >
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        ) : signing ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: "rgba(244,239,230,0.5)" }} />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <Film size={28} style={{ color: "rgba(244,239,230,0.3)" }} />
            <p className="lux-eyebrow" style={{ color: "rgba(244,239,230,0.5)", fontSize: "0.65rem" }}>
              NO VIDEO YET
            </p>
          </div>
        )}

        {/* Status pill — top-left, always visible */}
        <span
          className="absolute top-3 left-3 lux-eyebrow inline-flex items-center gap-1.5 px-2.5 py-1.5"
          style={{
            background: statusStyle.bg,
            color: statusStyle.color,
            fontSize: "0.6rem", letterSpacing: "0.18em",
            backdropFilter: "blur(8px)",
            border: `1px solid ${statusStyle.color}40`,
          }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: 9999,
              background: statusStyle.dot,
              animation: status === "generating" ? "pulse 1.6s ease-in-out infinite" : "none",
            }}
          />
          {statusStyle.label}
        </span>
      </div>

      {/* ─── META + TITLE ─── */}
      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="lux-eyebrow"
              style={{
                background: isListing ? "var(--lux-ink)" : "var(--lux-rust)",
                color: "var(--lux-bone)",
                padding: "4px 10px",
                fontSize: "0.55rem",
                letterSpacing: "0.2em",
              }}
            >
              {isListing ? "LISTING REEL" : "TRANSFORMATION"}
            </span>
            <span
              className="lux-eyebrow"
              style={{
                color: "var(--lux-ink)",
                fontSize: "0.62rem",
                letterSpacing: "0.16em",
                fontWeight: 600,
              }}
            >
              {getTransformationLabel(submission.transformation_type)}
            </span>
            {submission.build_type && (
              <span
                className="lux-eyebrow"
                style={{ color: "var(--lux-ink)", opacity: 0.6, fontSize: "0.62rem", fontWeight: 600 }}
              >
                · {submission.build_type.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <span
            className="lux-eyebrow inline-flex items-center gap-1.5"
            style={{ color: "var(--lux-ink)", opacity: 0.7, fontSize: "0.62rem", fontWeight: 600 }}
          >
            <Calendar size={11} /> {dateStr}
          </span>
        </div>

        {submission.project_description && (
          <p
            className="lux-prose"
            style={{ color: "var(--lux-ink)", fontSize: "0.95rem", lineHeight: 1.5 }}
          >
            {submission.project_description}
          </p>
        )}

        {submission.video_style && (
          <div
            className="lux-eyebrow inline-flex items-center"
            style={{ fontSize: "0.62rem", color: "var(--lux-ink)", opacity: 0.65, fontWeight: 600 }}
          >
            STYLE · {submission.video_style.replace(/_/g, " ")}
          </div>
        )}
      </div>

      {/* ─── SOURCE PHOTOS GRID — every before/after rendered ─── */}
      {(beforeUrls.length > 0 || afterUrls.length > 0 || generatedBeforeUrl) && (
        <div className="px-5 pb-4">
          <div
            className="lux-eyebrow mb-2"
            style={{ color: "var(--lux-ink)", opacity: 0.75, fontSize: "0.62rem", fontWeight: 600 }}
          >
            SOURCE FRAMES · {beforeUrls.length + afterUrls.length + (generatedBeforeUrl ? 1 : 0)}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {generatedBeforeUrl && (
              <button
                onClick={() => onOpenFullscreenImage(generatedBeforeUrl)}
                className="relative aspect-square overflow-hidden group"
                style={{ background: "var(--lux-cream)" }}
              >
                <img
                  src={generatedBeforeUrl}
                  alt="AI-generated before"
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <span
                  className="lux-eyebrow absolute top-1 left-1 px-1.5 py-0.5"
                  style={{
                    background: "var(--lux-rust)", color: "var(--lux-bone)",
                    fontSize: "0.5rem", letterSpacing: "0.15em",
                  }}
                >
                  AI BEFORE
                </span>
              </button>
            )}
            {beforeUrls.map((url, i) => (
              <button
                key={`b-${i}`}
                onClick={() => onOpenFullscreenImage(url)}
                className="relative aspect-square overflow-hidden group"
                style={{ background: "var(--lux-cream)" }}
              >
                <img
                  src={url}
                  alt={`Before ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <span
                  className="lux-eyebrow absolute top-1 left-1 px-1.5 py-0.5"
                  style={{
                    background: "var(--lux-ink)", color: "var(--lux-bone)",
                    fontSize: "0.5rem", letterSpacing: "0.15em",
                  }}
                >
                  BEFORE
                </span>
              </button>
            ))}
            {afterUrls.map((url, i) => (
              <button
                key={`a-${i}`}
                onClick={() => onOpenFullscreenImage(url)}
                className="relative aspect-square overflow-hidden group"
                style={{ background: "var(--lux-cream)" }}
              >
                <img
                  src={url}
                  alt={`After / Source ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <span
                  className="lux-eyebrow absolute top-1 left-1 px-1.5 py-0.5"
                  style={{
                    background: "var(--lux-brass)", color: "var(--lux-ink)",
                    fontSize: "0.5rem", letterSpacing: "0.15em",
                  }}
                >
                  {isListing ? `SRC ${i + 1}` : "AFTER"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── PROMPT (collapsible) ─── */}
      {submission.generated_video_prompt && (
        <div className="px-5 pb-4">
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="lux-eyebrow w-full text-left flex items-center justify-between py-2"
            style={{
              fontSize: "0.62rem",
              color: "var(--lux-ink)",
              fontWeight: 700,
              borderTop: "1px solid var(--lux-hairline-strong)",
              borderBottom: showPrompt ? "1px solid var(--lux-hairline-strong)" : "none",
            }}
          >
            <span>VIDEO PROMPT · {showPrompt ? "HIDE" : "SHOW"}</span>
            <span style={{ fontSize: "1rem" }}>{showPrompt ? "−" : "+"}</span>
          </button>
          {showPrompt && (
            <div className="pt-3 pb-1">
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--lux-ink)", fontFamily: "'Inter', sans-serif" }}
              >
                {submission.generated_video_prompt}
              </p>
              <button
                onClick={() => onCopyPrompt(submission.generated_video_prompt!)}
                className="lux-eyebrow inline-flex items-center gap-1.5 mt-3 px-2.5 py-1.5"
                style={{
                  background: "transparent",
                  border: "1px solid var(--lux-hairline-strong)",
                  color: "var(--lux-ink)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.15em",
                }}
              >
                <Copy size={11} /> Copy prompt
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── ACTION TOOLBAR ─── */}
      <div
        className="px-5 py-4 mt-auto flex flex-wrap items-center gap-2"
        style={{ borderTop: "1px solid var(--lux-hairline)" }}
      >
        {(submission.output_video_path || submission.output_video_url) && (
          <button
            onClick={() =>
              downloadFile(
                submission.output_video_path || submission.output_video_url!,
                `vantage-${submission.video_type || "video"}-${submission.id}.mp4`,
              )
            }
            className="lux-eyebrow inline-flex items-center gap-1.5 px-3 py-2"
            style={{
              background: "var(--lux-ink)", color: "var(--lux-bone)",
              fontSize: "0.6rem", letterSpacing: "0.18em",
            }}
          >
            <Download size={12} /> {submission.output_clip_paths && submission.output_clip_paths.length > 1 ? "Stitched" : "Video"}
          </button>
        )}
        {/* Per-clip downloads — present whenever a Done-For-You / Listing
            Bundle generated multiple clips. Every clip lives permanently
            in Supabase Storage and stays reachable here. */}
        {submission.output_clip_paths && submission.output_clip_paths.length > 1 &&
          submission.output_clip_paths.map((clipPath, i) => (
            <button
              key={`clip-${i}`}
              onClick={() => downloadFile(clipPath, `vantage-clip-${i + 1}-${submission.id}.mp4`)}
              className="lux-eyebrow inline-flex items-center gap-1.5 px-3 py-2"
              style={{
                background: "var(--lux-bone)", color: "var(--lux-ink)",
                border: "1px solid var(--lux-hairline-strong)",
                fontSize: "0.6rem", letterSpacing: "0.18em",
              }}
              title={`Download individual clip ${i + 1}`}
            >
              <Download size={12} /> Clip {i + 1}
            </button>
          ))
        }
        {submission.generated_before_image_path && (
          <button
            onClick={() => downloadFile(submission.generated_before_image_path!, `vantage-before-${submission.id}.jpg`)}
            className="lux-eyebrow inline-flex items-center gap-1.5 px-3 py-2"
            style={{
              background: "var(--lux-bone)", color: "var(--lux-ink)",
              border: "1px solid var(--lux-hairline-strong)",
              fontSize: "0.6rem", letterSpacing: "0.18em",
            }}
          >
            <Download size={12} /> Before
          </button>
        )}
        {submission.after_photo_paths?.[0] && (
          <button
            onClick={() => downloadFile(submission.after_photo_paths![0], `vantage-source-${submission.id}.jpg`)}
            className="lux-eyebrow inline-flex items-center gap-1.5 px-3 py-2"
            style={{
              background: "var(--lux-bone)", color: "var(--lux-ink)",
              border: "1px solid var(--lux-hairline-strong)",
              fontSize: "0.6rem", letterSpacing: "0.18em",
            }}
          >
            <Download size={12} /> Source
          </button>
        )}
        {(submission.output_video_path || submission.output_video_url) && (
          <button
            onClick={() => onCopyShareLink(submission.id)}
            className="lux-eyebrow inline-flex items-center gap-1.5 px-3 py-2"
            style={{
              background: "var(--lux-bone)", color: "var(--lux-ink)",
              border: "1px solid var(--lux-hairline-strong)",
              fontSize: "0.6rem", letterSpacing: "0.18em",
            }}
          >
            <Share2 size={12} /> Share
          </button>
        )}
        {(status === "ready" || status === "failed") && (
          <button
            onClick={() => onRegenerate(submission)}
            className="lux-eyebrow inline-flex items-center gap-1.5 px-3 py-2"
            style={{
              background: "transparent",
              border: "1px solid var(--lux-rust)",
              color: "var(--lux-rust)",
              fontSize: "0.6rem", letterSpacing: "0.18em",
            }}
          >
            <RefreshCw size={12} /> Regenerate
          </button>
        )}
        <button
          onClick={() => onDelete(submission.id)}
          disabled={deleting}
          className="lux-eyebrow inline-flex items-center gap-1.5 px-3 py-2 ml-auto"
          style={{
            background: "transparent",
            color: "var(--lux-ash)",
            fontSize: "0.6rem", letterSpacing: "0.18em",
            opacity: deleting ? 0.5 : 1,
          }}
          title="Delete"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        </button>
      </div>

      {/* ─── PUBLIC SHARE TOGGLE ─── */}
      {(submission.output_video_path || submission.output_video_url) && (
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--lux-hairline)" }}
        >
          <div className="flex items-center gap-2">
            <Eye size={12} style={{ color: "var(--lux-ink)", opacity: 0.7 }} />
            <span
              className="lux-eyebrow"
              style={{ color: "var(--lux-ink)", opacity: 0.75, fontSize: "0.62rem", fontWeight: 700 }}
            >
              {submission.is_public !== false ? "PUBLIC SHARE LINK" : "PRIVATE"}
            </span>
          </div>
          <Switch
            checked={submission.is_public !== false}
            onCheckedChange={(checked) => onTogglePublic(submission.id, checked)}
          />
        </div>
      )}
    </article>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Gallery page
// ────────────────────────────────────────────────────────────────────────────
const Gallery = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { credits } = useCredits();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({});
  const [signingUrls, setSigningUrls] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/gallery");
  }, [user, authLoading, navigate]);

  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      toast({ title: "Error", description: "Failed to load gallery", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user-submissions")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "submissions",
        filter: `user_id=eq.${user.id}`,
      }, async (payload: any) => {
        const updated = payload.new as Submission;
        setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
        if (updated.output_video_path && updated.prompt_status === "complete") {
          const videoUrl = await signPath(updated.output_video_path);
          if (videoUrl) setSignedUrls((prev) => ({ ...prev, [`video-${updated.id}`]: videoUrl }));
          toast({ title: "Your video is ready" });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Sign every URL — every before, every after, every generated, every video
  useEffect(() => {
    const signAllUrls = async () => {
      setSigningUrls(true);
      const urlMap: SignedUrls = {};
      const tasks: Promise<void>[] = [];
      for (const s of submissions) {
        if (s.generated_before_image_path) {
          tasks.push(signPath(s.generated_before_image_path).then((url) => { if (url) urlMap[`gen-before-${s.id}`] = url; }));
        }
        (s.before_photo_paths || []).forEach((p, i) => {
          tasks.push(signPath(p).then((url) => { if (url) urlMap[`before-${s.id}-${i}`] = url; }));
        });
        (s.after_photo_paths || []).forEach((p, i) => {
          tasks.push(signPath(p).then((url) => { if (url) urlMap[`after-${s.id}-${i}`] = url; }));
        });
        // CRITICAL: prefer the Storage path over the bare URL. The
        // output_video_url field stores Replicate's temporary URL which
        // expires in roughly 24 hours; the output_video_path is the
        // permanent Supabase Storage location. Until this fix shipped,
        // every submission older than ~24h showed "Preview unavailable"
        // because we kept handing the dead Replicate URL to the <video>
        // tag instead of re-signing the storage path. (17 user complaints
        // and refunds traced to this single conditional.)
        if (s.output_video_path) {
          tasks.push(signPath(s.output_video_path).then((url) => {
            if (url) urlMap[`video-${s.id}`] = url;
          }));
        } else if (s.output_video_url && s.output_video_url.includes("supabase.co/storage")) {
          // Already a long-lived Supabase signed URL → fine to use directly.
          urlMap[`video-${s.id}`] = s.output_video_url;
        } else if (s.output_video_url) {
          // Fallback to the Replicate URL only if no path exists at all.
          // Will likely be dead after 24h but it's the only thing we have.
          urlMap[`video-${s.id}`] = s.output_video_url;
        }
      }
      await Promise.all(tasks);
      setSignedUrls(urlMap);
      setSigningUrls(false);
    };
    if (submissions.length > 0) signAllUrls();
    else setSigningUrls(false);
  }, [submissions]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("submissions").delete().eq("id", id);
      if (error) throw error;
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Deleted", description: "Submission removed" });
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleTogglePublic = async (id: string, value: boolean) => {
    try {
      await supabase.from("submissions").update({ is_public: value }).eq("id", id);
      setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, is_public: value } : s));
      toast({
        title: value ? "Now public" : "Now private",
        description: value ? "Anyone with the link can view." : "Share link disabled.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const handleRegenerate = (s: Submission) => {
    // Always reroute through the listing flow — that's our primary product.
    // Pass the specific category through so the wizard lands on the right
    // upload step for that submission's feature.
    const params = new URLSearchParams({
      mode: s.video_type === "listing" ? "listing" : "transform",
      ...(s.video_type === "listing" ? { category: s.transformation_type } : { type: s.transformation_type }),
      ...(s.build_type ? { build: s.build_type } : {}),
    });
    navigate(`/video?${params.toString()}`);
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({ title: "Copied", description: "Prompt copied to clipboard" });
  };

  const handleCopyShareLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${id}`);
    toast({ title: "Link copied", description: "Share it anywhere." });
  };

  const refreshVideoUrl = useCallback(async (s: Submission) => {
    const newUrl = s.output_video_path
      ? await signPath(s.output_video_path)
      : s.output_video_url ?? null;
    if (newUrl) setSignedUrls((prev) => ({ ...prev, [`video-${s.id}`]: newUrl }));
  }, []);

  // Counts and filtering
  const counts = useMemo(() => {
    const c = { all: submissions.length, ready: 0, generating: 0, failed: 0, listing: 0, transformation: 0 };
    for (const s of submissions) {
      const st = getStatus(s);
      if (st === "ready") c.ready++;
      else if (st === "generating") c.generating++;
      else if (st === "failed") c.failed++;
      if (s.video_type === "listing") c.listing++;
      else c.transformation++;
    }
    return c;
  }, [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (statusFilter !== "all" && getStatus(s) !== statusFilter) return false;
      if (categoryFilter === "listing" && s.video_type !== "listing") return false;
      if (categoryFilter === "transformation" && s.video_type === "listing") return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          s.transformation_type,
          s.build_type,
          s.video_style,
          s.project_description,
          s.generated_video_prompt,
          getTransformationLabel(s.transformation_type),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, categoryFilter, search]);

  // Keyboard: ESC to close fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreenImage(null);
        setFullscreenVideo(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen lux-bg-bone flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--lux-ink)" }} />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>My Gallery — The Vantage</title></Helmet>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div className="min-h-screen lux-bg-bone lux-grain">
        <LuxuryHeader variant="bone" />
        <main id="main-content" className="lux-container py-12 pt-28 md:pt-32">
          {/* ─── HEADER ─── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="lux-eyebrow mb-3 flex items-center gap-3" style={{ color: "var(--lux-brass)" }}>
                <span style={{ display: "inline-block", width: 28, height: 1, background: "var(--lux-brass)" }} />
                THE STUDIO ARCHIVE · {counts.all} {counts.all === 1 ? "FILM" : "FILMS"}
              </div>
              <h1 className="lux-display" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 0.95, letterSpacing: "-0.02em" }}>
                My <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>Gallery</span>
              </h1>
              <p
                className="lux-prose mt-4"
                style={{ maxWidth: 540, fontSize: "0.95rem", color: "var(--lux-ink)", opacity: 0.85 }}
              >
                Every film you've rendered. Every source frame. Every prompt. Download, share, regenerate, or delete.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/pricing"
                className="lux-eyebrow inline-flex items-center gap-2 px-4 py-3"
                style={{
                  background: "var(--lux-bone)",
                  border: "1px solid var(--lux-hairline-strong)",
                  color: "var(--lux-ink)",
                  fontSize: "0.65rem",
                }}
              >
                <Coins size={14} /> {credits ?? 0} CREDITS
              </Link>
              <Link to="/video?mode=listing" className="lux-btn">
                NEW FILM →
              </Link>
            </div>
          </div>

          <ReferralNudge className="mb-10" />

          {/* ─── STATS STRIP ─── */}
          {counts.all > 0 && (
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-px mb-10"
              style={{ background: "var(--lux-hairline-strong)" }}
            >
              {[
                { label: "READY", value: counts.ready, color: "#3a6349" },
                { label: "GENERATING", value: counts.generating, color: "#8C3F2E" },
                { label: "LISTING REELS", value: counts.listing, color: "var(--lux-brass)" },
                { label: "TRANSFORMATIONS", value: counts.transformation, color: "var(--lux-rust)" },
              ].map((s) => (
                <div key={s.label} className="lux-bg-bone px-5 py-5">
                  <div className="lux-eyebrow mb-2" style={{ color: s.color, fontSize: "0.6rem" }}>{s.label}</div>
                  <div className="font-display" style={{ fontSize: "1.8rem", letterSpacing: "-0.02em" }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ─── TOOLBAR ─── */}
          {counts.all > 0 && (
            <div className="flex flex-col gap-4 mb-8">
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--lux-ash)" }} />
                <input
                  type="text"
                  placeholder="Search by description, type, prompt…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 text-sm"
                  style={{
                    background: "var(--lux-bone)",
                    border: "1px solid var(--lux-hairline-strong)",
                    color: "var(--lux-ink)",
                    fontFamily: "'Inter', sans-serif",
                    outline: "none",
                  }}
                  aria-label="Search submissions"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-7 h-7"
                    style={{ color: "var(--lux-ash)" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="lux-eyebrow mr-1" style={{ color: "var(--lux-ink)", opacity: 0.75, fontSize: "0.62rem", fontWeight: 700 }}>STATUS</span>
                {([
                  { id: "all", label: "All" },
                  { id: "ready", label: `Ready (${counts.ready})` },
                  { id: "generating", label: `Live (${counts.generating})` },
                  { id: "failed", label: `Failed (${counts.failed})` },
                ] as const).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className="lux-eyebrow px-3 py-2"
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.16em",
                      background: statusFilter === f.id ? "var(--lux-ink)" : "var(--lux-bone)",
                      color: statusFilter === f.id ? "var(--lux-bone)" : "var(--lux-ink)",
                      border: "1px solid var(--lux-hairline-strong)",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
                <span className="lux-eyebrow ml-3 mr-1" style={{ color: "var(--lux-ink)", opacity: 0.75, fontSize: "0.62rem", fontWeight: 700 }}>TYPE</span>
                {([
                  { id: "all", label: "All" },
                  { id: "listing", label: `Listing (${counts.listing})` },
                  { id: "transformation", label: `Transform (${counts.transformation})` },
                ] as const).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCategoryFilter(f.id)}
                    className="lux-eyebrow px-3 py-2"
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.16em",
                      background: categoryFilter === f.id ? "var(--lux-ink)" : "var(--lux-bone)",
                      color: categoryFilter === f.id ? "var(--lux-bone)" : "var(--lux-ink)",
                      border: "1px solid var(--lux-hairline-strong)",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── GRID / LOADING / EMPTY ─── */}
          {loading ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="lux-bg-bone overflow-hidden" style={{ border: "1px solid var(--lux-hairline)" }}>
                  <div className="w-full lux-bg-cream animate-pulse" style={{ aspectRatio: "16/9" }} />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-32 lux-bg-cream animate-pulse" />
                    <div className="h-4 w-full lux-bg-cream animate-pulse" />
                    <div className="h-3 w-24 lux-bg-cream animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : counts.all === 0 ? (
            // Empty state — no submissions at all
            <div
              className="lux-bg-bone p-12 md:p-20 text-center"
              style={{ border: "1px solid var(--lux-hairline)" }}
            >
              <div className="mx-auto mb-6 grid place-items-center" style={{
                width: 80, height: 80,
                borderRadius: 9999,
                background: "var(--lux-cream)",
                border: "1px solid var(--lux-hairline)",
              }}>
                <Film size={32} style={{ color: "var(--lux-ash)" }} />
              </div>
              <div className="lux-eyebrow mb-4" style={{ color: "var(--lux-brass)" }}>
                THE STUDIO IS QUIET
              </div>
              <h2 className="lux-display mb-4" style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>
                No films <span className="lux-display-italic">yet.</span>
              </h2>
              {credits !== null && credits > 0 ? (
                <p className="lux-prose mb-8 mx-auto" style={{ maxWidth: 480 }}>
                  You have <span style={{ color: "var(--lux-rust)", fontWeight: 600 }}>{credits} credits</span> ready.
                  Roughly {Math.floor(credits / 25)} cinematic films at the standard rate.
                </p>
              ) : (
                <p className="lux-prose mb-8 mx-auto" style={{ maxWidth: 480 }}>
                  Your transformation reels and listing films will appear here once rendered.
                </p>
              )}
              <Link to="/video?mode=listing" className="lux-btn">
                BEGIN A FILM →
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            // Filtered to empty
            <div
              className="lux-bg-bone p-12 text-center"
              style={{ border: "1px solid var(--lux-hairline)" }}
            >
              <ImageIcon size={32} className="mx-auto mb-4" style={{ color: "var(--lux-ash)" }} />
              <h3 className="font-display mb-2" style={{ fontSize: "1.4rem", color: "var(--lux-ink)" }}>
                Nothing matches these filters.
              </h3>
              <p className="lux-prose mb-6" style={{ fontSize: "0.9rem", maxWidth: 380, marginInline: "auto" }}>
                Try clearing your search or switching status to "All".
              </p>
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); }}
                className="lux-eyebrow inline-flex items-center gap-2 px-4 py-3"
                style={{
                  background: "var(--lux-ink)", color: "var(--lux-bone)",
                  fontSize: "0.65rem", letterSpacing: "0.2em",
                }}
              >
                <X size={12} /> Clear filters
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {filtered.map((s) => (
                <SubmissionCard
                  key={s.id}
                  submission={s}
                  signedUrls={signedUrls}
                  signing={signingUrls}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onTogglePublic={handleTogglePublic}
                  onRegenerate={handleRegenerate}
                  onCopyPrompt={handleCopyPrompt}
                  onCopyShareLink={handleCopyShareLink}
                  onOpenFullscreenImage={setFullscreenImage}
                  onOpenFullscreenVideo={setFullscreenVideo}
                  onRefreshVideo={refreshVideoUrl}
                  deleting={deletingId === s.id}
                />
              ))}
            </div>
          )}
        </main>
        <LuxuryFooter />

        {/* ─── FULLSCREEN IMAGE ─── */}
        <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
          <DialogContent
            className="max-w-5xl p-1 overflow-hidden"
            style={{ background: "var(--lux-ink)", border: "1px solid var(--lux-hairline-strong)" }}
          >
            {fullscreenImage && (
              <div className="relative">
                <img src={fullscreenImage} alt="Fullscreen" className="w-full h-auto" />
                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = fullscreenImage;
                    a.target = "_blank";
                    a.rel = "noopener";
                    a.click();
                  }}
                  className="lux-eyebrow inline-flex items-center gap-2 absolute bottom-4 right-4 px-4 py-3"
                  style={{
                    background: "var(--lux-bone)", color: "var(--lux-ink)",
                    fontSize: "0.65rem", letterSpacing: "0.2em",
                  }}
                >
                  <Download size={12} /> Open full size
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── FULLSCREEN VIDEO ─── */}
        <Dialog open={!!fullscreenVideo} onOpenChange={() => setFullscreenVideo(null)}>
          <DialogContent
            className="max-w-5xl p-1 overflow-hidden"
            style={{ background: "var(--lux-ink)", border: "1px solid var(--lux-hairline-strong)" }}
          >
            {fullscreenVideo && (
              <video
                src={fullscreenVideo}
                autoPlay
                controls
                playsInline
                className="w-full h-auto"
                style={{ maxHeight: "85vh" }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* ─── DELETE CONFIRM ─── */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
              <AlertDialogDescription>
                The film, every source frame, and the generated prompt will be permanently removed. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default Gallery;
