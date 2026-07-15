import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { supabase } from "@/integrations/supabase/client";
import { claudeCurate } from "@/hooks/useClaudeCurate";
import { ClaudeQABadge } from "./ClaudeQABadge";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";
import { ShotTypePicker } from "./ShotTypePicker";
import {
  TitleOverlayControls,
  buildTextOverlayPayload,
  DEFAULT_TITLE_OVERLAY,
  type TitleOverlayValue,
} from "./TitleOverlayControls";
import { VibePicker } from "./VibePicker";
import { SettingTooltip } from "./SettingTooltip";
import { TransformationProcessing } from "./TransformationProcessing";
import { normalizeImageForUpload } from "@/lib/normalize-image";
import { withFreshAuth } from "@/lib/auth-refresh";
import { stitchClipsClientSide, downloadBlobOrUrl } from "@/lib/client-stitch";
import { stitchMp4Lossless, ffmpegWasmAvailable } from "@/lib/ffmpeg-stitch";
import { SHOT_TYPES, STAGING_STYLES, AI_PICKED_STAGING_STYLES, ROOM_TYPES, type StagingMode, type RoomType } from "@/lib/shot-types";
import { VIBES } from "@/lib/vibes";
import { SUNO_PRESETS, type SunoPreset, defaultSongForStyle } from "@/lib/suno-presets";
import { SunoMusicPicker } from "./SunoMusicPicker";
import { toast } from "sonner";
import type { ShotType, StagingStyle } from "@/lib/shot-types";
import type { Vibe } from "@/lib/vibes";
import {
  Upload, Loader2, Download, Share2, RefreshCw, Check, AlertCircle, X,
  ChevronRight, Heart
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// ── May 24, 2026 — REMOVED listing_bundle + floor_plan_pan ──
// User direction: kill these two categories. listing_bundle was a "raw
// clips, no stitch" niche that confused buyers; floor_plan_pan was a
// specialty feature with low usage. Both removed from the picker and
// the edge function routing.
type ListingCategory =
  | "animate_single"
  | "sun_to_sun"
  | "done_for_you_reel"
  | "virtual_staging"
  | "sketch_to_real";

// ── DONE-FOR-YOU EDIT STYLES (May 24, 2026 — user-tested on Replicate) ──
// Four edit styles drawn straight from the user's /1a folder. Each style
// is a prompt the user verified on Replicate's Seedance 2.0 playground.
// The video name in /public/vantage/done-for-you/ becomes the option name.
type DfyStyle = "snappy" | "fastcuts" | "creative" | "luxuryminimal";

interface DfyStylePreset {
  id: DfyStyle;
  title: string;
  description: string;
  previewVideo: string;
  /** The exact Seedance prompt the user tested for this edit style. */
  prompt: string;
}

const DFY_STYLES: DfyStylePreset[] = [
  {
    id: "snappy",
    title: "Snappy",
    description: "Fast-paced walk-through with snappy cuts and smooth transitions. Built for the TikTok / Reels scroll.",
    previewVideo: "/vantage/done-for-you/snappy.mp4",
    prompt: "cinematic reel of animated walk through of the house, edited with fast cuts and smooth transitions",
  },
  {
    id: "fastcuts",
    title: "Fast Cuts",
    description: "Room-by-room lifestyle walk-through — like you're touring the home yourself, with brisk transitions.",
    previewVideo: "/vantage/done-for-you/fastcuts.mp4",
    prompt: "cinematic reel of animated walk through of the house, lifestyle style as if walking through the house room by room speeding through transition well",
  },
  {
    id: "creative",
    title: "Creative",
    description: "Step-by-step walk-through, every photo animated and edited together as one composed reel.",
    previewVideo: "/vantage/done-for-you/creative.mp4",
    prompt: "a real estate reel of a walk through of the house with smooth transitions from one animated video of every photo edited together as a reel, filmed as if walking step by step through the house",
  },
  {
    id: "luxuryminimal",
    title: "Luxury Minimal",
    description: "Slow cuts, natural movements, refined and calm — the magazine-grade luxury edit.",
    previewVideo: "/vantage/done-for-you/luxuryminimal.mp4",
    prompt: "cinematic reel of animated walk through of the house, edited with slow cuts, natural movements and feeling of a refined calm luxury",
  },
];
type EffectId = "none" | "just_listed" | "open_house" | "for_sale" | "sold";

interface Photo {
  file: File;
  preview: string;
  url?: string;       // signed URL for Replicate (24h)
  path?: string;      // storage path for gallery persistence (never expires)
  uploading?: boolean; // true while normalize+upload in flight — UI shows spinner
  uploadError?: string; // populated if upload failed; user can retry
  roomLabel?: string;  // optional room label (Living Room, Kitchen…) → tailors the Seedance prompt
}

/** Room labels users can tag each photo with. Seedance renders more
 *  consistently when the prompt names what each shot is, so a labeled shot
 *  list is folded into the generation prompt. Applies to reels AND staging. */
const ROOM_LABELS = [
  "Exterior / Front",
  "Living Room",
  "Kitchen",
  "Primary Bedroom",
  "Bedroom",
  "Bathroom",
  "Dining Room",
  "Home Office",
  "Detail / Feature",
  "Backyard / Pool",
  "View",
  "Other",
];

// Category order is the marketing order: Done-For-You headlines, then the
// other multi-photo + single-photo features. Floor Plan is dropped from
// the homepage showcase but still available here for users who specifically
// want it.
// ── Category ordering (May 16, 2026) ──
// Done-For-You is the headline. Animate Single is the second most popular
// option because everything (Camera Movement, Setup, Cleanup, Transformation)
// lives inside it now. The other multi-photo / specialty categories follow.
const CATEGORY_CARDS = [
  {
    id: "done_for_you_reel" as const,
    title: "Done-For-You Reel",
    eyebrow: "★ MOST POPULAR · 4 EDIT STYLES · UPLOAD ORDER = REEL ORDER",
    description: "Upload 3–6 photos in the exact order you want them to appear. Pick an edit style — Snappy, Fast Cuts, Creative, or Luxury Minimal — and Seedance renders the whole reel in one pass. Audio included by default.",
    details: "15s reel · 50 credits · 4 edit styles · Audio included",
    previewUrl: "/vantage/done-for-you/snappy.mp4",
  },
  {
    id: "animate_single" as const,
    title: "Animate Single",
    eyebrow: "★ 2ND MOST POPULAR · CAMERA · SETUP · CLEANUP · TRANSFORMATION",
    description: "Animate one photo your way. Pick a camera move (tilt, pedestal, push, parallax, orbit, pan) or turn it into a Setup, Cleanup, or full Transformation morph. One feature, every mode.",
    details: "5–10s · 1080p vertical · From 10 credits",
    previewUrl: "/vantage/animate-single/result.mp4",
  },
  {
    id: "virtual_staging" as const,
    title: "Virtual Staging",
    eyebrow: "EMPTY ROOM TO FULLY FURNISHED · 11 STYLES",
    description: "Upload one empty room photo. The room dresses itself in your chosen style — locked-off camera, identical framing. Pick 1, cycle 2–3 styles, or run a begin-and-return showcase.",
    details: "10s film · Single download · 15 credits",
    previewUrl: "/vantage/virtual-staging/result.mp4",
  },
  {
    id: "sun_to_sun" as const,
    title: "Sun-Up to Sundown",
    eyebrow: "DAY-TO-DUSK · GOLDEN-HOUR TIMELAPSE",
    description: "Upload one daytime exterior. We render a static-camera time-lapse through sunrise, golden hour, and dusk in a single 10-second clip.",
    details: "10s film · Single download · 15 credits",
    previewUrl: "/vantage/sun-cycle/result.mp4",
  },
  {
    id: "sketch_to_real" as const,
    title: "Sketch to Reality",
    eyebrow: "HAND-DRAWN REVEAL · SIGNATURE MOMENT",
    description: "Upload your property photo. One 10-second cinematic film: a pencil sketch on a desk transforms into the real photo, then the camera reveals the space.",
    details: "10s film · Single download · 15 credits",
    previewUrl: "/vantage/sketch/result.mp4",
  },
];

const MUSIC_OPTIONS = [
  "Cinematic Slow Build",
  "Modern Lo-Fi Calm",
  "Editorial Neoclassical",
  "Upbeat Indie Pop",
  "Luxury House Beat",
  "Acoustic Warm",
  "No music (you'll add yours)",
];

const EFFECT_OPTIONS: Record<EffectId, string> = {
  none: "None",
  just_listed: "Just Listed",
  open_house: "Open House",
  for_sale: "For Sale",
  sold: "Sold",
};

// Per-feature credit cost.
//
// ── May 23, 2026 — REBALANCE ──
// User directive: 60 free credits has to actually let a new user produce
// something. Old prices made 60 credits insufficient for any flagship
// output, so trials died on contact. Margin is recovered through higher
// pricing tiers ($39 / $79 / $149.99) rather than higher per-feature cost.
//
// New scale (all categories repriced ÷4 on average):
//   Animate Single (1×5s):           10 cr   (was 30)
//   Sun-Up to Sundown (1×10s):       15 cr   (was 60)
//   Virtual Staging (1×10s):         15 cr   (was 60)
//   Sketch to Reality (1×10s):       15 cr   (was 60)
//   Floor Plan Walkthrough (1×10s):  15 cr   (was 60)
//   Listing Bundle (6×5s):           45 cr   (was 180)
//   Done-For-You Reel (6×5s+stitch): 50 cr   (was 200)  ← user-specified anchor
//
// With 60 free credits a new user can: 1 Done-For-You + 1 Animate Single,
// or 4 staging/sketch/sun-to-sun, or 6 animate singles. Real trial value.
function calculateListingCost(category: ListingCategory, effectId: EffectId): number {
  let base = 0;
  if (category === "animate_single") base = 10;
  else if (category === "sun_to_sun") base = 15;
  else if (category === "done_for_you_reel") base = 50;
  else if (category === "virtual_staging") base = 15;
  else if (category === "sketch_to_real") base = 15;

  // Realistic effect (gpt-image-2 sign overlay) adds an image-gen call.
  if (effectId !== "none" && (category === "animate_single" || category === "done_for_you_reel" || category === "sun_to_sun")) {
    base += 5;
  }
  return base;
}

interface ListingVideoFlowProps {
  /** Optional deep-link category — when set, the wizard skips Step 1 (category
   *  picker) and lands directly on the upload step for that category. Used by
   *  homepage/landing-page CTAs that send users to a specific feature. */
  initialCategory?: ListingCategory | null;
}

const VALID_INITIAL_CATEGORIES: ListingCategory[] = [
  "animate_single",
  "sun_to_sun",
  "done_for_you_reel",
  "virtual_staging",
  "sketch_to_real",
];

export function ListingVideoFlow({ initialCategory }: ListingVideoFlowProps = {}) {
  const { user } = useAuth();
  const { credits, refreshCredits, deductCredits } = useCredits();
  const { isPaid, isStarter } = useSubscriptionTier();
  // Free users always see the watermark (baked-in deal). Paid users default to off,
  // but can opt-in via the toggle on the result screen if they want the credibility.
  const [showBranding, setShowBranding] = useState<boolean>(false);
  const watermarkVisible = !isPaid || showBranding;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Honour ?category= deep-links so a CTA pointing at /video?mode=listing&category=
  // done_for_you_reel jumps straight to the upload step for that feature.
  const validInitial =
    initialCategory && VALID_INITIAL_CATEGORIES.includes(initialCategory)
      ? initialCategory
      : null;

  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(validInitial ? 2 : 1);
  const [category, setCategory] = useState<ListingCategory | null>(validInitial);
  // animate_single sub-mode picker. When user picks Animate Single from the
  // category cards, we first show a 4-way picker (Camera Movement / Setup /
  // Cleanup / Transformation) before letting them upload. Setup/Cleanup/
  // Transformation route to TransformationFlow via /video?mode=...; Camera
  // Movement continues in this flow with the shot-type picker.
  const [showAnimateModePicker, setShowAnimateModePicker] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [shotType, setShotType] = useState<ShotType>("push_in");
  const [effectId, setEffectId] = useState<EffectId>("none");
  const [vibe, setVibe] = useState<Vibe>("luxury");
  // Duration option for single-clip categories. animate_single is 5s/10s
  // (revert May 16 — 10s/15s was breaking Seedance for shorter shots).
  // Other single-clip categories keep the 10s/15s extended range. The UI
  // chooses the option set based on category.
  const [singleClipDuration, setSingleClipDuration] = useState<5 | 10 | 15>(10);
  // Clamp duration to a valid value for the current category. animate_single
  // only allows 5s/10s; everything else allows 10s/15s. If the user picks
  // animate_single while singleClipDuration is 15, snap it to 10.
  useEffect(() => {
    if (category === "animate_single" && singleClipDuration === 15) {
      setSingleClipDuration(10);
    } else if (category !== "animate_single" && singleClipDuration === 5) {
      setSingleClipDuration(10);
    }
  }, [category, singleClipDuration]);
  // Burn-in title overlay (Seedance renders text directly into the frame).
  const [titleOverlay, setTitleOverlay] = useState<TitleOverlayValue>(DEFAULT_TITLE_OVERLAY);
  const [stagingStyle, setStagingStyle] = useState<StagingStyle>("luxury_minimalist");
  // ── MULTI-STYLE STAGING (May 24, 2026) ──
  // User's Replicate-tested prompts cycle through 3 design styles in one
  // video (e.g. "mediterranean → luxury minimalist → bohemian"). We let
  // them pick 1–3 styles, choose a mode (single / cycle / cycle+return),
  // or hand the choice to the AI.
  const [stagingMode, setStagingMode] = useState<StagingMode>("single");
  const [stagingStyles, setStagingStyles] = useState<StagingStyle[]>(["luxury_minimalist"]);
  const [stagingAiPick, setStagingAiPick] = useState<boolean>(false);
  // ── Room-type + photo-state (May 25, 2026) ──
  // Per user direction: people choose the room they're uploading and whether
  // the photo is empty or already furnished. Both feed the prompt:
  //   • roomType replaces "living room" in the verbatim template
  //   • isEmpty=false prepends "remove existing furniture, then …"
  const [stagingRoomType, setStagingRoomType] = useState<RoomType>("living room");
  const [stagingIsEmpty, setStagingIsEmpty] = useState<boolean>(true);
  const [sketchIntent, setSketchIntent] = useState<"interior" | "exterior">("interior");
  // ── Done-For-You edit style (May 24, 2026) ──
  // Four user-tested edit styles drawn from /1a. Default to Snappy — that's
  // the highest-traffic style on the user's TikTok ads and is the one we
  // alternate as the homepage hero.
  const [dfyStyle, setDfyStyle] = useState<DfyStyle>("snappy");
  // ── THE STUDIO (June 6, 2026) — locked, per-shot precision mode ──
  // A premium Done-For-You mode: label each photo, choose an action per
  // shot (camera move / virtual staging / sun-to-dusk), and optionally add
  // a line of direction. All photos still go to Seedance in ONE pass; we
  // just compose a shot-by-shot prompt. Unlock code: "vantage".
  const [dfyMode, setDfyMode] = useState<"quick" | "studio">("quick");
  const [studioUnlocked, setStudioUnlocked] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("studio_unlocked") === "1"
  );
  const [studioCodeInput, setStudioCodeInput] = useState("");
  const [showStudioUnlock, setShowStudioUnlock] = useState(false);
  type StudioAction = "camera" | "staging" | "sun";
  interface StudioShot { label: string; action: StudioAction; stagingStyle: StagingStyle; caption: string; }
  const [studioShots, setStudioShots] = useState<Record<number, StudioShot>>({});
  const [studioDirection, setStudioDirection] = useState("");
  const getStudioShot = (i: number): StudioShot =>
    studioShots[i] || { label: "", action: "camera", stagingStyle: "luxury_minimalist", caption: "" };
  const setStudioShot = (i: number, patch: Partial<StudioShot>) =>
    setStudioShots((prev) => ({ ...prev, [i]: { ...getStudioShot(i), ...patch } }));
  // Compose the shot-by-shot Seedance prompt from the per-photo direction.
  // All photos still go in ONE reference_images call; this prompt just tells
  // Seedance what to do with each, in order.
  const composeStudioPrompt = (): string => {
    const kw = (id: StagingStyle) => STAGING_STYLES.find((s) => s.id === id)?.promptKeyword || "modern";
    const shots = photos.map((_, i) => {
      const s = getStudioShot(i);
      const name = s.label.trim() || `shot ${i + 1}`;
      let action: string;
      if (s.action === "staging") action = `the ${name} redesigned into ${kw(s.stagingStyle)} style, furniture changing in place`;
      else if (s.action === "sun") action = `the ${name} as a sunrise-to-dusk timelapse`;
      else action = `a slow cinematic camera move through the ${name}`;
      const extra = s.caption.trim() ? ` (${s.caption.trim()})` : "";
      return `Shot ${i + 1}: ${action}${extra}`;
    }).join(". ");
    const dir = studioDirection.trim() ? ` Overall tone: ${studioDirection.trim()}.` : "";
    return `A cinematic reel walking through the space, shot by shot with smooth transitions. ${shots}.${dir}`;
  };
  // ── Audio toggle (May 24, 2026) ──
  // Seedance 2.0 generates audio natively. Default ON because the user
  // direction is "create with audio by default and without audio if they
  // decide". Forwarded to the edge function as generate_audio.
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);

  // Form state (Step 3) — every field is OPTIONAL. Users have profiles, so
  // we pre-fill from there. The "Generate" CTA works even with all fields
  // blank — the video itself doesn't need a name or address to render.
  const [realtorName, setRealtorName] = useState("");
  const [location, setLocation] = useState("");
  const [showPrice, setShowPrice] = useState(true);
  const [price, setPrice] = useState<number | null>(null);
  const [brokerage, setBrokerage] = useState("");
  const [caption, setCaption] = useState("");
  const [musicVibe, setMusicVibe] = useState("Cinematic Slow Build");
  // ── June 6, 2026 — property fields are real-estate-only ──
  // The product is general-purpose video. We only ask property questions
  // (agent name, location, price, property type) when the user explicitly
  // identifies as a real estate agent. Default OFF.
  const [isRealEstateAgent, setIsRealEstateAgent] = useState(false);
  const [propertyType, setPropertyType] = useState("");

  // Pre-populate the realtor name from the user's profile. Run once on
  // mount; never overwrite a value the user has already typed. Saves the
  // realtor the tedium of retyping their own name on every reel.
  // (Profile only stores full_name — brokerage is per-listing and can be
  // pulled from the user's most-recent submission if we want to deepen
  // pre-fill later.)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const profileFullName = (data as any).full_name as string | null;
      if (profileFullName && !realtorName) setRealtorName(profileFullName);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [clipUrls, setClipUrls] = useState<string[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStitching, setIsStitching] = useState(false);
  const [stitchedUrl, setStitchedUrl] = useState<string | null>(null);
  const [stitchedBlob, setStitchedBlob] = useState<Blob | null>(null);
  const [stitchedExt, setStitchedExt] = useState<"mp4" | "webm">("mp4");
  const [stitchProgress, setStitchProgress] = useState(0);
  const [stitchStyle, setStitchStyle] = useState<"editorial" | "snappy" | "cinema" | "minimal">("editorial");

  const creditCost = calculateListingCost(category || "animate_single", effectId);
  const hasEnoughCredits = credits !== null && credits >= creditCost;

  const uploadFile = async (file: File): Promise<{ url: string; path: string }> => {
    const normalized = await normalizeImageForUpload(file);
    const timestamp = Date.now();
    const fileExt = normalized.name.split(".").pop();
    const filePath = `${user!.id}/listing-${timestamp}.${fileExt}`;

    // Wrap with withFreshAuth — refreshes the access token if it's about to
    // expire, and retries once on the specific "exp claim timestamp check
    // failed" JWT error that fires when a user idles past 1h before clicking
    // upload.
    return await withFreshAuth(async () => {
      const { error: uploadError } = await supabase.storage
        .from("property-photos")
        .upload(filePath, normalized);
      if (uploadError) throw uploadError;

      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from("property-photos")
        .createSignedUrl(filePath, 86400);
      if (signedUrlError || !urlData?.signedUrl) throw signedUrlError;
      return { url: urlData.signedUrl, path: filePath };
    });
  };

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    // ── May 25, 2026 — VISIBLE PHOTO UPLOAD UX ──
    // Previously: sequential `await uploadFile` per photo with no UI
    // feedback. Users saw a frozen screen for 10–30s while 3–6 photos
    // uploaded. Now we (a) show every photo's preview immediately,
    // (b) mark each photo as `uploading` so the grid renders a spinner
    // overlay, (c) run uploads IN PARALLEL, and (d) flip `uploading`
    // off per-photo as each upload completes. The Continue/Generate
    // buttons disable while ANY photo is still uploading.

    if (category === "done_for_you_reel" && fileList.length < 3) {
      toast.error("Done-For-You Reel requires at least 3 photos");
      return;
    }

    // Pick the slice the chosen category accepts.
    const acceptedFiles = (() => {
      if (category === "done_for_you_reel") return fileList.slice(0, 6);
      return [fileList[0]];
    })();

    // 1. Immediately surface preview thumbnails so the user sees their
    //    photos in place. uploading:true triggers the spinner overlay.
    const initialPhotos: Photo[] = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));
    setPhotos(initialPhotos);

    // Advance to the next step immediately so the user sees the photo
    // grid + upload progress (instead of staring at the drop zone).
    // ── Bug fix May 25, 2026 ──
    // virtual_staging now stays on step 2 so the staging-style picker
    // (rendered at step===2 && photos.length>0) actually shows. The
    // previous setStep(3) bypassed the picker entirely and dropped the
    // user straight into the listing-details form.
    setStep(2);

    // 2. Friendly toast — single source of truth on total upload count.
    const toastId = toast.loading(
      acceptedFiles.length === 1
        ? "Uploading your photo…"
        : `Uploading ${acceptedFiles.length} photos — they'll appear as each one finishes.`
    );

    // 3. Parallel upload. Each completion immediately updates THAT photo's
    //    entry in the photos[] array, so the grid clears the spinner
    //    progressively rather than all-at-once at the end.
    let completed = 0;
    const settled = await Promise.allSettled(
      acceptedFiles.map(async (file, idx) => {
        try {
          const { url, path } = await uploadFile(file);
          completed += 1;
          setPhotos((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], url, path, uploading: false };
            return next;
          });
          if (acceptedFiles.length > 1) {
            toast.loading(`Uploaded ${completed} of ${acceptedFiles.length}…`, { id: toastId });
          }
          return { idx, ok: true };
        } catch (err) {
          completed += 1;
          const msg = (err as Error).message;
          setPhotos((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], uploading: false, uploadError: msg };
            return next;
          });
          return { idx, ok: false, msg };
        }
      })
    );

    const failed = settled.filter((s) => s.status === "fulfilled" && !(s.value as { ok: boolean }).ok).length;
    if (failed === 0) {
      toast.success(
        acceptedFiles.length === 1 ? "Photo uploaded." : `All ${acceptedFiles.length} photos uploaded.`,
        { id: toastId }
      );
    } else {
      toast.error(
        `${failed} of ${acceptedFiles.length} photos failed to upload. Try removing and re-adding the failed ones.`,
        { id: toastId }
      );
    }
  };

  // ── May 25, 2026 — Loading-state derivations ──
  // anyPhotoUploading: true while at least one photo is still uploading
  // to storage. Used to disable Continue / Generate so a user can't
  // submit before signed URLs are ready (which would 400 the edge fn).
  const anyPhotoUploading = photos.some((p) => p.uploading === true);
  const anyPhotoFailed = photos.some((p) => !!p.uploadError);

  const handleGenerate = async () => {
    // Only two genuine requirements: a category picked and at least one
    // photo uploaded. Listing metadata (name, location, price, brokerage,
    // caption) is OPTIONAL — the user can generate with bare photos.
    if (!category) {
      toast.error("Pick a film type first");
      return;
    }
    if (!photos.length) {
      toast.error("Upload at least one photo");
      return;
    }
    if (anyPhotoUploading) {
      toast.error("Still uploading your photos — give it a moment.");
      return;
    }
    if (anyPhotoFailed) {
      toast.error("One or more photos failed to upload. Remove and re-add them before generating.");
      return;
    }

    // Listing metadata (realtor name, location, price) is OPTIONAL — the
    // user can generate with just photos uploaded. Empty fields mean the
    // overlays are skipped, not blocked. This unblocks the "I just want to
    // see what this thing makes" flow without forcing a long form first.

    if (!hasEnoughCredits) {
      setShowCreditsModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const photoUrls = photos.map((p) => p.url!);

      // ── CLAUDE CREATIVE DIRECTION (in-app quality layer) ──
      // For Done-For-You reels, let Claude vision reorder the photos into a
      // proper walk-through narrative (hero → living → kitchen → primary →
      // view) before Seedance sees them — a real quality lift over upload
      // order. Fully fail-safe: bounded to ~8s and any problem keeps the
      // original order, so it can never block or break generation.
      let reelPhotoUrls = photoUrls;
      if (category === "done_for_you_reel" && photoUrls.length >= 3) {
        try {
          const curation = await Promise.race([
            claudeCurate(
              photoUrls,
              {
                address: isRealEstateAgent && location ? location : undefined,
                price: isRealEstateAgent && showPrice ? price : undefined,
              },
              Math.min(photoUrls.length, 9),
            ),
            new Promise<null>((r) => setTimeout(() => r(null), 8000)),
          ]);
          if (curation?.ordered_photo_urls?.length) {
            const known = new Set(photoUrls);
            const front = curation.ordered_photo_urls.filter((u) => known.has(u));
            const rest = photoUrls.filter((u) => !front.includes(u));
            if (front.length >= 2) reelPhotoUrls = [...front, ...rest];
          }
        } catch {
          /* keep original order */
        }
      }

      // ── ROOM LABELS → tailored prompt (Seedance labeling tip) ──
      // Align each photo's room label to the order we actually send, then
      // fold a concise labeled shot list into the generation prompt so
      // Seedance knows what each frame is (better consistency).
      const labelByUrl = new Map(photos.map((p) => [p.url, (p.roomLabel || "").trim()]));
      const photoLabels = reelPhotoUrls.map((u) => labelByUrl.get(u) || "");
      const labeledShots = photoLabels
        .map((l, idx) => (l ? `${idx + 1}. ${l}` : null))
        .filter(Boolean)
        .join(", ");
      const baseDfyPrompt =
        dfyMode === "studio"
          ? composeStudioPrompt()
          : (DFY_STYLES.find((s) => s.id === dfyStyle)?.prompt || DFY_STYLES[0].prompt);
      const finalDfyPrompt = labeledShots
        ? `${baseDfyPrompt} Featured spaces, in order: ${labeledShots}.`
        : baseDfyPrompt;

      // ── DONE-FOR-YOU ARCHITECTURE (May 24, 2026) ──
      // Switched off client-stitching. Done-For-You now sends one straight
      // Seedance 2.0 multi-reference call that produces the full reel in
      // one pass — same as the user's verified Replicate tests.
      const response = await supabase.functions.invoke("generate-listing-video", {
        body: {
          photo_labels: photoLabels,
          category,
          photo_urls: reelPhotoUrls,
          shot_type: category === "animate_single" ? shotType : category === "virtual_staging" ? "push_in" : undefined,
          // Done-For-You edit-style prompt + its index — picked from the 4
          // user-tested options (Snappy / Fast Cuts / Creative / Luxury Minimal).
          dfy_style: category === "done_for_you_reel" ? (dfyMode === "studio" ? "studio" : dfyStyle) : undefined,
          dfy_prompt: category === "done_for_you_reel" ? finalDfyPrompt : undefined,
          // Audio toggle — default ON. Forwarded to Seedance modelInput so
          // it generates a music bed natively rather than requiring the
          // user to bolt their own track on after.
          generate_audio: includeAudio,
          staging_style: category === "virtual_staging" ? stagingStyle : undefined,
          // ── MULTI-STYLE STAGING (May 24, 2026) ──
          // Forwarded only for virtual_staging. AI-pick mode swaps in the
          // user's tested-default cycle for whichever stagingMode is set.
          staging_mode: category === "virtual_staging" ? stagingMode : undefined,
          staging_styles:
            category === "virtual_staging"
              ? (stagingAiPick ? AI_PICKED_STAGING_STYLES[stagingMode] : stagingStyles)
              : undefined,
          staging_ai_pick: category === "virtual_staging" ? stagingAiPick : undefined,
          // Room-type + photo-state (May 25, 2026)
          staging_room_type: category === "virtual_staging" ? stagingRoomType : undefined,
          staging_is_empty: category === "virtual_staging" ? stagingIsEmpty : undefined,
          sketch_intent: category === "sketch_to_real" ? sketchIntent : undefined,
          effect_id: effectId,
          effect_mode: effectId !== "none" ? "realistic" : undefined,
          vibe,
          listing: {
            // Property fields only sent when the user identifies as an agent.
            realtor_name: isRealEstateAgent ? realtorName : undefined,
            location: isRealEstateAgent ? location : undefined,
            show_price: isRealEstateAgent ? showPrice : undefined,
            price: isRealEstateAgent && showPrice ? price : undefined,
            brokerage: isRealEstateAgent ? brokerage : undefined,
            property_type: isRealEstateAgent && propertyType ? propertyType : undefined,
            // Caption is general (applies to any video), kept for all.
            caption: (category === "virtual_staging" || category === "sketch_to_real") ? undefined : caption,
            music_vibe: (category === "virtual_staging" || category === "sketch_to_real") ? undefined : musicVibe,
          },
          // ── DURATION ROUTING (May 15, 2026) ──
          // Single-clip categories respect the user's 10s/15s pick.
          // Bundle categories (listing_bundle, done_for_you_reel) keep their
          // per-clip 5s pacing — the user-facing total is N × 5s and the
          // 15s option doesn't apply (the bundle total > 15s already).
          duration:
            category === "animate_single" ? singleClipDuration
            : category === "sun_to_sun" ? singleClipDuration
            : category === "virtual_staging" ? singleClipDuration
            : category === "sketch_to_real" ? singleClipDuration
            : category === "done_for_you_reel" ? 15 // single 15s Seedance reel
            : 5,
          credits_cost: creditCost,
          // Burn-in title overlay — only sent when enabled and non-empty.
          // Suppressed for done_for_you_reel (the auto-stitch adds its own
          // title card, so a Seedance-burned title would compete with that)
          // and for transformation categories where the morph is the subject.
          text_overlay: (
            category === "done_for_you_reel"
            || category === "virtual_staging"
            || category === "sketch_to_real"
          ) ? undefined : buildTextOverlayPayload(titleOverlay),
        },
      });

      // Surface the actual server error message, not just "non-2xx"
      if (response.error) {
        let detailedMsg = response.error.message || "Generation failed";
        try {
          const errCtx: any = (response.error as any).context;
          if (errCtx?.body) {
            const parsed = typeof errCtx.body === "string" ? JSON.parse(errCtx.body) : errCtx.body;
            if (parsed?.error) detailedMsg = parsed.error;
            if (parsed?.debug?.received) {
              console.error("[ListingVideoFlow] server received:", parsed.debug.received);
            }
          }
        } catch (parseErr) {
          console.warn("Could not parse error body:", parseErr);
        }
        if (response.data?.error) detailedMsg = response.data.error;
        throw new Error(detailedMsg);
      }

      // ── Async path: edge function returned prediction_id(s), poll until ready ──
      let finalVideoUrl: string | null = response.data?.video_url || null;
      let finalClipUrls: string[] = response.data?.clip_urls || [];
      // CRITICAL: capture the permanent storage paths returned by the edge
      // function. Pre-fix, the poll branch only captured video_url + clip_urls
      // and silently dropped output_video_path / output_clip_paths, leaving
      // bundles with only the ephemeral Replicate URLs in the DB. Every
      // bundle generation older than 24h showed as a dead link in the gallery
      // because of this single missing line.
      let finalVideoPath: string | null = response.data?.output_video_path || null;
      let finalClipPathsFromServer: string[] = Array.isArray(response.data?.output_clip_paths)
        ? response.data.output_clip_paths
        : [];

      // ── GUARANTEED-15s EXTENDED CUT (May 15, 2026) ──
      // When the edge function couldn't run a native 15s Seedance generation
      // because Replicate rejected the duration, it splits into a 10s + 5s
      // parallel pair and marks the response with extended_cut: true. The
      // bundle-poll path will still chase both predictions; we just need to
      // remember the flag so we can concat the two MP4s via ffmpeg.wasm
      // once both clips land. The user always gets a single 15s MP4 — no
      // visible workaround.
      const isExtendedCut = !!response.data?.extended_cut;
      const isBundleAsync =
        response.data?.status === "processing" &&
        Array.isArray(response.data?.prediction_ids);
      const isSingleAsync =
        response.data?.status === "processing" &&
        !!response.data?.prediction_id;

      if (isBundleAsync || isSingleAsync) {
        const quickEff = response.data.quick_effect;
        const maxAttempts = 90; // 90 × 4s = 6 min max
        let predictionIds = response.data.prediction_ids; // bundle case
        const singlePredId = response.data.prediction_id; // single case

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise((r) => setTimeout(r, 4000));
          const pollBody: any = isBundleAsync
            ? { prediction_ids: predictionIds, quick_effect: quickEff }
            : { prediction_id: singlePredId, quick_effect: quickEff };

          const pollRes = await supabase.functions.invoke("generate-listing-video", { body: pollBody });
          if (pollRes.error) {
            let pollMsg = pollRes.error.message;
            try {
              const ctx: any = (pollRes.error as any).context;
              if (ctx?.body) {
                const parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
                if (parsed?.error) pollMsg = parsed.error;
              }
            } catch {}
            throw new Error(`Polling failed: ${pollMsg}`);
          }
          if (pollRes.data?.status === "complete" && pollRes.data?.video_url) {
            finalVideoUrl = pollRes.data.video_url;
            if (Array.isArray(pollRes.data?.clip_urls) && pollRes.data.clip_urls.length > 0) {
              finalClipUrls = pollRes.data.clip_urls;
            }
            // CRITICAL: grab the persistence paths from the poll response.
            if (pollRes.data?.output_video_path) {
              finalVideoPath = pollRes.data.output_video_path;
            }
            if (Array.isArray(pollRes.data?.output_clip_paths) && pollRes.data.output_clip_paths.length > 0) {
              finalClipPathsFromServer = pollRes.data.output_clip_paths;
            }
            break;
          }
          if (pollRes.data?.status === "failed") {
            throw new Error(pollRes.data.error || "Generation failed during processing");
          }
          // Status is "processing"
          // Update bundle prediction_ids with progress for next poll
          if (isBundleAsync && Array.isArray(pollRes.data?.prediction_ids)) {
            predictionIds = pollRes.data.prediction_ids;
          }
        }
        if (!finalVideoUrl) {
          throw new Error("Generation took longer than 6 minutes. Try again or contact support.");
        }
      }

      if (!finalVideoUrl) {
        throw new Error("No video URL returned from generation");
      }

      // ── EXTENDED-CUT CONCAT (15s guaranteed) ──
      // If the server split the 15s request into a 10s + 5s pair, both
      // clips are now in finalClipUrls. Concat them via ffmpeg.wasm into
      // one continuous 15s MP4 and use THAT as the user-facing output.
      if (isExtendedCut && finalClipUrls.length === 2) {
        try {
          console.log("[ListingVideoFlow] extended_cut detected — concatenating two clips into one 15s MP4");
          toast.success("Stitching your 15s cut…");
          const stitched = await stitchMp4Lossless({
            clipUrls: finalClipUrls,
            onStatus: (msg) => console.log("[ext-15s]", msg),
          });
          // Replace the user-facing video with the concatenated result.
          finalVideoUrl = stitched.url;
          // The Blob is also captured so download works on mobile via Web Share.
          setStitchedUrl(stitched.url);
          setStitchedBlob(stitched.blob);
          setStitchedExt(stitched.ext);
          console.log(`[ListingVideoFlow] extended cut ready — ${(stitched.blob.size / 1_000_000).toFixed(1)}MB MP4 via ${stitched.method}`);
        } catch (concatErr) {
          // ffmpeg failed — fall back to playing the first clip alone.
          // Better to ship 10s than to fail outright.
          console.error("[ListingVideoFlow] extended-cut concat failed, falling back to 10s clip:", concatErr);
          toast.error("Couldn't merge into 15s — delivered the 10s base clip instead.");
        }
      }

      // Capture all clips for the bundle path. For single-clip categories, clip_urls === [video_url].
      const allClips: string[] = finalClipUrls.length > 0 ? finalClipUrls : [finalVideoUrl];
      setClipUrls(allClips);
      setActiveClipIndex(0);
      setVideoUrl(finalVideoUrl);

      // Persist a submission row so this listing video shows up in the user's gallery.
      // CRITICAL: every NOT NULL column must be populated. The original
      // schema declared `video_style`, `business_name`, `project_description`,
      // `transformation_type` as NOT NULL. The previous version of this code
      // omitted `video_style`, which caused EVERY listing-mode insert to fail
      // with a constraint violation that was silently swallowed by the catch
      // block — that's why the gallery showed nothing for listing reels even
      // though the videos generated successfully.
      let createdSubmissionId: string | null = null;
      try {
        // Use the paths captured from EITHER the initial response (sync path)
        // OR the final poll response (async path). Previously this line only
        // looked at the initial response.data — which on async generations is
        // the "processing" payload with no paths set. That's why bundles
        // were saving only the Replicate URL and dying after 24h.
        const finalClipPaths: string[] = finalClipPathsFromServer.length > 0
          ? finalClipPathsFromServer
          : (finalVideoPath ? [finalVideoPath] : []);
        console.log("[ListingVideoFlow] persistence summary:", {
          finalVideoPath,
          clipPathCount: finalClipPaths.length,
          clipUrlCount: allClips.length,
          missingPaths: finalClipPaths.length === 0
            ? "⚠️ NO STORAGE PATHS — gallery will use expiring Replicate URL"
            : "✅ storage paths captured",
        });
        const { data: insertData, error: insertErr } = await supabase
          .from("submissions")
          .insert({
            user_id: user!.id,
            full_name: user!.email || "user",
            email: user!.email || "noreply@thevantage.media",
            business_name: realtorName || brokerage || "Self",
            project_description: caption || generatedCaption || `${category || "listing"} reel`,
            transformation_type: category || "listing",
            transformation_category: null,
            video_type: "listing",
            video_style: stitchStyle || "cinematic", // ← was missing → INSERT failed
            status: "delivered",
            prompt_status: "complete",
            // Store the storage paths (never expire), not the signed URLs (which do).
            after_photo_paths: photos.map((p) => p.path).filter(Boolean) as string[],
            output_video_url: finalVideoUrl,
            output_video_path: finalClipPaths[0] || null,
            // Persist EVERY per-photo clip path so the Gallery can offer
            // a separate download for each one. Without this, only the
            // first clip was reachable from the UI even though all of
            // them were already uploaded to storage by the edge function.
            output_clip_paths: finalClipPaths.length ? finalClipPaths : null,
            // Persist the original Replicate clip URLs too — they expire
            // ~24h after generation, but during that window the backfill
            // edge function can re-download any clip whose storage upload
            // failed at generation time. Without this, a transient storage
            // hiccup leaves a bundle with no permanent source.
            output_clip_urls: allClips.length ? allClips : null,
          })
          .select("id")
          .maybeSingle();
        if (insertErr) {
          // Log loudly AND surface to user. Silencing this hid a migration
          // mismatch (missing output_clip_urls column) for days — users
          // were generating but nothing appeared in the gallery. Now we
          // tell them so we catch schema drift early.
          console.error("[ListingVideoFlow] gallery insert failed:", insertErr);
          toast.error(`Gallery save failed: ${insertErr.message ?? "schema mismatch"}`);
        } else {
          createdSubmissionId = insertData?.id ?? null;
        }
      } catch (persistErr) {
        console.error("[ListingVideoFlow] gallery persist exception:", persistErr);
        toast.error("Couldn't save to gallery — your video is still downloadable from this page.");
      }

      // Pass description + submissionId so the deduct hits the new
      // server-side RPC with full context (and the unique-index idempotency
      // key includes submission_id).
      await deductCredits(
        creditCost,
        `${category || "listing"} reel`,
        createdSubmissionId ?? undefined,
      );
      await refreshCredits();
      setStep(7);

      // For Done-For-You Reel, AUTO-STITCH the clips into a single MP4 with the
      // chosen style preset. The user paid for the white-glove deliverable —
      // they shouldn't have to click an extra button.
      if (category === "done_for_you_reel" && allClips.length > 1) {
        // Don't await — let the user see the per-clip player while stitching runs
        // in the background. The result screen swaps to the stitched MP4 when ready.
        // No toast on failure — the per-clip player still works as a fallback,
        // and the "Stitch into Single MP4" button is right there if they want
        // to retry. A bare error toast just confuses users who don't know what
        // stitching is.
        setTimeout(() => {
          handleStitchReel().catch((e) => {
            console.error("[done_for_you_reel] auto-stitch failed:", e);
          });
        }, 500);
      }
    } catch (err) {
      const msg = (err as Error).message;
      console.error("[ListingVideoFlow] generation error:", err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate caption. Every field is OPTIONAL — when blank, we just
  // skip that fragment instead of writing "Just listed in . — " with empty
  // placeholders. The skip-and-generate path needs a usable caption even
  // when the user hasn't typed anything.
  const generatedCaption = (() => {
    const parts: string[] = []
    if (location.trim()) parts.push(`Just listed in ${location.trim()}.`)
    else parts.push("Just listed.")
    if (showPrice && price) parts.push(`$${price.toLocaleString()}.`)
    parts.push("Tour the property — link in bio.")
    if (realtorName.trim()) {
      const byline = brokerage.trim()
        ? `— ${realtorName.trim()}, ${brokerage.trim()}`
        : `— ${realtorName.trim()}`
      parts.push(byline)
    }
    return parts.join(" ")
  })()

  // ── STITCH PIPELINE (rebuilt May 13, 2026) ──
  // Primary path: ffmpeg.wasm concat demuxer with -c copy. Stream-copies the
  // source MP4 bytes into a single output — zero re-encode, zero quality
  // loss, bit-perfect preservation of what Seedance delivered. Solves every
  // quality complaint logged this session ("absurd cuts", "lowering
  // quality", "movement glitches", "black screen with music") because the
  // canvas + MediaRecorder pipeline that caused them is no longer in the
  // critical path.
  //
  // Fallback path: the legacy canvas + MediaRecorder stitcher, used only if
  // ffmpeg.wasm can't load (cross-origin isolation not active, very old
  // browser, etc). The fallback ships with no music, no transitions, just
  // the visual to ensure SOME output reaches the user even on degraded
  // platforms.
  const handleStitchReel = async () => {
    if (!clipUrls || clipUrls.length < 2) {
      toast.error("Stitching requires multiple clips");
      return;
    }

    setIsStitching(true);
    setError(null);
    setStitchProgress(0);

    // Visible diagnostic at the start of every stitch — when users report
    // bad output the first question is "which path did you take". Console
    // logs make that answerable without redeploying.
    console.log("[stitch] starting", {
      clipCount: clipUrls.length,
      isolated: typeof crossOriginIsolated !== "undefined" ? crossOriginIsolated : "unknown",
      sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      ffmpegPath: "primary: ffmpeg.wasm · fallback: canvas+MediaRecorder",
    });

    // ── PRIMARY: ffmpeg.wasm lossless concat ──
    const support = ffmpegWasmAvailable();
    if (support.ok) {
      try {
        console.log("[stitch] ffmpeg.wasm path — fetching clips + concatenating losslessly");
        const result = await stitchMp4Lossless({
          clipUrls,
          onProgress: (frac) => setStitchProgress(frac),
          onStatus: (msg) => console.log("[stitch:ffmpeg]", msg),
        });
        console.log(`[stitch] ✅ done via ${result.method} — ${(result.blob.size / 1_000_000).toFixed(1)}MB MP4`);
        setStitchedUrl(result.url);
        setStitchedBlob(result.blob);
        setStitchedExt(result.ext);
        toast.success(
          result.method === "ts_concat"
            ? "Final cut ready — lossless MP4."
            : "Final cut ready — re-encoded MP4.",
        );
        return;
      } catch (err) {
        console.error("[stitch] ❌ ffmpeg.wasm failed, falling back to canvas:", err);
        toast.error(
          "Lossless stitch failed — trying browser fallback. Output may be webm.",
        );
        // Don't return — fall through to canvas fallback so the user still gets something.
      }
    } else {
      console.warn("[stitch] ⚠️ ffmpeg.wasm unavailable, using canvas fallback:", support.reason);
      toast.error(
        "MP4 stitcher needs page refresh. Hard-refresh (Cmd-Shift-R) for lossless output.",
      );
    }

    // ── FALLBACK: canvas + MediaRecorder (legacy) ──
    // Used only when ffmpeg.wasm can't load. Produces WebM on Chrome with
    // visible re-encode quality loss — but it ships SOMETHING rather than
    // nothing. No music: audio mixdown caused "black screen with music"
    // and forced codec constraints that hurt video bitrate.
    try {
      const result = await stitchClipsClientSide({
        clips: clipUrls,
        listing: {
          price: showPrice ? price : undefined,
          realtor_name: realtorName,
          location,
          brokerage,
          show_price: showPrice,
          caption: caption || undefined,
        },
        watermark: !isPaid || showBranding,
        style: stitchStyle,
        audioUrl: undefined,
        audioGain: 0.85,
        onProgress: (frac) => setStitchProgress(frac),
      });

      setStitchedUrl(result.url);
      setStitchedBlob(result.blob);
      setStitchedExt(result.ext);
      toast.success("Final cut ready. Tap download to save.");
    } catch (err) {
      console.error("[ListingVideoFlow] canvas fallback stitch also failed:", err);
      toast.error("Couldn't stitch — download the individual clips instead (they're already MP4).");
    } finally {
      setIsStitching(false);
    }
  };

  // ── ANIMATE SINGLE MODE PICKER ──
  // 4 options:
  //   • Camera Movement → continues in this flow (Seedance single-image)
  //   • Setup           → /video?mode=setup (TransformationFlow, Kling)
  //   • Cleanup         → /video?mode=cleanup (TransformationFlow, Kling)
  //   • Transformation  → /video?mode=transform (TransformationFlow, Kling)
  if (step === 1 && showAnimateModePicker) {
    const modes = [
      {
        id: "camera",
        title: "Camera Movement",
        eyebrow: "ANIMATE ONE PHOTO · TILT · PEDESTAL · PUSH · ORBIT · PAN",
        description: "Pick a single hero photo and choose any camera move — tilt up/down, pedestal up/down, push in, pull back, parallax left/right, slow orbit, architectural slider. Six to ten seconds, 1080p vertical.",
        details: "5–10s · From 10 credits",
        previewUrl: "/vantage/animate-single/result.mp4",
        action: () => {
          setShowAnimateModePicker(false);
          setCategory("animate_single");
          setStep(2);
        },
      },
      {
        id: "setup",
        title: "Setup",
        eyebrow: "EMPTY → FINISHED · ANCHORED AT BOTH ENDS",
        description: "Upload the empty before and the finished after. We animate the build — furniture appears, the room dresses itself, the space resolves to your final photo.",
        details: "5–10s · From 12 credits",
        previewUrl: "/vantage/setup/video.mp4",
        action: () => navigate("/video?mode=setup"),
      },
      {
        id: "cleanup",
        title: "Cleanup",
        eyebrow: "CLUTTERED → CLEAN · END-STATE LOCKED",
        description: "Upload the cluttered before and the cleaned after. Junk fades, surfaces clear, the room resolves to the restored state shown in your final photo.",
        details: "5–10s · From 12 credits",
        previewUrl: "/vantage/cleanup/result.mp4",
        action: () => navigate("/video?mode=cleanup"),
      },
      {
        id: "transformation",
        title: "Before & After Reveal",
        eyebrow: "RENOVATION · KITCHEN, EXTERIOR, FULL BUILD",
        description: "Upload the raw before and the finished after of any project — kitchen remodel, full build, exterior renovation, landscaping. We animate the reveal from old to new.",
        details: "5–10s · From 12 credits",
        previewUrl: "/vantage/build/result.mp4",
        action: () => navigate("/video?mode=transform"),
      },
    ];
    return (
      <div className="py-6 lg:py-10" style={{ background: "var(--lux-bone)" }}>
        <div>
          <button
            onClick={() => setShowAnimateModePicker(false)}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2.5 border transition-colors"
            style={{
              background: "var(--lux-bone)",
              borderColor: "var(--lux-hairline)",
              color: "var(--lux-ink)",
            }}
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span className="lux-eyebrow text-xs">BACK TO LISTING VIDEOS</span>
          </button>
          <div className="mb-10">
            <div className="lux-eyebrow mb-4" style={{ color: "var(--lux-rust)" }}>
              ANIMATE SINGLE · CHOOSE YOUR MODE
            </div>
            <h2
              className="lux-display"
              style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 0.95 }}
            >
              One photo, <span className="lux-display-italic">four modes.</span>
            </h2>
            <p className="lux-prose mt-4 max-w-2xl" style={{ color: "var(--lux-ash)" }}>
              Camera Movement animates a single image. Setup, Cleanup, and Transformation morph a before into an after — anchored at both ends so the result actually completes.
            </p>
          </div>
          {/* Same auto-fit pattern — 4 modes naturally line up in one row
              on desktop while gracefully collapsing on narrow viewports. */}
          <div
            className="grid gap-6 lg:gap-8"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
          >
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={m.action}
                className="group text-left flex flex-col relative overflow-hidden"
                style={{
                  background: "var(--lux-cream)",
                  color: "var(--lux-ink)",
                  border: "1px solid var(--lux-hairline)",
                  transition: "all 0.3s var(--lux-ease)",
                  minWidth: 0,
                  minHeight: "320px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--lux-ink)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--lux-hairline)")}
              >
                <video
                  src={m.previewUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full aspect-[4/3] object-cover"
                  style={{ background: "var(--lux-ink)" }}
                />
                <div style={{ padding: "28px 26px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div
                    className="lux-eyebrow mb-3"
                    style={{ color: "var(--lux-rust)", fontSize: "0.7rem", letterSpacing: "0.16em", lineHeight: 1.4 }}
                  >
                    {m.eyebrow}
                  </div>
                  <h3 className="lux-display mb-3" style={{ fontSize: "1.7rem", lineHeight: 1.1 }}>
                    {m.title}
                  </h3>
                  <p className="lux-prose mb-4 flex-1" style={{ fontSize: "0.95rem", lineHeight: 1.55 }}>
                    {m.description}
                  </p>
                  <div
                    className="flex items-center justify-between gap-3 pt-3"
                    style={{ borderTop: "1px solid var(--lux-hairline)" }}
                  >
                    <span className="text-xs" style={{ fontSize: "0.7rem", lineHeight: 1.4 }}>
                      {m.details}
                    </span>
                    <ChevronRight
                      className="w-4 h-4 flex-shrink-0 group-hover:translate-x-1 transition"
                      style={{ color: "var(--lux-brass)" }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: Category picker
  // ── May 23, 2026 — desktop-fit ──
  // Dropped lux-section (180px vertical padding) and the inner lux-container
  // (1320px max-width) — Video.tsx <main> already provides the responsive
  // max-width (up to 1800px on 2xl) plus its own padding. Nesting both was
  // causing the cramped "skinny mobile column" the user saw on desktop.
  if (step === 1) {
    return (
      <div className="py-6 lg:py-10" style={{ background: "var(--lux-bone)" }}>
        <div>
          <div className="mb-10 lg:mb-12">
            <div className="lux-eyebrow mb-4" style={{ color: "var(--lux-rust)" }}>
              LISTING VIDEO TYPES
            </div>
            <h2
              className="lux-display"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 0.92 }}
            >
              Choose your <span className="lux-display-italic">listing film</span>
            </h2>
          </div>

          {/* Auto-fit grid: cards are always >= 280px wide and pack as many
              columns as the viewport allows. On a 1900px desktop with 8px
              gaps, this yields 5-6 cards per row at ~300px each — fills the
              screen instead of clustering narrow cards in the centre. */}
          <div
            className="grid gap-6 lg:gap-8"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
          >
            {CATEGORY_CARDS.map((card) => {
              const isFeatured = card.id === "done_for_you_reel" || card.id === "animate_single";
              return (
              <button
                key={card.id}
                onClick={() => {
                  // animate_single → first show the 4-way mode picker
                  // (Camera / Setup / Cleanup / Transformation). Camera
                  // Movement stays in this flow; the other three route to
                  // /video?mode=setup|cleanup|transform (TransformationFlow,
                  // Kling start+end pair).
                  if (card.id === "animate_single") {
                    setShowAnimateModePicker(true);
                    return;
                  }
                  setCategory(card.id);
                  setStep(2);
                }}
                className="group text-left flex flex-col relative overflow-hidden"
                style={{
                  background: isFeatured ? "var(--lux-ink)" : "var(--lux-cream)",
                  color: isFeatured ? "var(--lux-bone)" : "var(--lux-ink)",
                  border: `1px solid ${isFeatured ? "var(--lux-ink)" : "var(--lux-hairline)"}`,
                  transition: "all 0.3s var(--lux-ease)",
                  // Real width floor — keep content readable even at the smaller
                  // md breakpoint (768px → 2-up = ~360px each).
                  minWidth: 0,
                  minHeight: "360px",
                  boxShadow: isFeatured ? "0 14px 40px rgba(14,14,12,0.18)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isFeatured) e.currentTarget.style.borderColor = "var(--lux-ink)";
                }}
                onMouseLeave={(e) => {
                  if (!isFeatured) e.currentTarget.style.borderColor = "var(--lux-hairline)";
                }}
              >
                {/* ── Preview video (May 16, 2026) ──
                    Each card shows a looping example of what the feature
                    produces so users see the breadth before clicking in.
                    Muted + autoPlay + playsInline so it works on mobile. */}
                {card.previewUrl && (
                  <video
                    src={card.previewUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full aspect-[4/3] object-cover"
                    style={{ background: "var(--lux-ink)" }}
                  />
                )}
                <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
                {isFeatured && (
                  <div
                    className="lux-eyebrow absolute top-2 right-4 px-3 py-1"
                    style={{
                      background: "var(--lux-rust)",
                      color: "var(--lux-bone)",
                      fontSize: "0.6rem",
                      letterSpacing: "0.18em",
                    }}
                  >
                    DONE-FOR-YOU
                  </div>
                )}
                <div
                  className="lux-eyebrow mb-4"
                  style={{
                    color: isFeatured ? "var(--lux-champagne)" : "var(--lux-rust)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.16em",
                    lineHeight: 1.4,
                    wordBreak: "normal",
                    overflowWrap: "break-word",
                  }}
                >
                  {card.eyebrow}
                </div>
                <h3
                  className="lux-display mb-4"
                  style={{
                    // Fixed scale instead of vw clamp — vw was punishing the
                    // typography at narrow desktop widths and producing 1-char
                    // line wraps. 1.7rem reads cleanly at all widths.
                    fontSize: "1.7rem",
                    lineHeight: 1.1,
                    wordBreak: "normal",
                    overflowWrap: "break-word",
                    hyphens: "manual",
                    color: isFeatured ? "var(--lux-bone)" : "var(--lux-ink)",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  className="lux-prose mb-5 flex-1"
                  style={{
                    fontSize: "0.95rem",
                    lineHeight: 1.55,
                    color: isFeatured ? "rgba(244,239,230,0.88)" : "var(--lux-ink)",
                  }}
                >
                  {card.description}
                </p>
                <div
                  className="flex items-center justify-between gap-3 mt-auto pt-3"
                  style={{ borderTop: `1px solid ${isFeatured ? "rgba(244,239,230,0.18)" : "var(--lux-hairline)"}` }}
                >
                  <span
                    className="text-xs"
                    style={{
                      color: isFeatured ? "var(--lux-champagne)" : "var(--lux-ink)",
                      fontSize: "0.7rem",
                      lineHeight: 1.4,
                    }}
                  >
                    {card.details}
                  </span>
                  <ChevronRight
                    className="w-4 h-4 flex-shrink-0 group-hover:translate-x-1 transition"
                    style={{ color: isFeatured ? "var(--lux-champagne)" : "var(--lux-brass)" }}
                  />
                </div>
                </div>
              </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // STEP 2a: Sketch to Real intent picker (sketch_to_real only)
  if (step === 2 && category === "sketch_to_real" && photos.length > 0) {
    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-2xl lg:max-w-4xl">
          {/* ── DISCOVERABILITY: surface the other 6 films ──
              Top-level CTAs deep-link straight into Done-For-You Reel, which
              hid the other 6 categories behind a vague "← Back" label. This
              banner replaces that with a clear invitation to browse the full
              menu so users know the breadth of the product. */}
          <button
            onClick={() => setStep(1)}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2.5 border transition-colors"
            style={{
              color: "var(--lux-ink)",
              background: "var(--lux-cream)",
              borderColor: "var(--lux-hairline-strong)",
              cursor: "pointer",
              fontSize: "0.78rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontFamily: "var(--lux-display-font, inherit)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lux-ink)"; e.currentTarget.style.color = "var(--lux-bone)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--lux-cream)"; e.currentTarget.style.color = "var(--lux-ink)"; }}
          >
            ← Browse all 5 films
          </button>

          <div className="mb-12">
            <h2 className="lux-display mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Is this an interior or exterior shot?
            </h2>
            <p className="lux-prose mb-6" style={{ color: "var(--lux-ink)" }}>
              Tells us whether to draw a room sketch or an architectural exterior sketch on the desk.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            {[
              { id: "interior" as const, label: "Interior", description: "Room, hallway, or space" },
              { id: "exterior" as const, label: "Exterior", description: "Building facade or landscape" },
            ].map((option) => {
              const isSelected = sketchIntent === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSketchIntent(option.id)}
                  className={`text-left p-8 rounded-none border transition-all ${
                    isSelected
                      ? "bg-ink border-ink text-bone"
                      : "bg-bone border-hairline hover:border-ink"
                  }`}
                  style={isSelected ? {
                    backgroundColor: "#0E0E0C",
                    borderColor: "#0E0E0C",
                    color: "#F4EFE6",
                  } : {
                    backgroundColor: "#F4EFE6",
                    borderColor: "var(--lux-hairline)",
                    color: "#0E0E0C",
                  }}
                >
                  <h3 className="lux-display text-xl mb-2">{option.label}</h3>
                  <p className="lux-prose" style={{
                    color: isSelected ? "#A39E94" : "#6B6760",
                  }}>
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setStep(3)}
            className="lux-btn w-full"
            style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "18px 24px" }}
          >
            Continue to Style →
          </button>
        </div>
      </div>
    );
  }

  // ── Floor Plan Pan shot picker REMOVED (May 13, 2026) ──
  // Per user direction: the cinematic ShotTypePicker (with preview videos)
  // should only appear on the Animate Single page — not on floor plans,
  // staging, sketch, or transformation flows. Floor Plan Pan now uses the
  // default shotType "push_in" (which it inherits from useState init) so
  // the camera move is consistent across every floor-plan generation.

  // STEP 2c: Virtual Staging style picker (virtual_staging only)
  if (step === 2 && category === "virtual_staging" && photos.length > 0) {
    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-2xl lg:max-w-4xl">
          {/* ── DISCOVERABILITY: surface the other 6 films ──
              Top-level CTAs deep-link straight into Done-For-You Reel, which
              hid the other 6 categories behind a vague "← Back" label. This
              banner replaces that with a clear invitation to browse the full
              menu so users know the breadth of the product. */}
          <button
            onClick={() => setStep(1)}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2.5 border transition-colors"
            style={{
              color: "var(--lux-ink)",
              background: "var(--lux-cream)",
              borderColor: "var(--lux-hairline-strong)",
              cursor: "pointer",
              fontSize: "0.78rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontFamily: "var(--lux-display-font, inherit)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lux-ink)"; e.currentTarget.style.color = "var(--lux-bone)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--lux-cream)"; e.currentTarget.style.color = "var(--lux-ink)"; }}
          >
            ← Browse all 5 films
          </button>

          <div className="mb-10">
            <h2 className="lux-display mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Choose your style
            </h2>
            <p className="lux-prose mb-2" style={{ color: "var(--lux-ash)" }}>
              Pick how you'd like the room furnished, or let us pick. You can showcase up to 3 design styles in one video.
            </p>
          </div>

          {/* ── ROOM TYPE + PHOTO STATE (May 25, 2026) ──
              Per user direction: people pick the room they're uploading
              (the word goes straight into the prompt) and tell us whether
              their photo is empty or already furnished (changes whether
              we prepend a "remove existing furniture, then …" clause). */}
          <div className="grid gap-5 sm:grid-cols-2 mb-10">
            {/* Room type — dropdown */}
            <div>
              <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-brass)", fontWeight: 700 }}>
                ✦ WHICH ROOM IS THIS?
              </div>
              <select
                value={stagingRoomType}
                onChange={(e) => setStagingRoomType(e.target.value as RoomType)}
                className="w-full px-4 py-3 lux-prose"
                style={{
                  background: "var(--lux-bone)",
                  border: "1px solid var(--lux-hairline-strong)",
                  color: "var(--lux-ink)",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.95rem",
                  appearance: "auto",
                }}
              >
                {ROOM_TYPES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs mt-2" style={{ color: "var(--lux-ash)", lineHeight: 1.5 }}>
                We use this exact word in the prompt — e.g. "redesign the {stagingRoomType} furniture decor…"
              </p>
            </div>

            {/* Empty vs furnished — radio */}
            <div>
              <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-brass)", fontWeight: 700 }}>
                ✦ IS YOUR PHOTO EMPTY OR FURNISHED?
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: true,  label: "Empty room",     desc: "Bare walls + floor. We add the furniture." },
                  { id: false, label: "Not empty",      desc: "Already furnished. We replace what's there." },
                ].map((opt) => {
                  const isSel = stagingIsEmpty === opt.id;
                  return (
                    <button
                      key={String(opt.id)}
                      type="button"
                      onClick={() => setStagingIsEmpty(opt.id)}
                      className="text-left p-4 border transition-all"
                      style={isSel ? {
                        background: "var(--lux-ink)",
                        borderColor: "var(--lux-ink)",
                        color: "var(--lux-bone)",
                      } : {
                        background: "var(--lux-bone)",
                        borderColor: "var(--lux-hairline-strong)",
                        color: "var(--lux-ink)",
                      }}
                    >
                      <div className="lux-display text-base mb-1">{opt.label}</div>
                      <div className="text-xs" style={{ opacity: isSel ? 0.75 : 0.65, lineHeight: 1.5 }}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── MODE PICKER ──
              Three modes mirror the user's Replicate-tested prompts:
                • single      → one style transformation
                • cycle       → 2–3 styles cycle in one video
                • cycle+return → 2–3 styles, then back to the original room
          */}
          <div className="mb-8">
            <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-brass)", fontWeight: 700 }}>
              ✦ HOW MANY STYLES
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
            >
              {([
                { id: "single", label: "Single style", desc: "One transformation. The original room becomes the style you pick." },
                { id: "cycle", label: "Cycle 2–3 styles", desc: "Showcase 2–3 design styles in one continuous video. Most popular." },
                { id: "cycle_return", label: "Cycle + return", desc: "Original → 2–3 styles → back to original. Loops cleanly on social." },
              ] as { id: StagingMode; label: string; desc: string }[]).map((m) => {
                const isSel = stagingMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setStagingMode(m.id);
                      // Reset selections to a sensible default for the new mode.
                      if (m.id === "single") setStagingStyles((s) => [s[0] || "luxury_minimalist"]);
                      else if (stagingStyles.length < 2) setStagingStyles(AI_PICKED_STAGING_STYLES[m.id]);
                    }}
                    className="text-left p-5 border transition-all"
                    style={isSel ? {
                      background: "var(--lux-ink)",
                      borderColor: "var(--lux-ink)",
                      color: "var(--lux-bone)",
                    } : {
                      background: "var(--lux-bone)",
                      borderColor: "var(--lux-hairline-strong)",
                      color: "var(--lux-ink)",
                    }}
                  >
                    <div className="lux-display text-lg mb-1.5">{m.label}</div>
                    <p className="text-sm" style={{ color: isSel ? "rgba(244,239,230,0.7)" : "var(--lux-ash)", lineHeight: 1.45 }}>
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── AI-PICK TOGGLE ──
              Default OFF so the user sees the styles. Toggle ON to hand
              the decision back to the studio — we drop in the user-tested
              cycle for whichever mode they chose. */}
          <div
            className="mb-8 flex items-center gap-4 p-4"
            style={{
              background: stagingAiPick ? "var(--lux-ink)" : "var(--lux-cream)",
              color: stagingAiPick ? "var(--lux-bone)" : "var(--lux-ink)",
              border: "1px solid var(--lux-hairline-strong)",
            }}
          >
            <input
              id="staging-ai-pick"
              type="checkbox"
              checked={stagingAiPick}
              onChange={(e) => setStagingAiPick(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--lux-rust)" }}
            />
            <label htmlFor="staging-ai-pick" className="flex-1 cursor-pointer">
              <div className="lux-display text-base mb-0.5">Let the studio pick for me</div>
              <div className="text-xs" style={{ opacity: 0.7, lineHeight: 1.5 }}>
                We use our tested-defaults — <em>{AI_PICKED_STAGING_STYLES[stagingMode].map((s) => STAGING_STYLES.find((x) => x.id === s)?.label).filter(Boolean).join(" → ")}</em> — which consistently look best for residential listings.
              </div>
            </label>
          </div>

          {/* ── STYLE GRID ──
              Disabled-look when AI-pick is on. In single mode it's a radio
              pick; in cycle/cycle_return it's multi-select capped at 3. */}
          <div className={stagingAiPick ? "opacity-40 pointer-events-none" : ""}>
            <div className="lux-eyebrow mb-3 flex items-center justify-between" style={{ color: "var(--lux-brass)", fontWeight: 700 }}>
              <span>
                ✦ PICK {stagingMode === "single" ? "A STYLE" : `UP TO 3 STYLES`}
              </span>
              {stagingMode !== "single" && (
                <span style={{ color: "var(--lux-ink)", opacity: 0.55, fontSize: 11 }}>
                  {stagingStyles.length} / 3 selected
                </span>
              )}
            </div>
            <div
              className="grid gap-3 mb-12"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
            >
              {STAGING_STYLES.map((style) => {
                const isSingle = stagingMode === "single";
                const isSelected = isSingle
                  ? stagingStyles[0] === style.id
                  : stagingStyles.includes(style.id);
                const order = stagingStyles.indexOf(style.id);
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => {
                      if (isSingle) {
                        setStagingStyles([style.id]);
                        setStagingStyle(style.id);
                      } else {
                        // Toggle for multi-style; cap at 3; preserve pick order.
                        if (isSelected) {
                          const next = stagingStyles.filter((s) => s !== style.id);
                          setStagingStyles(next.length ? next : [style.id]);
                        } else if (stagingStyles.length < 3) {
                          setStagingStyles([...stagingStyles, style.id]);
                        }
                      }
                    }}
                    className="relative text-left p-5 rounded-none border transition-all"
                    style={isSelected ? {
                      backgroundColor: "#0E0E0C",
                      borderColor: "#0E0E0C",
                      color: "#F4EFE6",
                    } : {
                      backgroundColor: "#F4EFE6",
                      borderColor: "var(--lux-hairline)",
                      color: "#0E0E0C",
                    }}
                  >
                    {!isSingle && isSelected && (
                      <span
                        className="absolute top-2 right-2 lux-display-italic"
                        style={{
                          color: "var(--lux-champagne)",
                          fontSize: 18,
                          lineHeight: 1,
                        }}
                      >
                        {order + 1}
                      </span>
                    )}
                    <h3 className="lux-display text-lg mb-1 pr-6">{style.label}</h3>
                    <p className="lux-prose text-sm" style={{
                      color: isSelected ? "#A39E94" : "#6B6760",
                      lineHeight: 1.5,
                    }}>
                      {style.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── PROMPT PREVIEW ──
              Shows the user exactly what the studio will tell Seedance.
              Builds confidence the picks line up with the output. */}
          <div className="mb-8 p-5" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
            <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-rust)" }}>
              ✦ YOUR FILM'S DIRECTION
            </div>
            <p className="lux-prose text-sm" style={{ lineHeight: 1.65 }}>
              {(() => {
                const picks = stagingAiPick ? AI_PICKED_STAGING_STYLES[stagingMode] : stagingStyles;
                const labels = picks.map((id) => STAGING_STYLES.find((x) => x.id === id)?.promptKeyword).filter(Boolean) as string[];
                const room = stagingRoomType;
                const replaceClause = stagingIsEmpty ? "" : "Existing furniture is fully replaced. ";
                if (stagingMode === "single") {
                  return `${replaceClause}Redesign the ${room} into a ${labels[0] || "luxury minimalist"} style, keeping the layout and the room intact. Only the furniture and decor change.`;
                }
                if (stagingMode === "cycle") {
                  return `${replaceClause}Redesign the ${room} — ${labels.join(" → ")} — keeping the layout and the room intact. Furniture spins to change between each style. Smooth transitions.`;
                }
                return `${replaceClause}Begin with the original ${room}, then redesign — ${labels.join(" → ")} — then return to the original. The layout stays intact; only furniture and decor change.`;
              })()}
            </p>
          </div>

          {anyPhotoUploading && (
            <div
              className="mb-4 p-3 lux-eyebrow flex items-center gap-3"
              style={{
                background: "var(--lux-cream)",
                border: "1px solid var(--lux-hairline-strong)",
                color: "var(--lux-ink)",
                fontSize: "0.7rem",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid var(--lux-hairline-strong)",
                  borderTopColor: "var(--lux-rust)",
                  borderRadius: "50%",
                  animation: "lux-spin 0.9s linear infinite",
                }}
              />
              UPLOADING YOUR PHOTO · ONE MOMENT
            </div>
          )}
          <button
            onClick={() => setStep(3)}
            className="lux-btn w-full"
            style={{
              background: (anyPhotoUploading || anyPhotoFailed) ? "var(--lux-ash)" : "var(--lux-ink)",
              color: "var(--lux-bone)",
              padding: "18px 24px",
              cursor: (anyPhotoUploading || anyPhotoFailed) ? "not-allowed" : "pointer",
            }}
            disabled={anyPhotoUploading || anyPhotoFailed || (!stagingAiPick && stagingStyles.length === 0)}
          >
            {anyPhotoUploading ? "Uploading your photo…" : "Continue to Details →"}
          </button>
        </div>
      </div>
    );
  }

  // STEP 2d: Done-For-You Reel — style preset picker (4 looks).
  // Fires when category is done_for_you_reel AND photos are uploaded.
  if (step === 2 && category === "done_for_you_reel" && photos.length >= 3) {
    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-3xl lg:max-w-5xl">
          {/* ── DISCOVERABILITY: surface the other 6 films ──
              Top-level CTAs deep-link straight into Done-For-You Reel, which
              hid the other 6 categories behind a vague "← Back" label. This
              banner replaces that with a clear invitation to browse the full
              menu so users know the breadth of the product. */}
          <button
            onClick={() => setStep(1)}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2.5 border transition-colors"
            style={{
              color: "var(--lux-ink)",
              background: "var(--lux-cream)",
              borderColor: "var(--lux-hairline-strong)",
              cursor: "pointer",
              fontSize: "0.78rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontFamily: "var(--lux-display-font, inherit)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lux-ink)"; e.currentTarget.style.color = "var(--lux-bone)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--lux-cream)"; e.currentTarget.style.color = "var(--lux-ink)"; }}
          >
            ← Browse all 5 films
          </button>
          <div className="mb-10">
            <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-rust)" }}>
              DONE-FOR-YOU · STEP 2 OF 3
            </div>
            <h2 className="lux-display mb-3" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Pick your <span className="lux-display-italic">style</span>
            </h2>
            <p className="lux-prose" style={{ color: "var(--lux-ink)", maxWidth: 620 }}>
              We'll auto-stitch your 6 clips into one finished MP4 with this overlay treatment baked in. Pick the look that matches the listing.
            </p>
          </div>

          {/* ── PHOTO PREVIEW (May 13, 2026) ──
              Show the user's uploaded photos in their playback order so they
              can verify the sequence before generation. The same numbered-
              thumbnail pattern as the listing flow's upload step — order
              matters because each photo gets a distinct camera move from the
              chosen style's rotation. Compact 3-row variant since this view
              is shared with the style picker below. */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <p className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
                {photos.length} PHOTOS · ORDER MATTERS
              </p>
              <button
                onClick={() => setStep(2)}
                className="lux-eyebrow"
                style={{
                  color: "var(--lux-ash)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  letterSpacing: "0.16em",
                }}
                title="Go back and re-arrange"
              >
                EDIT PHOTOS →
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {photos.map((photo, i) => (
                <div
                  key={i}
                  className="relative"
                  style={{ aspectRatio: "1 / 1" }}
                  title={photo.file?.name || `photo-${i + 1}`}
                >
                  <img
                    src={photo.preview}
                    alt={`Photo ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ border: "1px solid var(--lux-hairline)" }}
                  />
                  {/* Per-photo upload spinner overlay — visible while
                      this photo is being uploaded to storage. */}
                  {photo.uploading && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center text-center"
                      style={{ background: "rgba(14,14,12,0.7)", color: "var(--lux-bone)" }}
                    >
                      <div
                        className="lux-spinner mb-1"
                        style={{
                          width: 22,
                          height: 22,
                          border: "2px solid rgba(244,239,230,0.25)",
                          borderTopColor: "var(--lux-champagne)",
                          borderRadius: "50%",
                          animation: "lux-spin 0.9s linear infinite",
                        }}
                      />
                      <span className="lux-eyebrow" style={{ fontSize: "0.55rem", letterSpacing: "0.18em" }}>
                        UPLOADING
                      </span>
                    </div>
                  )}
                  {photo.uploadError && (
                    <div
                      className="absolute inset-0 flex items-center justify-center text-center p-2"
                      style={{ background: "rgba(168,93,58,0.85)", color: "var(--lux-bone)" }}
                      title={photo.uploadError}
                    >
                      <span className="lux-eyebrow" style={{ fontSize: "0.55rem", letterSpacing: "0.18em" }}>
                        UPLOAD FAILED
                      </span>
                    </div>
                  )}
                  <div
                    className="absolute top-1 left-1 lux-display flex items-center justify-center"
                    style={{
                      width: 22,
                      height: 22,
                      background: "var(--lux-ink)",
                      color: "var(--lux-bone)",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                    }}
                  >
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── EDIT STYLE PICKER (May 24, 2026) ──
              Four user-tested styles from /1a. Each card shows a real
              autoplay preview of that edit style's Seedance output so
              users can see what they're choosing — no guessing from copy
              alone. */}
          <div
            className="grid gap-5 mb-10"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
          >
            {DFY_STYLES.map((s) => {
              const isSelected = dfyStyle === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setDfyStyle(s.id);
                    // Keep the legacy stitchStyle in sync — used by gallery
                    // metadata + record_listing_video persistence.
                    if (s.id === "snappy" || s.id === "luxuryminimal") {
                      setStitchStyle(s.id === "snappy" ? "snappy" : "minimal");
                    } else if (s.id === "fastcuts") {
                      setStitchStyle("editorial");
                    } else {
                      setStitchStyle("cinema");
                    }
                  }}
                  className="text-left rounded-none transition-all relative overflow-hidden flex flex-col"
                  style={isSelected ? {
                    background: "var(--lux-ink)",
                    color: "var(--lux-bone)",
                    border: "1px solid var(--lux-ink)",
                    boxShadow: "0 14px 40px rgba(14,14,12,0.18)",
                  } : {
                    background: "var(--lux-cream)",
                    color: "var(--lux-ink)",
                    border: "1px solid var(--lux-hairline-strong)",
                  }}
                >
                  {isSelected && (
                    <div
                      className="lux-eyebrow absolute top-2 left-2 z-10 px-2.5 py-1"
                      style={{
                        background: "var(--lux-champagne)",
                        color: "var(--lux-ink)",
                        fontSize: "0.6rem",
                        letterSpacing: "0.18em",
                      }}
                    >
                      ✦ SELECTED
                    </div>
                  )}
                  {/* Preview video — autoplays muted on hover and loops always */}
                  <div
                    className="relative w-full"
                    style={{ aspectRatio: "9 / 16", maxHeight: 240, background: "#0E0E0C", overflow: "hidden" }}
                  >
                    <video
                      src={s.previewVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 flex-1">
                    <div
                      className="lux-eyebrow mb-2"
                      style={{ color: isSelected ? "var(--lux-champagne)" : "var(--lux-rust)", fontSize: "0.65rem" }}
                    >
                      {s.id.replace("_", " ").toUpperCase()}
                    </div>
                    <h3
                      className="lux-display mb-2"
                      style={{ fontSize: "1.5rem", lineHeight: 1.05, color: isSelected ? "var(--lux-bone)" : "var(--lux-ink)" }}
                    >
                      {s.title}
                    </h3>
                    <p
                      className="lux-prose"
                      style={{
                        fontSize: "0.85rem",
                        lineHeight: 1.5,
                        color: isSelected ? "rgba(244,239,230,0.85)" : "var(--lux-ink)",
                      }}
                    >
                      {s.description}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* ── THE STUDIO — locked premium card ── */}
            <button
              type="button"
              onClick={() => {
                if (studioUnlocked) {
                  setDfyMode("studio");
                } else {
                  setShowStudioUnlock((s) => !s);
                }
              }}
              className="text-left rounded-none transition-all relative overflow-hidden flex flex-col"
              style={dfyMode === "studio" ? {
                background: "var(--lux-ink)", color: "var(--lux-bone)",
                border: "1px solid var(--lux-champagne)", boxShadow: "0 14px 40px rgba(14,14,12,0.18)",
              } : {
                background: "var(--lux-cream)", color: "var(--lux-ink)",
                border: "1px dashed var(--lux-hairline-strong)",
              }}
            >
              <div className="relative w-full flex items-center justify-center" style={{ aspectRatio: "9 / 16", maxHeight: 240, background: "#0E0E0C" }}>
                <div className="text-center px-4" style={{ color: "var(--lux-bone)" }}>
                  <div style={{ fontSize: 30, lineHeight: 1 }}>{studioUnlocked ? "✦" : "🔒"}</div>
                  <div className="lux-eyebrow mt-3" style={{ color: "var(--lux-champagne)" }}>THE STUDIO</div>
                  <div className="lux-prose mt-2" style={{ fontSize: "0.7rem", color: "rgba(244,239,230,0.7)" }}>
                    {studioUnlocked ? "Unlocked" : "Locked · enter code"}
                  </div>
                </div>
              </div>
              <div className="p-5 flex-1">
                <div className="lux-eyebrow mb-2" style={{ color: dfyMode === "studio" ? "var(--lux-champagne)" : "var(--lux-rust)", fontSize: "0.65rem" }}>
                  PRECISION MODE · +30 CR
                </div>
                <h3 className="lux-display mb-2" style={{ fontSize: "1.5rem", lineHeight: 1.05, color: dfyMode === "studio" ? "var(--lux-bone)" : "var(--lux-ink)" }}>
                  The Studio
                </h3>
                <p className="lux-prose" style={{ fontSize: "0.85rem", lineHeight: 1.5, color: dfyMode === "studio" ? "rgba(244,239,230,0.85)" : "var(--lux-ink)" }}>
                  Label every shot, choose a move per photo — camera, staging, or sun-to-dusk — and direct the whole reel, shot by shot.
                </p>
              </div>
            </button>
          </div>

          {/* Studio unlock input */}
          {!studioUnlocked && showStudioUnlock && (
            <div className="mb-8 p-4 flex flex-wrap items-center gap-3" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline-strong)", borderLeft: "2px solid var(--lux-rust)" }}>
              <span className="lux-eyebrow" style={{ color: "var(--lux-rust)" }}>✦ UNLOCK THE STUDIO</span>
              <input
                type="text"
                value={studioCodeInput}
                onChange={(e) => setStudioCodeInput(e.target.value)}
                placeholder="Enter code"
                className="flex-1 min-w-[160px] px-4 py-2.5 lux-prose"
                style={{ border: "1px solid var(--lux-hairline-strong)", background: "var(--lux-bone)", letterSpacing: "0.12em" }}
              />
              <button
                type="button"
                onClick={() => {
                  if (studioCodeInput.trim().toLowerCase() === "vantage") {
                    localStorage.setItem("studio_unlocked", "1");
                    setStudioUnlocked(true);
                    setDfyMode("studio");
                    setShowStudioUnlock(false);
                    toast.success("The Studio unlocked.");
                  } else {
                    toast.error("That code isn't valid.");
                  }
                }}
                className="lux-btn"
                style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "10px 18px" }}
              >
                UNLOCK
              </button>
            </div>
          )}

          {/* ── THE STUDIO — per-shot editor ── */}
          {dfyMode === "studio" && studioUnlocked && (
            <div className="mb-10">
              <div className="mb-5">
                <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-rust)" }}>✦ DIRECT EACH SHOT</div>
                <p className="lux-prose" style={{ fontSize: "0.9rem" }}>
                  Label each photo and pick what happens in that shot. Order top-to-bottom is the order in your reel. Everything renders together in one pass.
                </p>
              </div>

              <div className="space-y-3">
                {photos.map((photo, i) => {
                  const shot = getStudioShot(i);
                  return (
                    <div key={i} className="flex flex-col sm:flex-row gap-4 p-4" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
                      <div className="flex items-start gap-3 sm:w-48 flex-shrink-0">
                        <span className="lux-display-italic" style={{ color: "var(--lux-rust)", fontSize: 20, lineHeight: 1 }}>{i + 1}</span>
                        <img src={photo.preview} alt={`Shot ${i + 1}`} style={{ width: 64, height: 64, objectFit: "cover", border: "1px solid var(--lux-hairline)" }} />
                      </div>
                      <div className="flex-1 space-y-2.5">
                        <input
                          type="text"
                          value={shot.label}
                          onChange={(e) => setStudioShot(i, { label: e.target.value })}
                          placeholder="Label this shot — e.g. Kitchen, Master Bedroom, Backyard"
                          className="w-full px-3 py-2 lux-prose"
                          style={{ border: "1px solid var(--lux-hairline-strong)", background: "var(--lux-bone)", fontSize: "0.9rem" }}
                        />
                        <div className="flex flex-wrap gap-2">
                          {([
                            { id: "camera", label: "Camera move" },
                            { id: "staging", label: "Virtual staging" },
                            { id: "sun", label: "Sun → dusk" },
                          ] as { id: StudioAction; label: string }[]).map((a) => {
                            const on = shot.action === a.id;
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => setStudioShot(i, { action: a.id })}
                                className="lux-eyebrow px-3 py-2"
                                style={{
                                  background: on ? "var(--lux-ink)" : "var(--lux-bone)",
                                  color: on ? "var(--lux-bone)" : "var(--lux-ink)",
                                  border: "1px solid var(--lux-hairline-strong)",
                                  fontSize: "0.6rem",
                                }}
                              >
                                {a.label}
                              </button>
                            );
                          })}
                          {shot.action === "staging" && (
                            <select
                              value={shot.stagingStyle}
                              onChange={(e) => setStudioShot(i, { stagingStyle: e.target.value as StagingStyle })}
                              className="lux-prose px-2 py-1"
                              style={{ border: "1px solid var(--lux-hairline-strong)", background: "var(--lux-bone)", fontSize: "0.8rem", appearance: "auto" }}
                            >
                              {STAGING_STYLES.map((st) => (
                                <option key={st.id} value={st.id}>{st.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <input
                          type="text"
                          value={shot.caption}
                          onChange={(e) => setStudioShot(i, { caption: e.target.value })}
                          placeholder="Optional: a sentence of direction for this shot"
                          className="w-full px-3 py-2 lux-prose"
                          style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)", fontSize: "0.85rem" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overall direction / style reference */}
              <div className="mt-4">
                <label className="lux-eyebrow block mb-2" style={{ color: "var(--lux-brass)" }}>OVERALL DIRECTION <span style={{ opacity: 0.55 }}>· OPTIONAL</span></label>
                <textarea
                  value={studioDirection}
                  onChange={(e) => setStudioDirection(e.target.value)}
                  rows={2}
                  placeholder="Set the tone for the whole reel — e.g. 'warm, editorial, unhurried; golden-hour grade throughout'."
                  className="w-full px-4 py-3 lux-prose"
                  style={{ border: "1px solid var(--lux-hairline-strong)", background: "var(--lux-bone)", fontFamily: "Inter, sans-serif", fontSize: "0.9rem" }}
                />
              </div>

              <button
                type="button"
                onClick={() => setDfyMode("quick")}
                className="lux-eyebrow mt-4"
                style={{ color: "var(--lux-ash)" }}
              >
                ← Use a quick edit style instead
              </button>
            </div>
          )}

          {/* ── AUDIO TOGGLE ──
              Default ON per user direction. Seedance 2.0 generates audio
              natively. Users who want silent reels (so they can pair with
              their own track in their editor) opt out here. */}
          <div
            className="flex items-center gap-4 p-4 mb-10"
            style={{
              background: includeAudio ? "var(--lux-ink)" : "var(--lux-cream)",
              color: includeAudio ? "var(--lux-bone)" : "var(--lux-ink)",
              border: "1px solid var(--lux-hairline-strong)",
            }}
          >
            <input
              id="dfy-audio"
              type="checkbox"
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--lux-rust)" }}
            />
            <label htmlFor="dfy-audio" className="flex-1 cursor-pointer">
              <div className="lux-display text-base mb-0.5">
                {includeAudio ? "♫ Audio included" : "Silent reel"}
              </div>
              <div className="text-xs" style={{ opacity: 0.75, lineHeight: 1.5 }}>
                {includeAudio
                  ? "Seedance generates a music bed sized to the reel. Uncheck if you want a silent file to drop into your editor."
                  : "We'll deliver a silent reel — add your own track in Reels, TikTok, or your editor."}
              </div>
            </label>
          </div>

          {/* Per-button upload status — disables Continue while any photo
              is still uploading so users can't push forward into a state
              that would 400 the generation request. */}
          {anyPhotoUploading && (
            <div
              className="mb-4 p-3 lux-eyebrow flex items-center gap-3"
              style={{
                background: "var(--lux-cream)",
                border: "1px solid var(--lux-hairline-strong)",
                color: "var(--lux-ink)",
                fontSize: "0.7rem",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid var(--lux-hairline-strong)",
                  borderTopColor: "var(--lux-rust)",
                  borderRadius: "50%",
                  animation: "lux-spin 0.9s linear infinite",
                }}
              />
              UPLOADING PHOTOS · ONE MOMENT
            </div>
          )}
          <button
            onClick={() => setStep(3)}
            disabled={anyPhotoUploading || anyPhotoFailed}
            className="lux-btn w-full"
            style={{
              background: anyPhotoUploading || anyPhotoFailed ? "var(--lux-ash)" : "var(--lux-ink)",
              color: "var(--lux-bone)",
              padding: "18px 24px",
              cursor: anyPhotoUploading || anyPhotoFailed ? "not-allowed" : "pointer",
            }}
          >
            {anyPhotoUploading ? "Uploading photos…" : "Continue to Listing Details →"}
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: Photo upload
  if (step === 2 && category) {
    const maxPhotos = (category === "done_for_you_reel") ? 6 : 1;
    const minPhotos = (category === "done_for_you_reel") ? 3 : 1;
    const isComplete = photos.length >= minPhotos;

    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-2xl lg:max-w-4xl">
          {/* ── DISCOVERABILITY: surface the other 6 films ──
              Top-level CTAs deep-link straight into Done-For-You Reel, which
              hid the other 6 categories behind a vague "← Back" label. This
              banner replaces that with a clear invitation to browse the full
              menu so users know the breadth of the product. */}
          <button
            onClick={() => setStep(1)}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2.5 border transition-colors"
            style={{
              color: "var(--lux-ink)",
              background: "var(--lux-cream)",
              borderColor: "var(--lux-hairline-strong)",
              cursor: "pointer",
              fontSize: "0.78rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontFamily: "var(--lux-display-font, inherit)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lux-ink)"; e.currentTarget.style.color = "var(--lux-bone)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--lux-cream)"; e.currentTarget.style.color = "var(--lux-ink)"; }}
          >
            ← Browse all 5 films
          </button>

          <div className="mb-12">
            <h2 className="lux-display mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              {category === "animate_single" && "Upload your hero shot"}
              {category === "sun_to_sun" && "Upload exterior photo"}
              {(category === "done_for_you_reel") && "Upload 3-6 property photos"}
              {category === "sketch_to_real" && "Upload the property photo"}
            </h2>
            <p className="lux-prose" style={{ color: "var(--lux-ash)" }}>
              {category === "animate_single" && "High-res horizontal or vertical photos work best."}
              {category === "sun_to_sun" && "A bright daytime exterior. We'll render it at sunrise, golden hour, and dusk."}
              {(category === "done_for_you_reel") && "Mix of exterior, interior, and detail shots works best. Start with your strongest exterior, end with your statement room."}
              {category === "sketch_to_real" && "Upload the actual property photo (interior or exterior). We'll render a pencil sketch of the same scene being hand-drawn on a desk, then animate the sketch becoming real. Best with sharp, well-lit photos."}
            </p>
          </div>

          {/* ── DFY upload-order notice (May 25, 2026) ──
              Per user direction: make "upload order = reel order" impossible
              to miss. Bold callout above the drop zone — ink background,
              champagne accent, large. Users were missing this before because
              it was buried in regular paragraph copy. */}
          {category === "done_for_you_reel" && (
            <div
              className="mb-6 p-5 lux-bg-ink lux-grain"
              style={{ color: "var(--lux-bone)", border: "1px solid var(--lux-ink)" }}
            >
              <div
                className="lux-eyebrow mb-2"
                style={{ color: "var(--lux-champagne)", fontWeight: 700 }}
              >
                ✦ IMPORTANT · READ BEFORE UPLOADING
              </div>
              <p className="lux-display" style={{ fontSize: "clamp(1.1rem, 2.2vw, 1.5rem)", lineHeight: 1.25, color: "var(--lux-bone)" }}>
                The order you upload your photos
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>
                  is the order they appear in your reel.
                </span>
              </p>
              <p className="text-sm mt-3" style={{ color: "rgba(244,239,230,0.78)", lineHeight: 1.55 }}>
                Pick your photos one at a time in the order you want them to play — first photo plays first. You can also drag-and-drop them in batches; the file-system order is preserved.
              </p>
            </div>
          )}

          <div
            className="border border-dashed p-16 text-center cursor-pointer transition rounded-sm"
            style={{
              borderColor: "var(--lux-hairline-strong)",
              background: "var(--lux-parchment)",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--lux-ink)";
              e.currentTarget.style.background = "rgba(14, 14, 12, 0.02)";
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--lux-hairline-strong)";
              e.currentTarget.style.background = "var(--lux-parchment)";
            }}
            onDrop={(e) => {
              e.preventDefault();
              handlePhotoSelect(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-6" style={{ color: "var(--lux-brass)" }} />
            <p className="lux-prose mb-3 font-semibold" style={{ color: "var(--lux-ink)" }}>Drag photos here or click to select</p>
            <p style={{ color: "var(--lux-ink)", fontSize: "0.875rem" }}>
              JPEG, PNG, or HEIC (iPhone) · Max 50MB · {maxPhotos === 1 ? "1 photo" : `${minPhotos}-${maxPhotos} photos`}
            </p>
            <p className="mt-2" style={{ color: "var(--lux-rust)", fontSize: "0.75rem" }}>
              WebP not supported — our video models reject it. We auto-convert if you drop one.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple={(category === "done_for_you_reel")}
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
            onChange={(e) => handlePhotoSelect(e.target.files)}
            className="hidden"
          />

          {photos.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-6">
                <p className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
                  {photos.length} PHOTO{photos.length !== 1 ? "S" : ""} SELECTED
                  {(category === "done_for_you_reel") && " · ORDER MATTERS"}
                </p>
                {photos.length > 1 && (
                  <button
                    onClick={() => setPhotos([])}
                    className="lux-eyebrow"
                    style={{
                      color: "var(--lux-rust)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.7rem",
                    }}
                  >
                    CLEAR ALL ×
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photos.map((photo, i) => (
                  <div key={i} className="relative" style={{ aspectRatio: "1 / 1" }}>
                    <img
                      src={photo.preview}
                      alt={`Photo ${i + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ border: "1px solid var(--lux-hairline)" }}
                    />
                    {/* Per-photo upload spinner overlay — visible until the
                        photo's signed URL comes back from storage. */}
                    {photo.uploading && (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center text-center"
                        style={{ background: "rgba(14,14,12,0.7)", color: "var(--lux-bone)" }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            border: "3px solid rgba(244,239,230,0.25)",
                            borderTopColor: "var(--lux-champagne)",
                            borderRadius: "50%",
                            animation: "lux-spin 0.9s linear infinite",
                            marginBottom: 6,
                          }}
                        />
                        <span className="lux-eyebrow" style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}>
                          UPLOADING
                        </span>
                      </div>
                    )}
                    {photo.uploadError && (
                      <div
                        className="absolute inset-0 flex items-center justify-center text-center p-2"
                        style={{ background: "rgba(168,93,58,0.85)", color: "var(--lux-bone)" }}
                        title={photo.uploadError}
                      >
                        <span className="lux-eyebrow" style={{ fontSize: "0.65rem", letterSpacing: "0.18em" }}>
                          UPLOAD FAILED · TAP X TO REMOVE
                        </span>
                      </div>
                    )}
                    {/* Always-visible playback-order number — users need to
                        SEE the order their photos will play in. Previously
                        hidden, which made photographers re-upload in the
                        wrong order. */}
                    {(category === "done_for_you_reel") && (
                      <div
                        className="absolute top-2 left-2 lux-display flex items-center justify-center"
                        style={{
                          width: 28,
                          height: 28,
                          background: "var(--lux-ink)",
                          color: "var(--lux-bone)",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        {i + 1}
                      </div>
                    )}
                    {/* Always-visible delete X. The previous version hid
                        the X until hover, which made mobile users (no
                        hover state) unable to remove photos. */}
                    <button
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute top-2 right-2 flex items-center justify-center transition-transform hover:scale-110"
                      style={{
                        width: 28,
                        height: 28,
                        background: "var(--lux-ink)",
                        color: "var(--lux-bone)",
                        border: "1px solid var(--lux-bone)",
                        cursor: "pointer",
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {/* Room label picker — tag each photo so the reel/staging
                        prompt can name the space (better Seedance consistency). */}
                    <select
                      value={photo.roomLabel || ""}
                      onChange={(e) =>
                        setPhotos(photos.map((p, j) => (j === i ? { ...p, roomLabel: e.target.value } : p)))
                      }
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Label the room in photo ${i + 1}`}
                      className="absolute bottom-0 left-0 right-0 lux-eyebrow"
                      style={{
                        background: photo.roomLabel ? "var(--lux-rust)" : "rgba(14,14,12,0.72)",
                        color: "var(--lux-bone)",
                        fontSize: "0.6rem",
                        letterSpacing: "0.06em",
                        fontWeight: 600,
                        border: "none",
                        padding: "6px 8px",
                        cursor: "pointer",
                        width: "100%",
                        appearance: "auto",
                      }}
                    >
                      <option value="" style={{ color: "#111" }}>+ Label room…</option>
                      {ROOM_LABELS.map((r) => (
                        <option key={r} value={r} style={{ color: "#111" }}>{r}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isComplete && (
            <button
              onClick={() => setStep(3)}
              className="lux-btn mt-12 w-full"
              style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "18px 24px" }}
            >
              Continue to Details →
            </button>
          )}
        </div>
      </div>
    );
  }

  // STEP 3: Listing details form / vibe picker
  if (step === 3 && category) {
    const showListingMetadata = category === "animate_single" || category === "sun_to_sun" || (category === "done_for_you_reel");
    const showShotPicker = category === "animate_single";
    const showEffectPicker = category === "animate_single" || category === "sun_to_sun" || (category === "done_for_you_reel");
    const showVibePicker = true;

    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-2xl lg:max-w-4xl">
          <button
            onClick={() => setStep(2)}
            className="lux-eyebrow mb-8"
            style={{ color: "var(--lux-ash)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Back
          </button>

          <div className="mb-8">
            <h2 className="lux-display mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Finishing touches
              <span
                className="lux-eyebrow ml-3 align-middle"
                style={{
                  color: "var(--lux-brass)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.2em",
                }}
              >
                ALL OPTIONAL
              </span>
            </h2>
            <p className="lux-prose" style={{ color: "var(--lux-ash)" }}>
              {category === "virtual_staging"
                ? "These details help style the scene — but you can skip them all and just generate."
                : "Add an optional caption, or check the box below if you're a real estate agent to burn in property details. Everything here is optional — you can generate right now."}
            </p>
          </div>

          {/* ── SKIP-AND-GENERATE ──
              Users have profiles. They shouldn't be forced to retype their
              name + brokerage + address on every reel. This CTA lets them
              jump straight to generation, useful for fast iteration during
              testing or when the listing is still in pre-launch and they
              just want to see what the camera move looks like. */}
          {showListingMetadata && (
            <div
              className="mb-10 p-5 flex items-center justify-between gap-4"
              style={{
                background: "var(--lux-cream)",
                border: "1px solid var(--lux-hairline-strong)",
              }}
            >
              <div>
                <p
                  className="lux-eyebrow mb-1"
                  style={{ color: "var(--lux-brass)", fontSize: "0.65rem" }}
                >
                  IN A HURRY?
                </p>
                <p className="lux-prose" style={{ color: "var(--lux-ink)", fontSize: "0.9rem" }}>
                  Skip the details — generate the video with no overlay text.
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!hasEnoughCredits || isGenerating}
                className="lux-eyebrow whitespace-nowrap"
                style={{
                  background: "var(--lux-ink)",
                  color: "var(--lux-bone)",
                  padding: "12px 18px",
                  border: "1px solid var(--lux-ink)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.18em",
                  cursor: !hasEnoughCredits || isGenerating ? "not-allowed" : "pointer",
                  opacity: !hasEnoughCredits || isGenerating ? 0.5 : 1,
                }}
              >
                SKIP & GENERATE →
              </button>
            </div>
          )}

          <div className="space-y-8">
            {showListingMetadata && (
              <>
                {/* ── Real-estate toggle ── (June 6, 2026)
                    The product is general-purpose. We only ask property
                    questions when the user says they're a real estate agent. */}
                <label
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  style={{
                    background: isRealEstateAgent ? "var(--lux-ink)" : "var(--lux-cream)",
                    color: isRealEstateAgent ? "var(--lux-bone)" : "var(--lux-ink)",
                    border: "1px solid var(--lux-hairline-strong)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isRealEstateAgent}
                    onChange={(e) => setIsRealEstateAgent(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "var(--lux-rust)" }}
                  />
                  <span className="flex-1">
                    <span className="lux-display text-base block">I'm a real estate agent</span>
                    <span className="text-xs" style={{ opacity: 0.7 }}>
                      Adds optional property details (address, price, agent name) burned into the video. Leave off for general videos.
                    </span>
                  </span>
                </label>

                {isRealEstateAgent && (
                <>
                {/* Property type */}
                <div>
                  <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-brass)" }}>
                    PROPERTY TYPE <span style={{ opacity: 0.55 }}>· OPTIONAL</span>
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full px-5 py-4 lux-prose"
                    style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)", appearance: "auto" }}
                  >
                    <option value="">Select (optional)…</option>
                    {["Single-family home","Condo","Townhouse","Luxury estate","Apartment","Multi-family","New construction","Land / lot","Commercial","Vacation rental"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Realtor Name — pre-filled from profile.full_name */}
                <div>
                  <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-brass)" }}>
                    REALTOR / AGENT NAME <span style={{ opacity: 0.55 }}>· OPTIONAL · FROM YOUR PROFILE</span>
                  </label>
                  <input
                    type="text"
                    value={realtorName}
                    onChange={(e) => setRealtorName(e.target.value)}
                    placeholder="Maya Atwood, The Atwood Group"
                    className="w-full px-5 py-4 lux-prose"
                    style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-brass)" }}>
                    LOCATION <span style={{ opacity: 0.55 }}>· OPTIONAL</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Beacon Hill · Boston"
                    className="w-full px-5 py-4 lux-prose"
                    style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
                  />
                </div>

                {/* Price Toggle */}
                <div className="flex items-center justify-between">
                  <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
                    SHOW PRICING?
                  </label>
                  <button
                    onClick={() => setShowPrice(!showPrice)}
                    className="lux-btn-ghost px-4 py-2"
                    style={{ fontSize: "0.875rem" }}
                  >
                    {showPrice ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Price Input */}
                {showPrice && (
                  <div>
                    <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-brass)" }}>
                      LISTING PRICE <span style={{ opacity: 0.55 }}>· OPTIONAL</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span style={{ color: "var(--lux-ink)" }} className="lux-prose font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        value={price || ""}
                        onChange={(e) => setPrice(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="1250000"
                        className="flex-1 px-5 py-4 lux-prose"
                        style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
                      />
                    </div>
                  </div>
                )}

                {/* Brokerage */}
                <div>
                  <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-brass)" }}>
                    BROKERAGE <span style={{ opacity: 0.55 }}>· OPTIONAL</span>
                  </label>
                  <input
                    type="text"
                    value={brokerage}
                    onChange={(e) => setBrokerage(e.target.value)}
                    placeholder="Compass · Sotheby's · The Agency"
                    className="w-full px-5 py-4 lux-prose"
                    style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
                  />
                </div>
                </>
                )}

                {/* Caption */}
                <div>
                  <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-brass)" }}>
                    CAPTION <span style={{ opacity: 0.55 }}>· OPTIONAL</span>
                  </label>
                  <textarea
                    value={caption || generatedCaption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-5 py-4 lux-prose"
                    rows={3}
                    style={{ border: "1px solid var(--lux-hairline-strong)", background: "var(--lux-bone)", fontFamily: "Inter, sans-serif" }}
                    placeholder="Optional one-line caption that fades in over the reel"
                  />
                </div>

                {/* Music note — picker removed for production. Users add music
                    themselves in their editor; the music library at /music
                    is available separately. */}
                <div
                  className="p-4"
                  style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline-strong)" }}
                >
                  <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-ink)", fontWeight: 700, fontSize: "0.62rem" }}>
                    ♫ ABOUT MUSIC
                  </div>
                  <p style={{ color: "var(--lux-ink)", opacity: 0.8, fontSize: "0.85rem", lineHeight: 1.5 }}>
                    We deliver your reel silent so it stays clean and easy to drop into Reels, TikTok, or your editor. Add your own track at the end — many users pair this with a 15-second loop from Suno or their preferred royalty-free library.
                  </p>
                </div>
              </>
            )}

            {/* Shot Picker (animate_single only) */}
            {showShotPicker && (
              <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--lux-hairline)" }}>
                <h3 className="lux-eyebrow mb-4" style={{ color: "var(--lux-ink)", fontWeight: 700 }}>
                  CAMERA MOVEMENT
                </h3>
                <ShotTypePicker value={shotType} onChange={setShotType} />
              </div>
            )}

            {/* ── DURATION PICKER (single-clip categories only) ──
                Done-For-You is fixed at 15s (the duration cap on Seedance
                2.0 multi-reference reels). Single-clip categories let
                the user pick 10s vs 15s, per May 15 direction. */}
            {(category === "animate_single"
              || category === "sun_to_sun"
              || category === "virtual_staging"
              || category === "sketch_to_real"
             ) && (
              <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--lux-hairline)" }}>
                <h3 className="lux-eyebrow mb-4" style={{ color: "var(--lux-ink)", fontWeight: 700 }}>
                  DURATION
                </h3>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {(category === "animate_single"
                    ? ([5, 10] as const)
                    : ([10, 15] as const)
                  ).map((d) => {
                    const isSelected = singleClipDuration === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSingleClipDuration(d)}
                        className="p-4 border text-left transition-colors"
                        style={isSelected ? {
                          background: "var(--lux-ink)",
                          borderColor: "var(--lux-ink)",
                          color: "var(--lux-bone)",
                        } : {
                          background: "var(--lux-bone)",
                          borderColor: "var(--lux-hairline-strong)",
                          color: "var(--lux-ink)",
                        }}
                      >
                        <div
                          className="lux-display"
                          style={{ fontSize: "1.5rem", lineHeight: 1 }}
                        >
                          {d}s
                        </div>
                        <div
                          className="lux-eyebrow mt-1"
                          style={{
                            color: isSelected ? "var(--lux-champagne)" : "var(--lux-brass)",
                            fontSize: "0.62rem",
                          }}
                        >
                          {d === 10 ? "STANDARD · CINEMATIC" : "EXTENDED · FULL STORY ARC"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── BURN-IN TITLE OVERLAY ──
                Seedance 2.0 renders text directly into the video frame.
                Suppressed for:
                  • virtual_staging — the staging transformation is the subject
                  • sketch_to_real — same reason
                  • done_for_you_reel — the auto-stitch already adds an
                    address title card client-side; a burned Seedance title
                    on top would compete with that and look messy. */}
            {category !== "virtual_staging"
              && category !== "sketch_to_real"
              && category !== "done_for_you_reel" && (
              <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--lux-hairline)" }}>
                <h3 className="lux-eyebrow mb-4" style={{ color: "var(--lux-ink)", fontWeight: 700 }}>
                  TEXT OVERLAY ✨ NEW
                </h3>
                <TitleOverlayControls
                  value={titleOverlay}
                  onChange={setTitleOverlay}
                  suggestedText={
                    location.trim()
                      ? location.trim()
                      : realtorName.trim()
                        ? realtorName.trim()
                        : undefined
                  }
                />
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-12">
            <button
              onClick={() => setStep(2)}
              className="lux-btn-ghost flex-1 py-4"
              style={{ padding: "16px 24px" }}
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="lux-btn flex-1"
              style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "16px 24px" }}
            >
              Review & Generate →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 4: Review + Generate
  if (step === 4 && category) {
    const photoThumbnail = photos[0]?.preview;
    const isVirtualStaging = category === "virtual_staging";
    const isSketchToReal = category === "sketch_to_real";
    const isFloorPlanPan = false; // floor_plan_pan deleted May 24, 2026

    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-4xl lg:max-w-6xl">
          <h2 className="lux-display mb-12" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Review your film
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Left: Thumbnail + metadata */}
            <div className="space-y-6">
              {photoThumbnail && (
                <div
                  className="w-full aspect-video bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${photoThumbnail})`,
                    border: "1px solid var(--lux-hairline)",
                    borderRadius: "2px",
                  }}
                />
              )}
              <div
                className="p-6"
                style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}
              >
                <div className="mb-5">
                  <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>CATEGORY</div>
                  <div className="lux-display" style={{ fontSize: "clamp(1.4rem, 3.2vw, 1.9rem)", lineHeight: 1.05 }}>
                    {CATEGORY_CARDS.find((c) => c.id === category)?.title}
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--lux-hairline)", paddingTop: "1.25rem" }}>
                  <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>PHOTOS</div>
                  <div className="lux-display" style={{ fontSize: "clamp(1.4rem, 3.2vw, 1.9rem)", lineHeight: 1.05 }}>
                    {photos.length} {photos.length === 1 ? "photo" : "photos"}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Full details */}
            <div
              className="p-8"
              style={{ background: "var(--lux-parchment)", border: "1px solid var(--lux-hairline)" }}
            >
              <div className="space-y-6">
                {!isVirtualStaging && !isSketchToReal && !isFloorPlanPan && (
                  <>
                    <div>
                      <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>REALTOR</div>
                      <p className="lux-prose break-words">{realtorName}</p>
                    </div>
                    <div>
                      <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>LOCATION</div>
                      <p className="lux-prose break-words">{location}</p>
                    </div>
                    <div>
                      <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>LISTING BADGE</div>
                      <p className="lux-prose">{EFFECT_OPTIONS[effectId]}</p>
                    </div>
                  </>
                )}
                {isVirtualStaging && (
                  <>
                    <div>
                      <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>STAGING STYLE</div>
                      <p className="lux-prose">{STAGING_STYLES.find((s) => s.id === stagingStyle)?.label}</p>
                    </div>
                    <div>
                      <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>MOOD</div>
                      <p className="lux-prose">{VIBES.find((v) => v.id === vibe)?.label}</p>
                    </div>
                  </>
                )}
                {isSketchToReal && (
                  <>
                    <div>
                      <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>INTENT</div>
                      <p className="lux-prose">{sketchIntent === "interior" ? "Interior" : "Exterior"}</p>
                    </div>
                    <div>
                      <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>MOOD</div>
                      <p className="lux-prose">{VIBES.find((v) => v.id === vibe)?.label}</p>
                    </div>
                  </>
                )}
                {isFloorPlanPan && (
                  <>
                    <div>
                      <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>CAMERA MOVEMENT</div>
                      <p className="lux-prose">{SHOT_TYPES.find((s) => s.id === shotType)?.label}</p>
                    </div>
                    <div>
                      <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>MOOD</div>
                      <p className="lux-prose">{VIBES.find((v) => v.id === vibe)?.label}</p>
                    </div>
                  </>
                )}
                <div style={{ borderTop: "1px solid var(--lux-hairline)", paddingTop: "1.25rem" }}>
                  <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>TOTAL COST</div>
                  <div className="flex items-baseline gap-2">
                    <span className="lux-display" style={{ fontSize: "2.4rem", color: "var(--lux-rust)", lineHeight: 1 }}>
                      {creditCost}
                    </span>
                    <span className="lux-prose" style={{ color: "var(--lux-ash)", fontSize: "0.95rem" }}>
                      credits
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!hasEnoughCredits && (
            <div
              className="p-4 mb-8 border-l-4"
              style={{ borderColor: "var(--lux-rust)", background: "rgba(140, 63, 46, 0.05)" }}
            >
              <p style={{ color: "var(--lux-rust)", fontSize: "0.875rem" }}>
                <strong>Insufficient credits.</strong> You have {credits} credits, need {creditCost}.
              </p>
            </div>
          )}

          {/* Listing metadata is optional now — empty fields just skip the
              corner overlays; nothing blocks generation. */}

          <div className="flex gap-4 mt-12">
            <button
              onClick={() => setStep(3)}
              className="lux-btn-ghost flex-1"
              style={{ padding: "16px 24px" }}
            >
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={!hasEnoughCredits || isGenerating}
              className="lux-btn flex-1"
              style={{
                background: (hasEnoughCredits && !isGenerating && (category === "virtual_staging" || category === "sketch_to_real" || (realtorName && location))) ? "var(--lux-ink)" : "var(--lux-ash)",
                color: "var(--lux-bone)",
                cursor: (hasEnoughCredits && !isGenerating && (category === "virtual_staging" || category === "sketch_to_real" || (realtorName && location))) ? "pointer" : "not-allowed",
                padding: "16px 24px",
              }}
            >
              {isGenerating ? (
                <Loader2 className="inline mr-2 w-4 h-4 animate-spin" />
              ) : (
                <>Generate Listing Reel →</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 5: Processing
  if (step === 5 && isGenerating) {
    return <TransformationProcessing message="Composing your listing film…" />;
  }

  // STEP 7: Result
  if (step === 7 && videoUrl) {
    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-3xl lg:max-w-5xl">
          <h2 className="lux-display mb-8" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Your listing film
          </h2>

          <div className="mb-8 aspect-[9/16] overflow-hidden relative" style={{ background: "var(--lux-ink)" }}>
            {isStitching && (
              <div className="absolute inset-0 flex items-center justify-center z-50" style={{ background: "rgba(14,14,12,0.92)" }}>
                <div className="text-center px-8" style={{ width: "100%", maxWidth: 360 }}>
                  <Loader2 className="w-9 h-9 animate-spin mx-auto mb-4" style={{ color: "var(--lux-champagne)" }} />
                  <p className="lux-eyebrow mb-3" style={{ color: "var(--lux-bone)", fontSize: "0.7rem" }}>
                    Stitching your final cut…
                  </p>
                  <div
                    style={{
                      height: 4,
                      background: "rgba(244,239,230,0.16)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.round(stitchProgress * 100)}%`,
                        height: "100%",
                        background: "var(--lux-champagne)",
                        transition: "width 200ms ease-out",
                      }}
                    />
                  </div>
                  <p className="lux-prose mt-3" style={{ color: "rgba(244,239,230,0.6)", fontSize: "0.7rem" }}>
                    {stitchProgress < 0.2
                      ? "Loading clips…"
                      : stitchProgress < 1
                      ? `Recording frame ${Math.round(stitchProgress * 100)}%`
                      : "Finalising…"}
                  </p>
                </div>
              </div>
            )}
            <video
              key={stitchedUrl || clipUrls[activeClipIndex] || videoUrl}
              src={stitchedUrl || clipUrls[activeClipIndex] || videoUrl}
              controls={clipUrls.length <= 1 || stitchedUrl !== null}
              autoPlay
              // Loop single-clip and stitched playback. Multi-clip mode uses
              // onEnded to advance between clips, so don't set the native
              // loop there or it'll never advance past clip 0.
              loop={clipUrls.length <= 1 || stitchedUrl !== null}
              muted={clipUrls.length > 1 && !stitchedUrl}
              playsInline
              onEnded={() => {
                if (!stitchedUrl && activeClipIndex < clipUrls.length - 1) {
                  setActiveClipIndex(activeClipIndex + 1);
                } else if (!stitchedUrl && clipUrls.length > 1) {
                  // Loop the reel
                  setActiveClipIndex(0);
                }
              }}
              className="w-full h-full object-cover"
            />
            {/* Listing metadata overlay (price, location, brokerage) — matches Reels-style branding */}
            {((category === "done_for_you_reel") || category === "animate_single" || category === "sun_to_sun") && (location || (showPrice && price) || brokerage) && (
              <>
                {/* Top-left location badge */}
                {location && (
                  <div
                    className="lux-eyebrow absolute top-4 left-4 px-3 py-1.5 z-10"
                    style={{
                      background: "rgba(14,14,12,0.7)",
                      color: "var(--lux-bone)",
                      backdropFilter: "blur(8px)",
                      fontSize: "0.7rem",
                    }}
                  >
                    {location}
                  </div>
                )}
                {/* Bottom price + brokerage */}
                <div className="absolute bottom-16 left-4 right-4 z-10 flex justify-between items-end gap-3">
                  {showPrice && price ? (
                    <div
                      className="lux-display"
                      style={{
                        color: "var(--lux-bone)",
                        fontSize: "clamp(1.4rem, 4vw, 2rem)",
                        textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                        lineHeight: 1,
                      }}
                    >
                      ${price.toLocaleString()}
                    </div>
                  ) : (
                    <div />
                  )}
                  {brokerage && (
                    <div
                      className="lux-eyebrow"
                      style={{
                        color: "var(--lux-bone)",
                        opacity: 0.85,
                        textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                        fontSize: "0.65rem",
                        textAlign: "right",
                      }}
                    >
                      {brokerage}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Watermark overlay — free tier: always visible. Paid: opt-in toggle. */}
            {watermarkVisible && (
              <div
                className="absolute bottom-4 right-4 lux-eyebrow z-20"
                style={{
                  color: "var(--lux-bone)",
                  opacity: 0.6,
                  background: "rgba(14,14,12,0.6)",
                  padding: "4px 8px",
                  backdropFilter: "blur(4px)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.05em",
                }}
              >
                THE VANTAGE MEDIA
              </div>
            )}
            {clipUrls.length > 1 && !stitchedUrl && (
              <>
                {/* Clip progress indicator at top */}
                <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-10">
                  {clipUrls.map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 h-0.5 transition-all"
                      style={{
                        background: i < activeClipIndex ? "var(--lux-bone)" : i === activeClipIndex ? "var(--lux-champagne)" : "rgba(244,239,230,0.3)",
                      }}
                    />
                  ))}
                </div>
                {/* Clip counter */}
                <div
                  className="lux-eyebrow absolute bottom-4 left-4 px-3 py-1.5 z-10"
                  style={{
                    background: "rgba(14,14,12,0.7)",
                    color: "var(--lux-bone)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  CLIP {activeClipIndex + 1} / {clipUrls.length}
                </div>
                {/* Manual advance buttons */}
                <button
                  onClick={() => setActiveClipIndex(Math.max(0, activeClipIndex - 1))}
                  disabled={activeClipIndex === 0}
                  className="absolute top-1/2 left-2 -translate-y-1/2 w-9 h-9 grid place-items-center z-10 disabled:opacity-30"
                  style={{ background: "rgba(14,14,12,0.6)", color: "var(--lux-bone)", backdropFilter: "blur(8px)" }}
                  aria-label="Previous clip"
                >
                  ←
                </button>
                <button
                  onClick={() => setActiveClipIndex(Math.min(clipUrls.length - 1, activeClipIndex + 1))}
                  disabled={activeClipIndex === clipUrls.length - 1}
                  className="absolute top-1/2 right-2 -translate-y-1/2 w-9 h-9 grid place-items-center z-10 disabled:opacity-30"
                  style={{ background: "rgba(14,14,12,0.6)", color: "var(--lux-bone)", backdropFilter: "blur(8px)" }}
                  aria-label="Next clip"
                >
                  →
                </button>
              </>
            )}
          </div>

          {clipUrls.length > 1 && !stitchedUrl && (
            <div className="mb-8 space-y-4 text-center">
              <div
                className="lux-eyebrow inline-flex items-center gap-2 px-3 py-2"
                style={{ color: "var(--lux-ink)", background: "var(--lux-cream)", border: "1px solid var(--lux-hairline-strong)" }}
              >
                ✦ {clipUrls.length}-CLIP REEL · {clipUrls.length * 5}s
              </div>

              {/* Step-by-step guidance — what to do next */}
              <div
                className="text-left mx-auto p-5"
                style={{
                  maxWidth: 540,
                  background: "var(--lux-cream)",
                  border: "1px solid var(--lux-hairline-strong)",
                }}
              >
                <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-rust)", fontWeight: 700, fontSize: "0.65rem" }}>
                  TO FINISH YOUR REEL — TWO STEPS
                </div>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span
                      className="lux-display"
                      style={{
                        color: "var(--lux-rust)",
                        fontSize: "1.4rem",
                        fontStyle: "italic",
                        flexShrink: 0,
                        lineHeight: 1,
                        marginTop: 2,
                      }}
                    >
                      I.
                    </span>
                    <div>
                      <p style={{ color: "var(--lux-ink)", fontSize: "0.92rem", fontWeight: 600 }}>
                        Press <span style={{ color: "var(--lux-rust)" }}>Stitch into Single MP4</span> below.
                      </p>
                      <p style={{ color: "var(--lux-ink)", opacity: 0.75, fontSize: "0.82rem", marginTop: 2 }}>
                        We'll dissolve every clip together with a smooth cinematic transition and bake your price + realtor name in.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span
                      className="lux-display"
                      style={{
                        color: "var(--lux-rust)",
                        fontSize: "1.4rem",
                        fontStyle: "italic",
                        flexShrink: 0,
                        lineHeight: 1,
                        marginTop: 2,
                      }}
                    >
                      II.
                    </span>
                    <div>
                      <p style={{ color: "var(--lux-ink)", fontSize: "0.92rem", fontWeight: 600 }}>
                        Add your music in your editor.
                      </p>
                      {musicVibe && musicVibe !== "No music (you'll add yours)" ? (
                        <p style={{ color: "var(--lux-ink)", opacity: 0.75, fontSize: "0.82rem", marginTop: 2 }}>
                          You picked <span style={{ color: "var(--lux-rust)", fontWeight: 600 }}>{musicVibe}</span>. Generate the track on Suno (the prompt was copied) then drop the WAV/MP3 onto the timeline in CapCut, Premiere, or Final Cut.
                        </p>
                      ) : (
                        <p style={{ color: "var(--lux-ink)", opacity: 0.75, fontSize: "0.82rem", marginTop: 2 }}>
                          Pick a Suno prompt from Step 3 (Music · 30 Suno Prompts), generate the track at suno.com, then drop the WAV/MP3 onto your timeline.
                        </p>
                      )}
                    </div>
                  </li>
                </ol>
              </div>

              <button
                onClick={handleStitchReel}
                disabled={isStitching}
                className="lux-btn mt-4"
                style={{
                  background: "var(--lux-ink)",
                  color: "var(--lux-bone)",
                  padding: "16px 32px",
                  fontSize: "0.75rem",
                  letterSpacing: "0.22em",
                  opacity: isStitching ? 0.6 : 1,
                }}
              >
                {isStitching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 inline-block animate-spin" />
                    STITCHING…
                  </>
                ) : (
                  "STITCH INTO SINGLE MP4 →"
                )}
              </button>
            </div>
          )}
          {stitchedUrl && (
            <div className="mb-8 text-center space-y-2">
              <div className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
                ✓ STITCHED FINAL CUT READY
              </div>
              <p className="lux-prose text-sm" style={{ color: "var(--lux-ink)" }}>
                Your clips are now a single MP4 with price and realtor name overlaid. Download your finished reel below.
              </p>
            </div>
          )}

          {!videoUrl?.includes("virtual") && (
            <div className="p-8 mb-12" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
              <p className="lux-prose">{caption || generatedCaption}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(caption || generatedCaption);
                  toast.success("Caption copied");
                }}
                className="lux-btn-ghost mt-6"
                style={{ padding: "12px 16px", fontSize: "0.875rem" }}
              >
                Copy Caption
              </button>
            </div>
          )}

          {/* Branding toggle — paid users only. Free tier gets the watermark baked in. */}
          {isPaid ? (
            <div
              className="p-5 mb-6 flex items-center justify-between gap-4"
              style={{ background: "var(--lux-parchment)", border: "1px solid var(--lux-hairline)" }}
            >
              <div>
                <div className="lux-eyebrow mb-1" style={{ color: "var(--lux-brass)" }}>VANTAGE BRANDING</div>
                <p className="lux-prose text-sm" style={{ color: "var(--lux-ink)" }}>
                  Off by default for paid plans. Toggle on if you want the "AI · The Vantage" credibility mark on this film.
                </p>
              </div>
              <button
                onClick={() => setShowBranding((v) => !v)}
                className="lux-eyebrow flex-shrink-0"
                style={{
                  padding: "10px 16px",
                  background: showBranding ? "var(--lux-ink)" : "var(--lux-bone)",
                  color: showBranding ? "var(--lux-bone)" : "var(--lux-ink)",
                  border: "1px solid var(--lux-ink)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.18em",
                }}
              >
                {showBranding ? "ON" : "OFF"}
              </button>
            </div>
          ) : isStarter ? (
            // STARTER pack — specific BUILDER upsell. The $39 anchor is what
            // gets users to the watermark-free tier in one click.
            <div
              className="p-5 mb-6"
              style={{
                background: "var(--lux-ink)",
                color: "var(--lux-bone)",
                border: "1px solid var(--lux-ink)",
              }}
            >
              <div
                className="lux-eyebrow mb-2"
                style={{ color: "var(--lux-champagne)", letterSpacing: "0.18em", fontSize: "0.7rem" }}
              >
                ✦ UNLOCK WATERMARK-FREE EXPORTS
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <p
                  className="lux-prose text-sm"
                  style={{ color: "var(--lux-bone)", opacity: 0.92, maxWidth: 540 }}
                >
                  Your STARTER pack still carries the subtle &ldquo;AI · The Vantage&rdquo; mark.
                  Upgrade to <strong style={{ color: "var(--lux-champagne)" }}>BUILDER</strong> at
                  <strong style={{ color: "var(--lux-champagne)" }}> $39/month</strong> and the
                  watermark comes off every film &mdash; this one too.
                </p>
                <Link
                  to="/pricing"
                  className="lux-eyebrow flex-shrink-0 inline-flex items-center gap-2 self-start sm:self-auto"
                  style={{
                    background: "var(--lux-bone)",
                    color: "var(--lux-ink)",
                    padding: "14px 22px",
                    fontSize: "0.72rem",
                    letterSpacing: "0.2em",
                    border: "1px solid var(--lux-bone)",
                    minHeight: 46,
                  }}
                >
                  UPGRADE TO BUILDER →
                </Link>
              </div>
            </div>
          ) : (
            // True free tier — generic upgrade nudge that still names the $39 hook.
            <div
              className="p-5 mb-6"
              style={{ background: "var(--lux-parchment)", border: "1px solid var(--lux-hairline)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>
                    FREE TIER · WATERMARK INCLUDED
                  </div>
                  <p className="lux-prose text-sm" style={{ color: "var(--lux-ink)", maxWidth: 540 }}>
                    This film carries the subtle &ldquo;AI · The Vantage&rdquo; mark. Upgrade to
                    <strong> BUILDER ($39/month)</strong> or above to remove it on every film going
                    forward.
                  </p>
                </div>
                <Link
                  to="/pricing"
                  className="lux-eyebrow flex-shrink-0 inline-flex items-center gap-2 self-start sm:self-auto"
                  style={{
                    background: "var(--lux-ink)",
                    color: "var(--lux-bone)",
                    padding: "14px 22px",
                    fontSize: "0.72rem",
                    letterSpacing: "0.2em",
                    border: "1px solid var(--lux-ink)",
                    minHeight: 46,
                  }}
                >
                  REMOVE FROM $39 →
                </Link>
              </div>
            </div>
          )}

          {/* Agentic QA — Claude reviews the finished reel and flags real
              defects, offering a one-click re-generate. Renders nothing when
              QA is unavailable (e.g. cross-origin frame extraction blocked),
              so it never nags a good reel. */}
          {videoUrl && (
            <div className="mb-8 flex justify-center">
              <ClaudeQABadge
                videoUrl={(stitchedUrl || videoUrl) as string}
                sourcePhotoUrls={photos.map((p) => p.url!).filter(Boolean)}
                onReroll={handleGenerate}
              />
            </div>
          )}

          {/* AI-Enhanced disclosure */}
          <div className="p-6 mb-12" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--lux-rust)" }} />
              <div>
                <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-rust)" }}>AI-ENHANCED CONTENT</div>
                <p className="lux-prose text-sm" style={{ color: "var(--lux-ink)" }}>
                  This film includes AI-generated elements. Always verify accuracy and disclose AI use to your buyers and your MLS per local Fair Housing and accuracy regulations. The Vantage is not responsible for misuse.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <button
              onClick={async () => {
                const safeName = (location || "vantage")
                  .replace(/[^A-Za-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "")
                  .toLowerCase() || "vantage";
                const filename = stitchedBlob
                  ? `${safeName}-final-cut.${stitchedExt}`
                  : `${safeName}-vantage.mp4`;
                try {
                  const target = stitchedBlob ?? (videoUrl as string);
                  await downloadBlobOrUrl(target, filename);
                } catch (e) {
                  toast.error("Download failed — try long-press on the video to save");
                }
              }}
              className="lux-btn text-center w-full inline-flex items-center justify-center"
              style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "16px 20px" }}
            >
              <Download className="mr-2 w-5 h-5" />
              Download {stitchedUrl ? "Final Cut" : ""}
            </button>
            <Link
              to="/gallery"
              className="lux-btn text-center w-full inline-flex items-center justify-center"
              style={{ background: "var(--lux-rust)", color: "var(--lux-bone)", padding: "16px 20px" }}
            >
              View in Gallery →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                navigator.share({
                  title: "Check out this listing",
                  text: caption || generatedCaption,
                  url: videoUrl,
                });
              }}
              className="lux-btn-ghost text-center w-full inline-flex items-center justify-center"
              style={{ padding: "14px 18px", fontSize: "0.9rem" }}
            >
              <Share2 className="mr-2 w-4 h-4" />
              Share
            </button>
            <button
              onClick={() => {
                setStep(1);
                setPhotos([]);
                setCategory(null);
              }}
              className="lux-btn-ghost text-center w-full inline-flex items-center justify-center"
              style={{ padding: "14px 18px", fontSize: "0.9rem" }}
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              Create Another
            </button>
            <Link
              to="/dashboard"
              className="lux-btn-ghost text-center w-full inline-flex items-center justify-center"
              style={{ padding: "14px 18px", fontSize: "0.9rem" }}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
