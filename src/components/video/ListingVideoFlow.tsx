import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";
import { ShotTypePicker } from "./ShotTypePicker";
import { VibePicker } from "./VibePicker";
import { SettingTooltip } from "./SettingTooltip";
import { TransformationProcessing } from "./TransformationProcessing";
import { normalizeImageForUpload } from "@/lib/normalize-image";
import { SHOT_TYPES, STAGING_STYLES } from "@/lib/shot-types";
import { VIBES } from "@/lib/vibes";
import { toast } from "sonner";
import type { ShotType, StagingStyle } from "@/lib/shot-types";
import type { Vibe } from "@/lib/vibes";
import {
  Upload, Loader2, Download, Share2, RefreshCw, Check, AlertCircle, X,
  ChevronRight, Heart
} from "lucide-react";
import { Link } from "react-router-dom";

type ListingCategory = "animate_single" | "sun_to_sun" | "listing_bundle" | "virtual_staging" | "sketch_to_real" | "floor_plan_pan";
type EffectId = "none" | "just_listed" | "open_house" | "for_sale" | "sold";

interface Photo {
  file: File;
  preview: string;
  url?: string;
}

const CATEGORY_CARDS = [
  {
    id: "animate_single" as const,
    title: "Animate Single",
    eyebrow: "ONE PHOTO · ONE CINEMATIC SHOT",
    description: "Pick a single hero shot. Choose any of six camera moves.",
    details: "5–8 seconds · 1080p vertical · From 25 credits",
  },
  {
    id: "sun_to_sun" as const,
    title: "Sun-Up to Sundown",
    eyebrow: "DAY-TO-DUSK · GOLDEN-HOUR TIMELAPSE",
    description: "Upload one daytime exterior. We render three time-of-day frames (sunrise, golden hour, dusk) and stitch two cinematic transitions through them.",
    details: "12s reel · 2 clips · From 60 credits",
  },
  {
    id: "listing_bundle" as const,
    title: "The Listing Bundle",
    eyebrow: "DONE-FOR-YOU REEL · MOST POPULAR",
    description: "Upload 3-6 photos. We render each as a Seedance 2.0 cinematic clip, stitch them into one finished MP4 with your price and realtor name burned in, and hand back a post-ready film. The full white-glove deliverable.",
    details: "15-30s · From 90 credits · Stitched + branded",
  },
  {
    id: "virtual_staging" as const,
    title: "Virtual Staging",
    eyebrow: "EMPTY ROOM TO FULLY FURNISHED",
    description: "Upload one empty room photo. We furnish it in your chosen style, then deliver a 2-clip reel: the room dressing itself + a slow walk-through. Listings sell 73% faster when staged.",
    details: "10s reel · 2 clips · From 50 credits",
  },
  {
    id: "sketch_to_real" as const,
    title: "Sketch to Reality",
    eyebrow: "PROPERTY PHOTO · HAND-DRAWN REVEAL",
    description: "Upload your property photo. We render a pencil sketch of the same property being hand-drawn on a wooden desk, then animate the drawing morphing into the real photo. Magic moment + reveal walk.",
    details: "10s reel · 2 clips · From 60 credits",
  },
  {
    id: "floor_plan_pan" as const,
    title: "Floor Plan to Walkthrough",
    eyebrow: "FLOOR PLAN · PHOTOREAL WALK-THROUGH",
    description: "Upload a floor plan or axonometric drawing. 2-clip reel: the plan transforming into a photoreal interior + a cinematic camera move through the space.",
    details: "10s reel · 2 clips · From 30 credits",
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

function calculateListingCost(category: ListingCategory, effectId: EffectId): number {
  let base = 0;
  if (category === "animate_single") base = 25;
  else if (category === "sun_to_sun") base = 60;
  else if (category === "listing_bundle") base = 90;
  else if (category === "virtual_staging") base = 50;
  else if (category === "sketch_to_real") base = 60;
  else if (category === "floor_plan_pan") base = 30;

  if (effectId !== "none" && (category === "animate_single" || category === "listing_bundle")) base += 10;
  return base;
}

export function ListingVideoFlow() {
  const { user } = useAuth();
  const { credits, refreshCredits, deductCredits } = useCredits();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [shotType, setShotType] = useState<ShotType>("slow_push");
  const [effectId, setEffectId] = useState<EffectId>("none");
  const [vibe, setVibe] = useState<Vibe>("luxury");
  const [stagingStyle, setStagingStyle] = useState<StagingStyle>("modern");
  const [sketchIntent, setSketchIntent] = useState<"interior" | "exterior">("interior");

  // Form state (Step 3)
  const [realtorName, setRealtorName] = useState("");
  const [location, setLocation] = useState("");
  const [showPrice, setShowPrice] = useState(true);
  const [price, setPrice] = useState<number | null>(null);
  const [brokerage, setBrokerage] = useState("");
  const [caption, setCaption] = useState("");
  const [musicVibe, setMusicVibe] = useState("Cinematic Slow Build");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [clipUrls, setClipUrls] = useState<string[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStitching, setIsStitching] = useState(false);
  const [stitchedUrl, setStitchedUrl] = useState<string | null>(null);

  const creditCost = calculateListingCost(category || "animate_single", effectId);
  const hasEnoughCredits = credits !== null && credits >= creditCost;

  const uploadFile = async (file: File): Promise<string> => {
    const normalized = await normalizeImageForUpload(file);
    const timestamp = Date.now();
    const fileExt = normalized.name.split(".").pop();
    const filePath = `${user!.id}/listing-${timestamp}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("property-photos")
      .upload(filePath, normalized);

    if (uploadError) throw uploadError;

    const { data: urlData, error: signedUrlError } = await supabase.storage
      .from("property-photos")
      .createSignedUrl(filePath, 86400);

    if (signedUrlError || !urlData?.signedUrl) throw signedUrlError;
    return urlData.signedUrl;
  };

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files) return;
    try {
      const newPhotos: Photo[] = [];
      for (const file of Array.from(files)) {
        const preview = URL.createObjectURL(file);
        const url = await uploadFile(file);
        newPhotos.push({ file, preview, url });
      }

      if (category === "animate_single" || category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan") {
        setPhotos([newPhotos[0]]);
      } else if (category === "listing_bundle") {
        if (newPhotos.length < 3) {
          toast.error("Bundle requires at least 3 photos");
          return;
        }
        setPhotos(newPhotos.slice(0, 6));
      } else {
        setPhotos([newPhotos[0]]);
      }
      setStep(category === "virtual_staging" ? 3 : 2);
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    }
  };

  const handleGenerate = async () => {
    if (!category || !photos.length) {
      toast.error("Missing required information");
      return;
    }

    // Check required fields based on category
    if ((category === "animate_single" || category === "sun_to_sun" || category === "listing_bundle") && (!realtorName || !location)) {
      toast.error("Missing required information");
      return;
    }

    if (!hasEnoughCredits) {
      setShowCreditsModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const photoUrls = photos.map((p) => p.url!);
      const response = await supabase.functions.invoke("generate-listing-video", {
        body: {
          category,
          photo_urls: photoUrls,
          shot_type: category === "animate_single" ? shotType : category === "virtual_staging" ? "slow_push" : category === "floor_plan_pan" ? shotType : undefined,
          staging_style: category === "virtual_staging" ? stagingStyle : undefined,
          sketch_intent: category === "sketch_to_real" ? sketchIntent : undefined,
          effect_id: effectId,
          effect_mode: effectId !== "none" ? "realistic" : undefined,
          vibe,
          listing: {
            realtor_name: (category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan") ? undefined : realtorName,
            location: (category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan") ? undefined : location,
            show_price: (category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan") ? undefined : showPrice,
            price: (category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan") ? undefined : (showPrice ? price : undefined),
            brokerage: (category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan") ? undefined : brokerage,
            caption: (category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan") ? undefined : caption,
            music_vibe: (category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan") ? undefined : musicVibe,
          },
          duration: category === "animate_single" ? 8 : category === "sun_to_sun" ? 12 : category === "virtual_staging" ? 8 : category === "sketch_to_real" ? 8 : category === "floor_plan_pan" ? 5 : 20,
          credits_cost: creditCost,
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

      // Capture all clips for the bundle path. For single-clip categories, clip_urls === [video_url].
      const allClips: string[] = finalClipUrls.length > 0 ? finalClipUrls : [finalVideoUrl];
      setClipUrls(allClips);
      setActiveClipIndex(0);
      setVideoUrl(finalVideoUrl);

      // Persist a submission row so this listing video shows up in the user's gallery.
      // Best-effort: failure here does not block the user from seeing their video.
      try {
        const finalClipPaths: string[] = response.data?.output_clip_paths || (response.data?.output_video_path ? [response.data.output_video_path] : []);
        await supabase.from("submissions").insert({
          user_id: user!.id,
          full_name: user!.email || "",
          email: user!.email || "",
          business_name: realtorName || brokerage || "Self",
          project_description: caption || generatedCaption,
          transformation_type: category || "listing",
          transformation_category: null,
          video_type: "listing",
          status: "delivered",
          prompt_status: "complete",
          after_photo_paths: photoUrls.map((u) => u.split("?")[0]).filter(Boolean),
          output_video_url: finalVideoUrl,
          output_video_path: finalClipPaths[0] || null,
        });
      } catch (persistErr) {
        console.error("[ListingVideoFlow] gallery persist failed (non-fatal):", persistErr);
      }

      await deductCredits(creditCost);
      await refreshCredits();
      setStep(7);
    } catch (err) {
      const msg = (err as Error).message;
      console.error("[ListingVideoFlow] generation error:", err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate caption
  const generatedCaption = `Just listed in ${location}. ${
    showPrice && price ? `$${price.toLocaleString()}. ` : ""
  }Tour the property — link in bio. — ${realtorName}${
    brokerage ? `, ${brokerage}` : ""
  }`;

  // Stitch multi-clip reel into single MP4 with text overlays
  const handleStitchReel = async () => {
    if (!clipUrls || clipUrls.length < 2) {
      toast.error("Stitching requires multiple clips");
      return;
    }

    setIsStitching(true);
    setError(null);

    try {
      const stitchResponse = await supabase.functions.invoke("stitch-listing-reel", {
        body: {
          clip_urls: clipUrls,
          listing: {
            price: showPrice ? price : undefined,
            realtor_name: realtorName,
            location,
            brokerage,
            show_price: showPrice,
          },
          watermark: true,
        },
      });

      if (stitchResponse.error) {
        let detailedMsg = stitchResponse.error.message || "Stitching failed";
        try {
          const errCtx: any = (stitchResponse.error as any).context;
          if (errCtx?.body) {
            const parsed = typeof errCtx.body === "string" ? JSON.parse(errCtx.body) : errCtx.body;
            if (parsed?.error) detailedMsg = parsed.error;
          }
        } catch {}
        if (stitchResponse.data?.error) detailedMsg = stitchResponse.data.error;
        throw new Error(detailedMsg);
      }

      const stitched = stitchResponse.data?.stitched_url;
      if (!stitched) {
        throw new Error("No stitched URL returned");
      }

      setStitchedUrl(stitched);
      toast.success("Stitching complete! Download your final cut.");
    } catch (err) {
      const msg = (err as Error).message;
      console.error("[ListingVideoFlow] stitching error:", err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsStitching(false);
    }
  };

  // STEP 1: Category picker
  if (step === 1) {
    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container">
          <div className="mb-12">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORY_CARDS.map((card) => {
              const isFeatured = card.id === "listing_bundle";
              return (
              <button
                key={card.id}
                onClick={() => {
                  setCategory(card.id);
                  setStep(2);
                }}
                className="group text-left p-6 flex flex-col relative"
                style={{
                  background: isFeatured ? "var(--lux-ink)" : "var(--lux-cream)",
                  color: isFeatured ? "var(--lux-bone)" : "var(--lux-ink)",
                  border: `1px solid ${isFeatured ? "var(--lux-ink)" : "var(--lux-hairline)"}`,
                  transition: "all 0.3s var(--lux-ease)",
                  minWidth: 0,
                  minHeight: "320px",
                  boxShadow: isFeatured ? "0 14px 40px rgba(14,14,12,0.18)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isFeatured) e.currentTarget.style.borderColor = "var(--lux-ink)";
                }}
                onMouseLeave={(e) => {
                  if (!isFeatured) e.currentTarget.style.borderColor = "var(--lux-hairline)";
                }}
              >
                {isFeatured && (
                  <div
                    className="lux-eyebrow absolute -top-2 right-4 px-3 py-1"
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
                  className="lux-eyebrow mb-3"
                  style={{
                    color: isFeatured ? "var(--lux-champagne)" : "var(--lux-brass)",
                    fontSize: "0.65rem",
                    lineHeight: 1.3,
                    wordBreak: "normal",
                    overflowWrap: "break-word",
                  }}
                >
                  {card.eyebrow}
                </div>
                <h3
                  className="lux-display mb-3"
                  style={{
                    fontSize: "clamp(1.4rem, 2.4vw, 1.85rem)",
                    lineHeight: 1.05,
                    wordBreak: "normal",
                    overflowWrap: "break-word",
                    hyphens: "manual",
                    color: isFeatured ? "var(--lux-bone)" : "var(--lux-ink)",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  className="lux-prose mb-4 flex-1"
                  style={{
                    fontSize: "0.875rem",
                    lineHeight: 1.55,
                    color: isFeatured ? "rgba(244,239,230,0.85)" : "var(--lux-ink)",
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
        <div className="lux-container max-w-2xl">
          <button
            onClick={() => setStep(1)}
            className="lux-eyebrow mb-8"
            style={{ color: "var(--lux-ash)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Back
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

  // STEP 2b: Floor Plan Pan shot picker (floor_plan_pan only)
  if (step === 2 && category === "floor_plan_pan" && photos.length > 0) {
    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-3xl">
          <button
            onClick={() => setStep(1)}
            className="lux-eyebrow mb-8"
            style={{ color: "var(--lux-ash)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Back
          </button>

          <div className="mb-12">
            <h2 className="lux-display mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Choose camera movement
            </h2>
            <p className="lux-prose mb-6" style={{ color: "var(--lux-ash)" }}>
              Pick how you'd like the camera to move across your floor plan.
            </p>
          </div>

          <ShotTypePicker value={shotType} onChange={setShotType} />

          <button
            onClick={() => setStep(3)}
            className="lux-btn mt-12 w-full"
            style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "18px 24px" }}
          >
            Continue to Style →
          </button>
        </div>
      </div>
    );
  }

  // STEP 2c: Virtual Staging style picker (virtual_staging only)
  if (step === 2 && category === "virtual_staging" && photos.length > 0) {
    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-2xl">
          <button
            onClick={() => setStep(1)}
            className="lux-eyebrow mb-8"
            style={{ color: "var(--lux-ash)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Back
          </button>

          <div className="mb-12">
            <h2 className="lux-display mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Choose your style
            </h2>
            <p className="lux-prose mb-6" style={{ color: "var(--lux-ash)" }}>
              Pick how you'd like the room furnished. We'll add furniture and decor matching this aesthetic.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {STAGING_STYLES.map((style) => {
              const isSelected = stagingStyle === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => setStagingStyle(style.id)}
                  className={`text-left p-6 rounded-none border transition-all ${
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
                  <h3 className="lux-display text-lg mb-1">{style.label}</h3>
                  <p className="lux-prose text-sm" style={{
                    color: isSelected ? "#A39E94" : "#6B6760",
                  }}>
                    {style.description}
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
            Continue to Details →
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: Photo upload
  if (step === 2 && category) {
    const maxPhotos = category === "listing_bundle" ? 6 : 1;
    const minPhotos = category === "listing_bundle" ? 3 : 1;
    const isComplete = photos.length >= minPhotos;

    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-2xl">
          <button
            onClick={() => setStep(1)}
            className="lux-eyebrow mb-8"
            style={{ color: "var(--lux-ash)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Back
          </button>

          <div className="mb-12">
            <h2 className="lux-display mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              {category === "animate_single" && "Upload your hero shot"}
              {category === "sun_to_sun" && "Upload exterior photo"}
              {category === "listing_bundle" && "Upload 3-6 property photos"}
              {category === "sketch_to_real" && "Upload the property photo"}
              {category === "floor_plan_pan" && "Upload your floor plan or axonometric drawing"}
            </h2>
            <p className="lux-prose" style={{ color: "var(--lux-ash)" }}>
              {category === "animate_single" && "High-res horizontal or vertical photos work best."}
              {category === "sun_to_sun" && "A bright daytime exterior. We'll render it at sunrise, golden hour, and dusk."}
              {category === "listing_bundle" && "Mix of exterior, interior, and detail shots. We'll stitch them into one reel."}
              {category === "sketch_to_real" && "Upload the actual property photo (interior or exterior). We'll render a pencil sketch of the same scene being hand-drawn on a desk, then animate the sketch becoming real. Best with sharp, well-lit photos."}
              {category === "floor_plan_pan" && "Floor plans, axonometric drawings, or 3D-isometric room views all work. We'll render the plan as a photoreal interior, then move the camera through it."}
            </p>
          </div>

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
            multiple={category === "listing_bundle"}
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
            onChange={(e) => handlePhotoSelect(e.target.files)}
            className="hidden"
          />

          {photos.length > 0 && (
            <div className="mt-10">
              <p className="lux-eyebrow mb-6" style={{ color: "var(--lux-brass)" }}>
                {photos.length} PHOTO{photos.length !== 1 ? "S" : ""} SELECTED
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {photos.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img src={photo.preview} alt={`Photo ${i + 1}`} className="w-full h-40 object-cover" style={{ border: "1px solid var(--lux-hairline)" }} />
                    <button
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      className="absolute top-2 right-2 p-1 bg-lux-ink rounded opacity-0 group-hover:opacity-100 transition"
                      style={{ background: "var(--lux-ink)" }}
                    >
                      <X className="w-4 h-4" style={{ color: "var(--lux-bone)" }} />
                    </button>
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
    const showListingMetadata = category === "animate_single" || category === "sun_to_sun" || category === "listing_bundle";
    const showShotPicker = category === "animate_single";
    const showEffectPicker = category === "animate_single" || category === "sun_to_sun" || category === "listing_bundle";
    const showVibePicker = true;

    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-2xl">
          <button
            onClick={() => setStep(2)}
            className="lux-eyebrow mb-8"
            style={{ color: "var(--lux-ash)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Back
          </button>

          <div className="mb-12">
            <h2 className="lux-display mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Property details
            </h2>
            <p className="lux-prose" style={{ color: "var(--lux-ash)" }}>
              {category === "virtual_staging" ? "These details help style the scene." : "These details appear in your video and social caption."}
            </p>
          </div>

          <div className="space-y-8">
            {showListingMetadata && (
              <>
                {/* Realtor Name */}
                <div>
                  <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-brass)" }}>
                    REALTOR / AGENT NAME
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
                    LOCATION
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
                      LISTING PRICE
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
                    BROKERAGE (OPTIONAL)
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

                {/* Music Vibe */}
                <div>
                  <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-brass)" }}>
                    MUSIC SUGGESTION
                  </label>
                  <select
                    value={musicVibe}
                    onChange={(e) => setMusicVibe(e.target.value)}
                    className="w-full px-5 py-4 lux-prose"
                    style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
                  >
                    {MUSIC_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: "0.875rem", color: "var(--lux-ash)", marginTop: "0.75rem" }}>
                    We'll suggest royalty-free tracks for you to add in your editor.
                  </p>
                </div>

                {/* Caption */}
                <div>
                  <label className="lux-eyebrow block mb-3" style={{ color: "var(--lux-brass)" }}>
                    CAPTION PREVIEW
                  </label>
                  <textarea
                    value={caption || generatedCaption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-5 py-4 lux-prose"
                    rows={4}
                    style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)", fontFamily: "Inter, sans-serif" }}
                  />
                  {!caption && (
                    <p style={{ fontSize: "0.875rem", color: "var(--lux-ash)", marginTop: "0.75rem" }}>
                      Auto-generated from property details
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Vibe Picker (all categories) */}
            {showVibePicker && (category === "sketch_to_real" || category === "floor_plan_pan" || (category !== "virtual_staging" && showListingMetadata)) && (
              <div>
                <label className="lux-eyebrow block mb-4" style={{ color: "var(--lux-brass)" }}>
                  MOOD &amp; AESTHETIC
                </label>
                <VibePicker value={vibe} onChange={setVibe} />
              </div>
            )}

            {/* Shot Picker (animate_single only) */}
            {showShotPicker && (
              <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--lux-hairline)" }}>
                <h3 className="lux-eyebrow mb-4" style={{ color: "var(--lux-brass)" }}>
                  CAMERA MOVEMENT
                </h3>
                <ShotTypePicker value={shotType} onChange={setShotType} />
              </div>
            )}

            {/* Effect Picker */}
            {showEffectPicker && (
              <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--lux-hairline)" }}>
                <h3 className="lux-eyebrow mb-6" style={{ color: "var(--lux-brass)" }}>
                  LISTING BADGE (OPTIONAL)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(Object.entries(EFFECT_OPTIONS) as [EffectId, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setEffectId(id)}
                      className="px-5 py-3 lux-prose transition rounded-sm"
                      style={{
                        border: `1px solid ${effectId === id ? "var(--lux-ink)" : "var(--lux-hairline)"}`,
                        background: effectId === id ? "var(--lux-ink)" : "var(--lux-parchment)",
                        color: effectId === id ? "var(--lux-bone)" : "var(--lux-ink)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
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
    const isFloorPlanPan = category === "floor_plan_pan";

    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-4xl">
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

          {(category === "animate_single" || category === "sun_to_sun" || category === "listing_bundle") && (!realtorName || !location) && (
            <div
              className="p-4 mb-8 border-l-4"
              style={{ borderColor: "var(--lux-ash)", background: "rgba(107, 103, 96, 0.05)" }}
            >
              <p style={{ color: "var(--lux-ash)", fontSize: "0.875rem" }}>
                {!realtorName && "Add a realtor name to continue."}
                {!location && !realtorName && " Add a location too."}
                {!location && realtorName && "Add a location to continue."}
              </p>
            </div>
          )}

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
              disabled={!hasEnoughCredits || isGenerating || ((category === "animate_single" || category === "sun_to_sun" || category === "listing_bundle") && (!realtorName || !location))}
              className="lux-btn flex-1"
              style={{
                background: (hasEnoughCredits && !isGenerating && (category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan" || (realtorName && location))) ? "var(--lux-ink)" : "var(--lux-ash)",
                color: "var(--lux-bone)",
                cursor: (hasEnoughCredits && !isGenerating && (category === "virtual_staging" || category === "sketch_to_real" || category === "floor_plan_pan" || (realtorName && location))) ? "pointer" : "not-allowed",
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
        <div className="lux-container max-w-3xl">
          <h2 className="lux-display mb-8" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Your listing film
          </h2>

          <div className="mb-8 aspect-[9/16] overflow-hidden relative" style={{ background: "var(--lux-ink)" }}>
            {isStitching && (
              <div className="absolute inset-0 flex items-center justify-center z-50" style={{ background: "rgba(14,14,12,0.9)" }}>
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "var(--lux-champagne)" }} />
                  <p className="lux-eyebrow" style={{ color: "var(--lux-bone)" }}>
                    Stitching your final cut…
                  </p>
                </div>
              </div>
            )}
            <video
              key={stitchedUrl || clipUrls[activeClipIndex] || videoUrl}
              src={stitchedUrl || clipUrls[activeClipIndex] || videoUrl}
              controls={clipUrls.length <= 1 || stitchedUrl !== null}
              autoPlay
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
            {(category === "listing_bundle" || category === "animate_single" || category === "sun_to_sun") && (location || (showPrice && price) || brokerage) && (
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
            {/* Watermark overlay */}
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
              AI · THE VANTAGE
            </div>
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
            <div className="mb-8 text-center space-y-3">
              <div className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>
                ✦ {clipUrls.length}-CLIP REEL · {clipUrls.length * 5}s
              </div>
              {musicVibe && musicVibe !== "No music (you'll add yours)" && (category === "listing_bundle" || category === "animate_single" || category === "sun_to_sun") && (
                <div className="lux-prose text-sm" style={{ color: "var(--lux-brass)" }}>
                  ♫ Suggested music: <span style={{ color: "var(--lux-ink)" }}>{musicVibe}</span> — drop a track in this style in your editor
                </div>
              )}
              <button
                onClick={handleStitchReel}
                disabled={isStitching}
                className="lux-btn mt-4"
                style={{
                  background: "var(--lux-brass)",
                  color: "var(--lux-bone)",
                  padding: "12px 24px",
                  opacity: isStitching ? 0.6 : 1,
                }}
              >
                {isStitching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 inline-block animate-spin" />
                    Stitching…
                  </>
                ) : (
                  "Stitch into Single MP4"
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
            <a
              href={stitchedUrl || videoUrl}
              download
              className="lux-btn text-center w-full inline-flex items-center justify-center"
              style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "16px 20px" }}
            >
              <Download className="mr-2 w-5 h-5" />
              Download {stitchedUrl ? "Final Cut" : ""}
            </a>
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
