import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";
import { ShotTypePicker } from "./ShotTypePicker";
import { TransformationProcessing } from "./TransformationProcessing";
import { normalizeImageForUpload } from "@/lib/normalize-image";
import { SHOT_TYPES } from "@/lib/shot-types";
import { toast } from "sonner";
import type { ShotType } from "@/lib/shot-types";
import {
  Upload, Loader2, Download, Share2, RefreshCw, Check, AlertCircle, X,
  ChevronRight, Heart
} from "lucide-react";
import { Link } from "react-router-dom";

type ListingCategory = "animate_single" | "sun_to_sun" | "listing_bundle";
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
    description: "Upload one daytime exterior. Render at sunrise → golden hour → dusk.",
    details: "12 seconds · Premium tier · From 60 credits",
  },
  {
    id: "listing_bundle" as const,
    title: "The Listing Bundle",
    eyebrow: "FULL LISTING REEL · 3-6 PHOTOS",
    description: "Upload 3-6 photos. AI composes a 15-30 second reel with music & pricing.",
    details: "15-30 seconds · From 90 credits",
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
  else base = 90;

  if (effectId !== "none") base += 10;
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
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (category === "animate_single") {
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
      setStep(2);
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    }
  };

  const handleGenerate = async () => {
    if (!category || !photos.length || !realtorName || !location) {
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
          shot_type: category === "animate_single" ? shotType : undefined,
          effect_id: effectId,
          effect_mode: "realistic",
          listing: {
            realtor_name: realtorName,
            location,
            show_price: showPrice,
            price: showPrice ? price : undefined,
            brokerage,
            caption,
            music_vibe: musicVibe,
          },
          duration: category === "animate_single" ? 8 : category === "sun_to_sun" ? 12 : 20,
          credits_cost: creditCost,
        },
      });

      if (response.error) throw response.error;

      setVideoUrl(response.data.video_url);
      await deductCredits(creditCost);
      await refreshCredits();
      setStep(7);
    } catch (err) {
      const msg = (err as Error).message;
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

          <div className="grid md:grid-cols-3 gap-8">
            {CATEGORY_CARDS.map((card) => (
              <button
                key={card.id}
                onClick={() => {
                  setCategory(card.id);
                  setStep(2);
                }}
                className="group text-left p-8 lux-bg-cream"
                style={{
                  border: "1px solid var(--lux-hairline)",
                  transition: "all 0.3s var(--lux-ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--lux-ink)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--lux-hairline)";
                }}
              >
                <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-brass)" }}>
                  {card.eyebrow}
                </div>
                <h3
                  className="lux-display mb-3"
                  style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}
                >
                  {card.title}
                </h3>
                <p className="lux-prose mb-6">{card.description}</p>
                <div className="flex items-center justify-between mt-8">
                  <span className="text-sm" style={{ color: "var(--lux-ash)" }}>
                    {card.details}
                  </span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </div>
              </button>
            ))}
          </div>
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

          <h2 className="lux-display mb-8" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            {category === "animate_single" && "Upload your hero shot"}
            {category === "sun_to_sun" && "Upload exterior photo"}
            {category === "listing_bundle" && "Upload 3-6 property photos"}
          </h2>

          <div
            className="border-2 border-dashed p-12 text-center cursor-pointer transition"
            style={{
              borderColor: "var(--lux-hairline-strong)",
              background: "var(--lux-parchment)",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--lux-ink)";
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--lux-hairline-strong)";
            }}
            onDrop={(e) => {
              e.preventDefault();
              handlePhotoSelect(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-4" style={{ color: "var(--lux-brass)" }} />
            <p className="lux-prose mb-2">Drag photos here or click to select</p>
            <p style={{ color: "var(--lux-ash)", fontSize: "0.875rem" }}>
              JPEG, PNG, WebP · Max 50MB · {maxPhotos === 1 ? "1 photo" : `${minPhotos}-${maxPhotos} photos`}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple={category === "listing_bundle"}
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(e) => handlePhotoSelect(e.target.files)}
            className="hidden"
          />

          {photos.length > 0 && (
            <div className="mt-8">
              <p className="lux-eyebrow mb-4" style={{ color: "var(--lux-brass)" }}>
                {photos.length} PHOTO{photos.length !== 1 ? "S" : ""} SELECTED
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo, i) => (
                  <div key={i} className="relative">
                    <img src={photo.preview} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover" />
                    <button
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isComplete && (
            <button
              onClick={() => setStep(3)}
              className="lux-btn mt-8 w-full"
              style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
            >
              Continue to Details →
            </button>
          )}
        </div>
      </div>
    );
  }

  // STEP 3: Listing details form
  if (step === 3 && category) {
    const showShotPicker = category === "animate_single";
    const showEffectPicker = true;

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

          <h2 className="lux-display mb-8" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Property details
          </h2>

          <div className="space-y-6">
            {/* Realtor Name */}
            <div>
              <label className="lux-eyebrow block mb-2" style={{ color: "var(--lux-brass)" }}>
                REALTOR / AGENT NAME
              </label>
              <input
                type="text"
                value={realtorName}
                onChange={(e) => setRealtorName(e.target.value)}
                placeholder="Maya Atwood, The Atwood Group"
                className="w-full px-4 py-3 lux-prose"
                style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
              />
            </div>

            {/* Location */}
            <div>
              <label className="lux-eyebrow block mb-2" style={{ color: "var(--lux-brass)" }}>
                LOCATION
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Beacon Hill · Boston"
                className="w-full px-4 py-3 lux-prose"
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
                <label className="lux-eyebrow block mb-2" style={{ color: "var(--lux-brass)" }}>
                  LISTING PRICE
                </label>
                <div className="flex items-center">
                  <span style={{ color: "var(--lux-ink)" }} className="mr-2">
                    $
                  </span>
                  <input
                    type="number"
                    value={price || ""}
                    onChange={(e) => setPrice(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="1250000"
                    className="w-full px-4 py-3 lux-prose"
                    style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
                  />
                </div>
              </div>
            )}

            {/* Brokerage */}
            <div>
              <label className="lux-eyebrow block mb-2" style={{ color: "var(--lux-brass)" }}>
                BROKERAGE (OPTIONAL)
              </label>
              <input
                type="text"
                value={brokerage}
                onChange={(e) => setBrokerage(e.target.value)}
                placeholder="Compass · Sotheby's · The Agency"
                className="w-full px-4 py-3 lux-prose"
                style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
              />
            </div>

            {/* Music Vibe */}
            <div>
              <label className="lux-eyebrow block mb-2" style={{ color: "var(--lux-brass)" }}>
                MUSIC SUGGESTION
              </label>
              <select
                value={musicVibe}
                onChange={(e) => setMusicVibe(e.target.value)}
                className="w-full px-4 py-3 lux-prose"
                style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
              >
                {MUSIC_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: "0.875rem", color: "var(--lux-ash)", marginTop: "0.5rem" }}>
                We'll suggest royalty-free tracks for you to add in your editor.
              </p>
            </div>

            {/* Caption */}
            <div>
              <label className="lux-eyebrow block mb-2" style={{ color: "var(--lux-brass)" }}>
                CAPTION PREVIEW
              </label>
              <textarea
                value={caption || generatedCaption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-3 lux-prose"
                rows={3}
                style={{ border: "1px solid var(--lux-hairline)", background: "var(--lux-parchment)" }}
              />
              {!caption && (
                <p style={{ fontSize: "0.875rem", color: "var(--lux-ash)", marginTop: "0.5rem" }}>
                  Auto-generated from property details
                </p>
              )}
            </div>

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
                <h3 className="lux-eyebrow mb-4" style={{ color: "var(--lux-brass)" }}>
                  LISTING BADGE (OPTIONAL)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.entries(EFFECT_OPTIONS) as [EffectId, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setEffectId(id)}
                      className="px-4 py-2 lux-prose transition"
                      style={{
                        border: `2px solid ${effectId === id ? "var(--lux-ink)" : "var(--lux-hairline)"}`,
                        background: effectId === id ? "var(--lux-ink)" : "transparent",
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
              className="lux-btn-ghost flex-1"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="lux-btn flex-1"
              style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
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
    return (
      <div className="lux-section lux-bg-bone">
        <div className="lux-container max-w-2xl">
          <h2 className="lux-display mb-8" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Review your film
          </h2>

          <div
            className="p-8 mb-8"
            style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}
          >
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--lux-ash)" }}>CATEGORY</span>
                <span className="lux-display" style={{ fontSize: "1rem" }}>
                  {CATEGORY_CARDS.find((c) => c.id === category)?.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--lux-ash)" }}>PHOTOS</span>
                <span className="lux-display" style={{ fontSize: "1rem" }}>
                  {photos.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--lux-ash)" }}>REALTOR</span>
                <span className="lux-display" style={{ fontSize: "1rem" }}>
                  {realtorName}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--lux-ash)" }}>LOCATION</span>
                <span className="lux-display" style={{ fontSize: "1rem" }}>
                  {location}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--lux-ash)" }}>EFFECT</span>
                <span className="lux-display" style={{ fontSize: "1rem" }}>
                  {EFFECT_OPTIONS[effectId]}
                </span>
              </div>
              <div className="border-t border-lux-hairline pt-4 mt-4 flex justify-between font-bold">
                <span style={{ color: "var(--lux-ash)" }}>TOTAL COST</span>
                <span className="lux-display" style={{ fontSize: "1.25rem", color: "var(--lux-rust)" }}>
                  {creditCost} credits
                </span>
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

          <div className="flex gap-4">
            <button
              onClick={() => setStep(3)}
              className="lux-btn-ghost flex-1"
            >
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={!hasEnoughCredits || isGenerating}
              className="lux-btn flex-1"
              style={{
                background: hasEnoughCredits && !isGenerating ? "var(--lux-ink)" : "var(--lux-ash)",
                color: "var(--lux-bone)",
                cursor: hasEnoughCredits && !isGenerating ? "pointer" : "not-allowed",
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

          <div className="mb-8 aspect-[9/16] overflow-hidden" style={{ background: "var(--lux-ink)" }}>
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 mb-8" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
            <p className="lux-prose text-sm">{caption || generatedCaption}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(caption || generatedCaption);
                toast.success("Caption copied");
              }}
              className="lux-btn-ghost mt-4 text-xs"
            >
              Copy Caption
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <a
              href={videoUrl}
              download
              className="lux-btn text-center w-full"
              style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
            >
              <Download className="inline mr-2 w-4 h-4" />
              Download
            </a>
            <button
              onClick={() => {
                navigator.share({
                  title: "Check out this listing",
                  text: caption || generatedCaption,
                  url: videoUrl,
                });
              }}
              className="lux-btn text-center w-full"
              style={{ background: "var(--lux-cream)", color: "var(--lux-ink)", border: "1px solid var(--lux-ink)" }}
            >
              <Share2 className="inline mr-2 w-4 h-4" />
              Share
            </button>
            <button
              onClick={() => {
                setStep(1);
                setPhotos([]);
                setCategory(null);
              }}
              className="lux-btn text-center w-full"
              style={{ background: "var(--lux-cream)", color: "var(--lux-ink)", border: "1px solid var(--lux-ink)" }}
            >
              <RefreshCw className="inline mr-2 w-4 h-4" />
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
