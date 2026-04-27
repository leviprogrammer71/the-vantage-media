import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";
import { ShotTypePicker } from "./ShotTypePicker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ShotType } from "@/lib/shot-types";
import {
  Upload,
  Loader2,
  Download,
  Check,
  Coins,
  X,
  Sparkles,
  FolderOpen,
  AlertCircle,
  RefreshCw,
  Tag,
  House,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";

type ListingMode = "single" | "compilation";
type EffectId = "none" | "just_listed" | "open_house" | "for_sale" | "sold";
type EffectMode = "realistic" | "quick" | null;

interface PhotoWithUrl {
  file: File;
  preview: string;
  url: string;
}

const EFFECT_CONFIG: Record<EffectId, { icon: any; label: string }> = {
  none: { icon: null, label: "None" },
  just_listed: { icon: Tag, label: "Just Listed" },
  open_house: { icon: House, label: "Open House" },
  for_sale: { icon: Tag, label: "For Sale" },
  sold: { icon: CheckCircle2, label: "Sold" },
};

export function ListingVideoFlow() {
  const { user } = useAuth();
  const { credits, refreshCredits, deductCredits } = useCredits();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<ListingMode | null>(null);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [shotType, setShotType] = useState<ShotType>("slow_push");
  const [effectId, setEffectId] = useState<EffectId>("none");
  const [effectMode, setEffectMode] = useState<EffectMode>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const calculateCredits = (): number => {
    if (!mode) return 0;
    let base = 0;
    if (mode === "single") {
      // 25 for Kling, 40 for Seedance
      const shotConfig = require("@/lib/shot-types").SHOT_TYPES.find(
        (s: any) => s.id === shotType
      );
      base = shotConfig?.model === "seedance-2" ? 40 : 25;
    } else {
      base = 80; // compilation
    }
    if (effectId !== "none" && effectMode === "realistic") {
      base += 10;
    }
    return base;
  };

  const creditCost = calculateCredits();
  const hasEnoughCredits = credits !== null && credits >= creditCost;

  const uploadFile = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const filePath = `${user!.id}/listing-${timestamp}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("property-photos")
      .upload(filePath, file);

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData, error: signedUrlError } = await supabase.storage
      .from("property-photos")
      .createSignedUrl(filePath, 86400);

    if (signedUrlError || !urlData?.signedUrl) throw new Error("Failed to get image URL");
    return urlData.signedUrl;
  };

  const handleFileSelect = async (rawFile: File) => {
    if (rawFile.size > 52428800) {
      toast.error("Maximum file size is 50MB");
      return;
    }

    let file: File;
    try {
      const { normalizeWithReport } = await import("@/lib/normalize-image");
      const normalized = await normalizeWithReport(rawFile);
      file = normalized.file;
      if (normalized.converted) {
        toast.success(normalized.reason || "Image converted");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please use JPEG, PNG, or WebP.";
      toast.error(msg);
      return;
    }

    const reader = new FileReader();
    const preview = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    try {
      const url = await uploadFile(file);
      const newPhotos = [...photos, { file, preview, url }];
      setPhotos(newPhotos);
      toast.success("Photo uploaded");

      // Auto-advance if single mode already set
      if (mode === "single" && newPhotos.length === 1) {
        setCurrentStep(3);
      }
    } catch (err) {
      toast.error("Failed to upload photo");
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    if (!user || !mode || photos.length === 0) return;

    if (!hasEnoughCredits) {
      setShowCreditsModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const photoUrls = photos.map((p) => p.url);

      const { data, error: invokeError } = await supabase.functions.invoke(
        "generate-listing-video",
        {
          body: {
            mode,
            photo_urls: photoUrls,
            shot_type: shotType,
            effect_id: effectId,
            effect_mode: effectMode || null,
            aspect_ratio: "9:16",
            duration: mode === "single" ? 5 : 15,
            credits_cost: creditCost,
          },
        }
      );

      if (invokeError) throw new Error(invokeError.message);
      if (!data?.video_url) throw new Error("Video generation failed");

      setVideoUrl(data.video_url);
      await deductCredits(creditCost, `Listing video (${mode}, ${creditCost} credits)`);
      await refreshCredits();
      toast.success("Listing video ready!");
    } catch (err) {
      console.error("Generation error:", err);
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Success state
  if (videoUrl) {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <Check className="h-6 w-6 text-green-500" />
          </div>
          <h2 className="text-lg font-bold">YOUR LISTING VIDEO IS READY</h2>
        </div>
        <video
          src={videoUrl}
          controls
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-xl max-h-[60vh] object-contain bg-black"
        />
        <div className="flex gap-3">
          <Button onClick={() => window.open(videoUrl, "_blank")} className="flex-1 gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" asChild className="flex-1 gap-2">
            <Link to="/gallery">
              <FolderOpen className="h-4 w-4" />
              View in Gallery
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <Card className="p-6 space-y-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <div>
          <h2 className="text-lg font-semibold">Creating Your Listing Video...</h2>
          <p className="text-sm text-muted-foreground mt-1">3-5 minutes</p>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-5 space-y-4 border-destructive/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">Generation Failed</p>
            <p className="text-xs text-muted-foreground mt-1 break-words">{error}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => { setError(null); handleGenerate(); }} className="flex-1 gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Button variant="outline" onClick={() => setError(null)} className="flex-1">
            Back
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        <span className="lux-eyebrow text-xs" style={{ color: "var(--lux-brass)" }}>
          STEP {currentStep} / 6
        </span>
      </div>

      {/* STEP 1: Mode picker */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="lux-display text-xl font-bold">SELECT MODE</h2>
            <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>Single or multi-photo</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setMode("single"); setCurrentStep(2); }}
              className={cn(
                "text-center p-6 rounded-none border transition-all",
                mode === "single"
                  ? "bg-ink text-bone"
                  : "bg-bone text-ink"
              )}
              style={
                mode === "single"
                  ? { backgroundColor: "var(--lux-ink)", borderColor: "var(--lux-ink)", color: "var(--lux-bone)" }
                  : { backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)" }
              }
            >
              <div className="text-xs font-bold uppercase tracking-wider mb-1">One Photo</div>
              <div className="lux-prose text-xs mb-2">5-Sec Reel</div>
            </button>

            <button
              onClick={() => { setMode("compilation"); setCurrentStep(2); }}
              className={cn(
                "text-center p-6 rounded-none border transition-all relative",
                mode === "compilation"
                  ? "bg-ink text-bone"
                  : "bg-bone text-ink"
              )}
              style={
                mode === "compilation"
                  ? { backgroundColor: "var(--lux-ink)", borderColor: "var(--lux-ink)", color: "var(--lux-bone)" }
                  : { backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)" }
              }
            >
              <div className="absolute top-2 right-2 lux-eyebrow text-[8px]" style={{ color: "var(--lux-champagne)" }}>
                PREMIUM
              </div>
              <div className="text-xs font-bold uppercase tracking-wider mb-1">3–6 Photos</div>
              <div className="lux-prose text-xs">15-Sec Edit</div>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Photo upload */}
      {currentStep === 2 && mode && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="lux-display text-xl font-bold">UPLOAD PHOTOS</h2>
            <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>
              {mode === "single" ? "One photo" : "3–6 photos"}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple={mode === "compilation"}
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(e) => {
              if (!e.target.files) return;
              const files = Array.from(e.target.files);
              const maxPhotos = mode === "single" ? 1 : 6;
              if (files.length + photos.length > maxPhotos) {
                toast.error(`Maximum ${maxPhotos} photos`);
                return;
              }
              files.forEach((f) => handleFileSelect(f));
            }}
            className="hidden"
          />

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div className="space-y-2">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative flex items-center gap-2">
                  <img src={photo.preview} alt={`Photo ${idx + 1}`} className="h-16 w-16 object-cover rounded" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{photo.file.name}</p>
                    <p className="text-xs text-muted-foreground">{(photo.file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Upload zone */}
          {(mode === "single" ? photos.length === 0 : photos.length < 6) && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors"
              style={{ borderColor: "var(--lux-hairline-strong)", backgroundColor: "var(--lux-cream)" }}
            >
              <Upload className="h-10 w-10 mb-3" style={{ color: "var(--lux-ash)" }} />
              <h3 className="font-semibold" style={{ color: "var(--lux-ink)" }}>Upload a photo</h3>
              <p className="text-xs mt-1" style={{ color: "var(--lux-ash)" }}>JPG, PNG, or WebP (max 50MB)</p>
            </button>
          )}

          {/* Next button */}
          {photos.length > 0 && (
            <Button onClick={() => setCurrentStep(3)} className="w-full">
              Continue →
            </Button>
          )}
        </div>
      )}

      {/* STEP 3: Shot type picker */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="lux-display text-xl font-bold">CAMERA MOVE</h2>
            <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>Choose your cinematic shot</p>
          </div>

          <ShotTypePicker value={shotType} onChange={setShotType} />

          <Button onClick={() => setCurrentStep(4)} className="w-full">
            Continue →
          </Button>
        </div>
      )}

      {/* STEP 4: Effect picker */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="lux-display text-xl font-bold">SPECIAL EFFECT</h2>
            <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>Add optional real estate signage</p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(EFFECT_CONFIG) as EffectId[]).map((id) => {
              const config = EFFECT_CONFIG[id];
              const Icon = config.icon;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setEffectId(id);
                    if (id === "none") setEffectMode(null);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center"
                  )}
                  style={
                    effectId === id
                      ? { backgroundColor: "var(--lux-ink)", borderColor: "var(--lux-ink)", color: "var(--lux-bone)" }
                      : { backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }
                  }
                >
                  {Icon && <Icon className="h-4 w-4 mb-1" />}
                  <span className="text-xs font-bold">{config.label}</span>
                </button>
              );
            })}
          </div>

          <Button onClick={() => effectId === "none" ? setCurrentStep(6) : setCurrentStep(5)} className="w-full">
            Continue →
          </Button>
        </div>
      )}

      {/* STEP 5: Effect mode picker (if effect chosen) */}
      {currentStep === 5 && effectId !== "none" && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="lux-display text-xl font-bold">EFFECT MODE</h2>
            <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>Realistic or quick badge</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setEffectMode("realistic"); setCurrentStep(6); }}
              className={cn(
                "text-left p-4 rounded-lg border transition-all"
              )}
              style={
                effectMode === "realistic"
                  ? { backgroundColor: "var(--lux-ink)", borderColor: "var(--lux-ink)" }
                  : { backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)" }
              }
            >
              <h3 className="text-sm font-bold mb-1" style={{ color: effectMode === "realistic" ? "var(--lux-bone)" : "var(--lux-ink)" }}>
                REALISTIC
              </h3>
              <p className="text-xs" style={{ color: effectMode === "realistic" ? "var(--lux-smoke)" : "var(--lux-ash)" }}>
                AI places sign in scene
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: effectMode === "realistic" ? "var(--lux-champagne)" : "var(--lux-brass)" }}>
                +10 credits
              </p>
            </button>

            <button
              onClick={() => { setEffectMode("quick"); setCurrentStep(6); }}
              className={cn(
                "text-left p-4 rounded-lg border transition-all"
              )}
              style={
                effectMode === "quick"
                  ? { backgroundColor: "var(--lux-ink)", borderColor: "var(--lux-ink)" }
                  : { backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)" }
              }
            >
              <h3 className="text-sm font-bold mb-1" style={{ color: effectMode === "quick" ? "var(--lux-bone)" : "var(--lux-ink)" }}>
                QUICK
              </h3>
              <p className="text-xs" style={{ color: effectMode === "quick" ? "var(--lux-smoke)" : "var(--lux-ash)" }}>
                Badge overlay, instant
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: effectMode === "quick" ? "var(--lux-champagne)" : "var(--lux-brass)" }}>
                +0 credits
              </p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Review & Generate */}
      {currentStep === 6 && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="lux-display text-xl font-bold">REVIEW & GENERATE</h2>
          </div>

          <Card className="p-4 space-y-3" style={{ backgroundColor: "var(--lux-parchment)" }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--lux-ash)" }}>Mode</span>
              <span className="font-semibold" style={{ color: "var(--lux-ink)" }}>{mode === "single" ? "Single Photo" : "Multi-Photo"}</span>
            </div>
            <div className="flex justify-between text-sm border-t" style={{ borderColor: "var(--lux-hairline)", paddingTop: "0.75rem" }}>
              <span style={{ color: "var(--lux-ash)" }}>Photos</span>
              <span className="font-semibold" style={{ color: "var(--lux-ink)" }}>{photos.length}</span>
            </div>
            <div className="flex justify-between text-sm border-t" style={{ borderColor: "var(--lux-hairline)", paddingTop: "0.75rem" }}>
              <span style={{ color: "var(--lux-ash)" }}>Shot</span>
              <span className="font-semibold" style={{ color: "var(--lux-ink)" }}>{shotType}</span>
            </div>
            {effectId !== "none" && (
              <div className="flex justify-between text-sm border-t" style={{ borderColor: "var(--lux-hairline)", paddingTop: "0.75rem" }}>
                <span style={{ color: "var(--lux-ash)" }}>Effect</span>
                <span className="font-semibold" style={{ color: "var(--lux-ink)" }}>{effectId} ({effectMode})</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-double" style={{ borderColor: "var(--lux-brass)", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
              <span className="font-bold" style={{ color: "var(--lux-ink)" }}>Total Cost</span>
              <span className="font-bold text-base" style={{ color: "var(--lux-brass)" }}>{creditCost} credits</span>
            </div>
          </Card>

          {hasEnoughCredits ? (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-12 gap-2 text-base"
            >
              <Sparkles className="h-5 w-5" />
              Generate Listing Reel
            </Button>
          ) : (
            <Button asChild className="w-full h-12 text-base">
              <Link to="/pricing">Get Credits</Link>
            </Button>
          )}
        </div>
      )}

      <InsufficientCreditsModal
        open={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        required={creditCost}
        available={credits ?? 0}
      />
    </div>
  );
}
