import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";
import { SettingTooltip } from "./SettingTooltip";
import { ShotTypePicker } from "./ShotTypePicker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "motion/react";
import type { ShotType } from "@/lib/shot-types";
import {
  Upload,
  Loader2,
  Download,
  Check,
  Coins,
  X,
  Sparkles,
  Zap,
  Share2,
  Image,
  AlertCircle,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { TransformationProcessing } from "./TransformationProcessing";

import type { TransformationCategory } from "@/pages/Video";

type TransformationType = string;

type BuildType = "full_build" | "team_build" | "diy";
type MotionStyle = "slow_reveal" | "fast_progression" | "cinematic_orbit" | "dramatic_push";
type Duration = "5s" | "10s";
type Format = "reels" | "tiktok" | "landscape";

const CONSTRUCTION_TYPES = [
  { id: "backyard_outdoor", label: "Backyard / Outdoor" },
  { id: "full_home", label: "Full Home Construction" },
  { id: "interior_room", label: "Interior Room" },
  { id: "pool_water", label: "Pool / Water Feature" },
  { id: "kitchen_bathroom", label: "Kitchen or Bathroom" },
  { id: "landscaping", label: "Landscaping" },
];

const CLEANUP_TYPES = [
  { id: "rubbish_removal", label: "Rubbish Removal" },
  { id: "hoarding_cleanout", label: "Hoarding Cleanout" },
  { id: "construction_site_cleanup", label: "Construction Site Cleanup" },
  { id: "garden_yard_cleanup", label: "Garden / Yard Cleanup" },
  { id: "commercial_premises", label: "Commercial Premises Cleanup" },
  { id: "vehicle_driveway", label: "Vehicle / Driveway Cleanup" },
];

const SETUP_TYPES = [
  { id: "event_setup", label: "Event Setup (wedding, corporate, gala)" },
  { id: "dining_setup", label: "Dining Setup (restaurant, cafe, catering)" },
  { id: "market_popup", label: "Market / Pop-Up Stall" },
  { id: "exhibition_trade", label: "Exhibition / Trade Stand" },
  { id: "outdoor_event", label: "Outdoor Event (marquee, festival)" },
  { id: "venue_styling", label: "Venue Styling (hotel, function centre)" },
];

function getTransformationTypes(category: TransformationCategory) {
  switch (category) {
    case "cleanup": return CLEANUP_TYPES;
    case "setup": return SETUP_TYPES;
    default: return CONSTRUCTION_TYPES;
  }
}

const CONSTRUCTION_BUILD_TYPES = [
  { id: "full_build" as const, icon: "🏗️", label: "FULL BUILD", description: "Excavators, cranes, concrete trucks, full crew on site. For large-scale construction projects." },
  { id: "team_build" as const, icon: "👷", label: "TEAM BUILD", description: "2-4 workers, hand tools, skilled tradespeople. For landscaping, decking, tiling, and medium projects." },
  { id: "diy" as const, icon: "🔧", label: "DIY", description: "Single worker, close-up hands, personal craftsmanship. For solo builds and home improvement." },
];

const CLEANUP_BUILD_TYPES = [
  { id: "full_build" as const, icon: "🚚", label: "CREW CLEANUP", description: "Truck and crew. Multiple workers clearing large volume of waste." },
  { id: "team_build" as const, icon: "👷", label: "TEAM CLEANUP", description: "2-4 workers sorting, bagging, and removing rubbish by hand." },
  { id: "diy" as const, icon: "🧹", label: "SOLO CLEANUP", description: "One person working through the space methodically." },
];

const SETUP_BUILD_TYPES = [
  { id: "full_build" as const, icon: "🎪", label: "FULL PRODUCTION", description: "Large crew, marquees, staging, lighting rigs, catering equipment." },
  { id: "team_build" as const, icon: "🪑", label: "TEAM SETUP", description: "Small crew setting tables, arranging furniture, styling the space." },
  { id: "diy" as const, icon: "🎀", label: "SOLO SETUP", description: "One person carefully placing and arranging every element." },
];

function getBuildTypes(category: TransformationCategory) {
  switch (category) {
    case "cleanup": return CLEANUP_BUILD_TYPES;
    case "setup": return SETUP_BUILD_TYPES;
    default: return CONSTRUCTION_BUILD_TYPES;
  }
}

const MOTION_STYLES = [
  { id: "dramatic_push" as const, label: "DRAMATIC PUSH", badge: "🔥 MOST POPULAR", description: "Fast punchy cuts. Workers moving with urgency. Camera pushes hard into the action. Best for TikTok and Instagram Reels." },
  { id: "fast_progression" as const, label: "FAST PROGRESSION", badge: "🔥 MOST POPULAR", description: "Rapid time-compression feel. Relentless progress visible in every cut. Best for viral TikTok construction content." },
  { id: "slow_reveal" as const, label: "SLOW REVEAL", badge: "🔥 MOST POPULAR", description: "Long unhurried takes. Golden hour light. Tactile detail shots. Best for cinematic brand content." },
  { id: "cinematic_orbit" as const, label: "CINEMATIC ORBIT", badge: null as string | null, description: "Slow orbit around the finished space. Wide establishing shots with depth of field. Best for large-scale projects." },
];

const FORMAT_OPTIONS = [
  { id: "reels" as const, label: "Reels (9:16)", ratio: "9:16" },
  { id: "tiktok" as const, label: "TikTok (9:16)", ratio: "9:16" },
  { id: "landscape" as const, label: "Landscape (16:9)", ratio: "16:9" },
];

export function TransformationFlow({ transformationCategory }: { transformationCategory: TransformationCategory }) {
  const { user } = useAuth();
  const { credits, refreshCredits, deductCredits } = useCredits();

  // First-timer detection
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(() => {
    return localStorage.getItem("vantage_advanced_mode") === "true";
  });

  useEffect(() => {
    if (!user) return;
    const checkSubmissions = async () => {
      const { count } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setIsFirstTimer((count ?? 0) === 0);
    };
    checkSubmissions();
  }, [user]);

  const handleExpandAdvanced = () => {
    setShowAdvanced(true);
    localStorage.setItem("vantage_advanced_mode", "true");
  };

  // Upload state
  const [beforeMode, setBeforeMode] = useState<"upload" | "ai">("ai");
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [isUploadingBefore, setIsUploadingBefore] = useState(false);
  const [isUploadingAfter, setIsUploadingAfter] = useState(false);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const TRANSFORMATION_TYPES = getTransformationTypes(transformationCategory);
  const BUILD_TYPES = getBuildTypes(transformationCategory);
  const [transformationType, setTransformationType] = useState<TransformationType>(() => getTransformationTypes(transformationCategory)[0]?.id || "backyard_outdoor");
  const [buildType, setBuildType] = useState<BuildType>("team_build");
  const [motionStyle, setMotionStyle] = useState<MotionStyle>("dramatic_push");
  const [shotType, setShotType] = useState<ShotType>("slow_push");
  const [duration, setDuration] = useState<Duration>("5s");
  const [format, setFormat] = useState<Format>("reels");
  const [description, setDescription] = useState("");

  // Prompt preview
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState<string>("");
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generatedBeforeUrl, setGeneratedBeforeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  // Banner
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem("seedance_banner_dismissed") === "true";
  });

  const creditCost = (() => {
    if (transformationCategory === "cleanup" || transformationCategory === "setup") {
      return beforeMode === "ai"
        ? (duration === "10s" ? 60 : 50)
        : (duration === "10s" ? 50 : 40);
    }
    // Construction
    return beforeMode === "ai"
      ? (duration === "10s" ? 50 : 40)
      : (duration === "10s" ? 40 : 30);
  })();
  const hasEnoughCredits = credits !== null && credits >= creditCost;
  const canGenerate = Boolean(afterImageUrl) && (beforeMode === "ai" || Boolean(beforeImageUrl));

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem("seedance_banner_dismissed", "true");
  };

  const uploadFile = async (file: File, prefix: string): Promise<string> => {
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const filePath = `${user!.id}/transform-${prefix}-${timestamp}.${fileExt}`;

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

  const uploadToSubmissionsBucket = async (file: File, subPath: string): Promise<string> => {
    const { error: uploadError } = await supabase.storage
      .from("project-submissions")
      .upload(subPath, file, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);
    return subPath;
  };

  const handleFileSelect = async (
    rawFile: File,
    type: "before" | "after"
  ) => {
    if (rawFile.size > 52428800) {
      toast.error("Maximum file size is 50MB");
      return;
    }

    const setUploading = type === "before" ? setIsUploadingBefore : setIsUploadingAfter;
    const setUrl = type === "before" ? setBeforeImageUrl : setAfterImageUrl;

    setUploading(true);

    let file: File;
    try {
      // Normalize: convert HEIC/HEIF/etc to JPEG so AI models accept it.
      const { normalizeWithReport } = await import("@/lib/normalize-image");
      const normalized = await normalizeWithReport(rawFile);
      file = normalized.file;
      if (normalized.converted) {
        toast.success(normalized.reason || "Image converted");
      }
    } catch (err) {
      setUploading(false);
      const msg = err instanceof Error ? err.message : "Please use JPEG, PNG, or WebP.";
      toast.error(msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === "before") setBeforeImage(e.target?.result as string);
      else setAfterImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    if (type === "before") setBeforeFile(file);
    else setAfterFile(file);

    try {
      const url = await uploadFile(file, type);
      setUrl(url);
      toast.success(`${type === "before" ? "Before" : "After"} photo uploaded`);
    } catch (err) {
      toast.error(`Failed to upload ${type} photo`);
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const getAspectRatio = () => {
    const f = FORMAT_OPTIONS.find((o) => o.id === format);
    return f?.ratio || "9:16";
  };

  const getDurationSeconds = () => {
    return duration === "5s" ? 5 : 10;
  };

  const handleGenerate = async () => {
    if (!canGenerate || !user) return;

    // Credit check
    if (!hasEnoughCredits) {
      setShowCreditsModal(true);
      return;
    }

    setIsGenerating(true);
    setCurrentStep(1);
    setCompletedSteps([]);
    setVideoUrl(null);
    setGeneratedBeforeUrl(null);
    setError(null);

    try {
      // Step 0: Upload photos to project-submissions and create submission row
      const timestamp = Date.now();
      let afterStoragePath: string | undefined;
      let beforeStoragePath: string | undefined;

      // Upload after photo to project-submissions bucket
      if (afterFile) {
        const fileExt = afterFile.name.split(".").pop();
        const afterPath = `${user.id}/${timestamp}/after/${afterFile.name}`;
        afterStoragePath = await uploadToSubmissionsBucket(afterFile, afterPath);
      }

      // Upload before photo if user provided one
      if (beforeMode === "upload" && beforeFile) {
        const beforePath = `${user.id}/${timestamp}/before/${beforeFile.name}`;
        beforeStoragePath = await uploadToSubmissionsBucket(beforeFile, beforePath);
      }

      // Create submission row immediately
      const { data: submission, error: insertError } = await supabase
        .from("submissions")
        .insert({
          user_id: user.id,
          full_name: user.email || "",
          email: user.email || "",
          business_name: "Self",
          project_description: description || `${transformationType} transformation`,
          transformation_type: transformationType,
          transformation_category: transformationCategory,
          build_type: buildType,
          video_style: motionStyle,
          shot_type: shotType,
          after_photo_paths: afterStoragePath ? [afterStoragePath] : [],
          before_photo_paths: beforeStoragePath ? [beforeStoragePath] : [],
          status: "received",
          prompt_status: "pending",
          video_type: "transformation",
        })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to create submission: ${insertError.message}`);
      const submissionId = submission.id;

      let videoPrompt: string;
      let finalBeforeUrl: string;

      if (beforeMode === "ai") {
        // Path 1: AI generates before image
        setCurrentStep(1);

        const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke(
          "analyze-submission",
          {
            body: {
              after_photo_url: afterImageUrl,
              transformation_type: transformationType,
              transformation_category: transformationCategory,
              build_type: buildType,
              motion_style: motionStyle,
              description,
              generate_before: true,
              submission_id: submissionId,
            },
          }
        );

        if (analyzeError) {
          // Unwrap real error body from Supabase FunctionsHttpError
          let detail = analyzeError.message;
          try {
            const ctx = (analyzeError as any).context;
            if (ctx && typeof ctx.json === "function") {
              const body = await ctx.json();
              if (body?.error) detail = `analyze-submission: ${body.error}`;
            } else if (ctx && typeof ctx.text === "function") {
              const txt = await ctx.text();
              if (txt) detail = `analyze-submission: ${txt}`;
            }
          } catch (_) {}
          console.error("analyze-submission error:", detail, analyzeError);
          throw new Error(detail);
        }
        if (!analyzeData?.before_image_url && !analyzeData?.before_image_path) {
          throw new Error("Analysis failed — missing data");
        }
        if (!analyzeData?.video_prompt) {
          throw new Error("Analysis failed — missing video prompt");
        }

        setCompletedSteps((prev) => [...prev, 1]);

        // Step 2: Before image generated
        setCurrentStep(2);
        finalBeforeUrl = analyzeData.before_image_url;
        setGeneratedBeforeUrl(finalBeforeUrl);
        setCompletedSteps((prev) => [...prev, 2]);

        // Step 3: Prompt written
        setCurrentStep(3);
        videoPrompt = analyzeData.video_prompt;
        setCompletedSteps((prev) => [...prev, 3]);
      } else {
        // Path 2: User uploaded before
        setCurrentStep(1);
        setCompletedSteps((prev) => [...prev, 1]);

        setCurrentStep(3);
        finalBeforeUrl = beforeImageUrl!;

        const { data: promptData, error: promptError } = await supabase.functions.invoke(
          "build-video-prompt",
          {
            body: {
              before_image_url: beforeImageUrl,
              after_image_url: afterImageUrl,
              transformation_type: transformationType,
              transformation_category: transformationCategory,
              motion_style: motionStyle,
              description,
            },
          }
        );

        if (promptError) {
          let detail = promptError.message;
          try {
            const ctx = (promptError as any).context;
            if (ctx && typeof ctx.json === "function") {
              const body = await ctx.json();
              if (body?.error) detail = `build-video-prompt: ${body.error}`;
            }
          } catch (_) {}
          throw new Error(detail);
        }
        if (!promptData?.video_prompt) throw new Error("Failed to generate video prompt");

        videoPrompt = promptData.video_prompt;
        setCompletedSteps((prev) => [...prev, 3]);
      }

      // Step 4: Generating video
      setCurrentStep(4);

      // Start the video generation job
      const { data: startData, error: startError } = await supabase.functions.invoke(
        "generate-transformation-video",
        {
          body: {
            submission_id: submissionId,
            video_prompt: videoPrompt,
            before_image_url: finalBeforeUrl,
            after_image_url: afterImageUrl,
            aspect_ratio: getAspectRatio(),
            duration: getDurationSeconds(),
          },
        }
      );

      if (startError) {
        let detail = startError.message;
        try {
          const ctx = (startError as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) detail = `generate-transformation-video: ${body.error}`;
          }
        } catch (_) {}
        throw new Error(detail);
      }

      // If it completed immediately (within Replicate's wait window)
      if (startData?.status === "complete" && startData?.video_url) {
        setCompletedSteps((prev) => [...prev, 4]);
        setCurrentStep(5);
        setCompletedSteps((prev) => [...prev, 5]);
        setVideoUrl(startData.video_url);
      } else if (startData?.prediction_id) {
        // Client-side polling loop
        const predictionId = startData.prediction_id;
        const maxAttempts = 60; // 5 minutes at 5s intervals
        let completed = false;

        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((r) => setTimeout(r, 5000));

          const { data: pollData, error: pollError } = await supabase.functions.invoke(
            "generate-transformation-video",
            {
              body: {
                prediction_id: predictionId,
                submission_id: submissionId,
              },
            }
          );

          if (pollError) throw new Error(pollError.message);

          if (pollData?.status === "complete" && pollData?.video_url) {
            setCompletedSteps((prev) => [...prev, 4]);
            setCurrentStep(5);
            setCompletedSteps((prev) => [...prev, 5]);
            setVideoUrl(pollData.video_url);
            completed = true;
            break;
          }

          if (pollData?.status === "failed") {
            throw new Error(pollData?.error || "Video generation failed");
          }

          // Still processing — continue polling
        }

        if (!completed) {
          throw new Error("Video generation timed out after 5 minutes. Check your gallery — it may still complete.");
        }
      } else {
        throw new Error("Video generation failed — no prediction ID returned");
      }

      // Deduct credits after successful generation
      const desc = `Transformation video (${transformationType}, ${duration})`;
      await deductCredits(creditCost, desc);
      await refreshCredits();
      toast.success("Transformation video ready!");
    } catch (err) {
      console.error("Transformation generation error:", err);
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      toast.error(msg);
      setIsGenerating(false);
    }
  };

  // Result screen
  if (videoUrl) {
    const displayBeforeUrl = generatedBeforeUrl || beforeImage;
    return (
      <div className="lux-section lux-bg-bone" style={{ paddingBottom: "80px" }}>
        <div className="lux-container max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: "rgba(140, 63, 46, 0.1)" }}>
              <Check className="h-6 w-6" style={{ color: "var(--lux-rust)" }} />
            </div>
            <h2 className="lux-display" style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)" }}>Your video is ready</h2>
          </div>

          {displayBeforeUrl && afterImage && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>BEFORE</span>
                <img src={displayBeforeUrl} alt="Before" className="w-full object-cover aspect-[3/4]" style={{ border: "1px solid var(--lux-hairline)" }} />
              </div>
              <div className="space-y-2">
                <span className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>AFTER</span>
                <img src={afterImage} alt="After" className="w-full object-cover aspect-[3/4]" style={{ border: "1px solid var(--lux-hairline)" }} />
              </div>
            </div>
          )}

          <div style={{ background: "var(--lux-ink)" }} className="p-4">
            <video src={videoUrl} controls autoPlay loop muted playsInline className="w-full max-h-[60vh] object-contain" />
          </div>

          <div className="space-y-3">
            <button onClick={() => window.open(videoUrl, "_blank")} className="lux-btn w-full gap-2 flex items-center justify-center" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "16px 24px" }}>
              <Download className="h-4 w-4" />
              Download Video
            </button>
            <Link to="/gallery" className="lux-btn-ghost w-full gap-2 flex items-center justify-center" style={{ padding: "16px 24px", border: "1px solid var(--lux-hairline)", color: "var(--lux-ink)", textDecoration: "none" }}>
              <FolderOpen className="h-4 w-4" />
              View in Gallery
            </Link>
          </div>

          <div className="text-center" style={{ borderTop: "1px solid var(--lux-hairline)", paddingTop: "16px" }}>
            <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>
              {creditCost} credits used · {(credits ?? 0)} credits remaining
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error screen with retry
  if (error && !isGenerating) {
    return (
      <div className="lux-section lux-bg-bone" style={{ paddingBottom: "80px" }}>
        <div className="lux-container max-w-2xl">
          <div className="p-6 space-y-4" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "var(--lux-rust)" }} />
              <div className="flex-1 min-w-0">
                <p className="lux-eyebrow" style={{ color: "var(--lux-rust)" }}>GENERATION FAILED</p>
                <p className="lux-prose text-sm mt-2 break-words" style={{ color: "var(--lux-ash)" }}>{error}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-3">
              <button onClick={handleGenerate} className="lux-btn flex-1 gap-2 flex items-center justify-center" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "14px 20px" }}>
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <button onClick={() => setError(null)} className="lux-btn-ghost flex-1" style={{ padding: "14px 20px", border: "1px solid var(--lux-hairline)", color: "var(--lux-ink)" }}>
                Back to Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing screen
  if (isGenerating) {
    return (
      <TransformationProcessing
        currentStep={currentStep}
        completedSteps={completedSteps}
        showBeforeStep={beforeMode === "ai"}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Category Context Banner */}
      <div style={{
        background: "var(--lux-bone)",
        borderLeft: "4px solid var(--lux-brass)",
        padding: "12px 16px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
      }}>
        <span style={{ fontSize: "24px" }}>
          {transformationCategory === "construction" ? "🏗️" : transformationCategory === "cleanup" ? "🧹" : "✨"}
        </span>
        <div>
          <div className="lux-eyebrow" style={{ color: "var(--lux-ink)" }}>
            {transformationCategory === "construction" ? "CONSTRUCTION TRANSFORMATION" : transformationCategory === "cleanup" ? "CLEANUP TRANSFORMATION" : "SETUP TRANSFORMATION"}
          </div>
          <div className="lux-prose text-[10px]" style={{ color: "var(--lux-ash)" }}>
            {transformationCategory === "construction" ? "We'll reconstruct the before build state" : transformationCategory === "cleanup" ? "We'll generate the cluttered before state" : "We'll generate the empty before state"}
          </div>
        </div>
      </div>
      {/* Coming Soon Banner */}
      {!bannerDismissed && (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--lux-cream)", color: "var(--lux-ink)" }}>
          <Zap className="h-4 w-4 flex-shrink-0" style={{ color: "var(--lux-brass)" }} />
          <p className="lux-eyebrow flex-1 text-xs" style={{ color: "var(--lux-ink)" }}>
            NOW POWERED BY KLING 2.5 TURBO PRO — 1080p cinematic quality with start and end frame precision. Better than ever.
          </p>
          <button onClick={handleDismissBanner} className="transition-colors" style={{ color: "var(--lux-ash)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Zones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Before Photo */}
        <div className="space-y-3">
          <label className="lux-eyebrow block" style={{ color: "var(--lux-brass)" }}>BEFORE PHOTO</label>
          <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>Upload the before state, or we'll generate it from your after photo</p>
          
          <input
            ref={beforeInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "before")}
            className="hidden"
          />

          {beforeMode === "upload" && beforeImage ? (
            <div className="relative">
              <img src={beforeImage} alt="Before" className="w-full object-cover aspect-[3/4]" style={{ border: "1px solid var(--lux-hairline)" }} />
              {isUploadingBefore && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              <button
                className="absolute top-2 right-2 p-2 transition-opacity"
                style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
                onClick={() => { setBeforeImage(null); setBeforeImageUrl(null); setBeforeFile(null); }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : beforeMode === "upload" ? (
            <button
              onClick={() => beforeInputRef.current?.click()}
              className="w-full border-2 border-dashed p-6 flex flex-col items-center justify-center transition-colors"
              style={{ borderColor: "var(--lux-hairline-strong)", backgroundColor: "var(--lux-cream)" }}
            >
              <Upload className="h-8 w-8 mb-2" style={{ color: "var(--lux-ash)" }} />
              <span className="lux-prose text-xs font-medium" style={{ color: "var(--lux-ink)" }}>Upload before photo</span>
            </button>
          ) : (
            <div className="w-full border-2 border-dashed p-6 flex flex-col items-center justify-center" style={{ borderColor: "var(--lux-hairline-strong)", backgroundColor: "var(--lux-cream)" }}>
              <Sparkles className="h-8 w-8 mb-2" style={{ color: "var(--lux-ash)" }} />
              <span className="lux-prose text-xs" style={{ color: "var(--lux-ash)" }}>We'll reconstruct the before state using AI</span>
            </div>
          )}

          {/* Toggle */}
          <div className="flex gap-0 border" style={{ borderColor: "var(--lux-hairline)" }}>
            <button
              onClick={() => setBeforeMode("upload")}
              className="flex-1 py-2 text-xs font-medium transition-all lux-eyebrow"
              style={beforeMode === "upload" ? {
                background: "var(--lux-ink)",
                color: "var(--lux-bone)",
              } : {
                background: "var(--lux-cream)",
                color: "var(--lux-ink)",
              }}
            >
              Upload my own
            </button>
            <button
              onClick={() => { setBeforeMode("ai"); setBeforeImage(null); setBeforeImageUrl(null); setBeforeFile(null); }}
              className="flex-1 py-2 text-xs font-medium transition-all lux-eyebrow"
              style={beforeMode === "ai" ? {
                background: "var(--lux-ink)",
                color: "var(--lux-bone)",
              } : {
                background: "var(--lux-cream)",
                color: "var(--lux-ink)",
              }}
            >
              AI Generate it
            </button>
          </div>
        </div>

      {/* After Photo */}
        <div className="space-y-3">
          <label className="lux-eyebrow block" style={{ color: "var(--lux-brass)" }}>AFTER PHOTO</label>
          <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>Upload your finished project photo. We reconstruct the before state using AI.</p>

          <input
            ref={afterInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "after")}
            className="hidden"
          />

          {afterImage ? (
            <div className="relative">
              <img src={afterImage} alt="After" className="w-full object-cover aspect-[3/4]" style={{ border: "1px solid var(--lux-hairline)" }} />
              {isUploadingAfter && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              <button
                className="absolute top-2 right-2 p-2 transition-opacity"
                style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
                onClick={() => { setAfterImage(null); setAfterImageUrl(null); setAfterFile(null); }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => afterInputRef.current?.click()}
              className="w-full border-2 border-dashed p-6 flex flex-col items-center justify-center transition-colors aspect-[3/4]"
              style={{ borderColor: "var(--lux-hairline-strong)", backgroundColor: "var(--lux-cream)" }}
            >
              <Upload className="h-8 w-8 mb-2" style={{ color: "var(--lux-ash)" }} />
              <span className="lux-prose text-xs font-medium" style={{ color: "var(--lux-ink)" }}>Upload after photo</span>
              <span className="lux-prose text-[10px] mt-1" style={{ color: "var(--lux-ash)" }}>JPG, PNG, or WebP (max 50MB)</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Section */}
      {isFirstTimer && !showAdvanced ? (
        /* Simplified mode for first-timers */
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-4 w-4" style={{ color: "var(--lux-brass)" }} />
            <span className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
              QUICK START — best settings chosen for you
            </span>
          </div>

          {/* Only Transformation Type */}
          <div className="p-6" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
            <label className="lux-eyebrow flex items-center mb-3" style={{ color: "var(--lux-brass)" }}>
              TRANSFORMATION TYPE
              <SettingTooltip text="What kind of project did you complete? This helps our AI write the right construction story for your video." />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TRANSFORMATION_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTransformationType(t.id)}
                  className="py-2 px-3 border text-xs font-medium transition-all text-left lux-prose"
                  style={transformationType === t.id ? {
                    background: "var(--lux-ink)",
                    borderColor: "var(--lux-brass)",
                    color: "var(--lux-bone)",
                  } : {
                    background: "var(--lux-bone)",
                    borderColor: "var(--lux-hairline)",
                    color: "var(--lux-ink)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExpandAdvanced}
            className="lux-prose text-xs transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lux-brass)", textDecoration: "underline" }}
          >
            Advanced options +
          </button>
        </div>
      ) : (
        /* Full settings - experienced users or expanded */
        <>
          {isFirstTimer && showAdvanced && (
            <div className="flex items-center gap-2 px-1">
              <span className="lux-prose text-xs" style={{ color: "var(--lux-ash)" }}>
                All settings unlocked
              </span>
            </div>
          )}

          <AnimatePresence>
            <motion.div
              initial={isFirstTimer ? { height: 0, opacity: 0 } : false}
              animate={{ height: "auto", opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <details className="group" open={showAdvanced || !isFirstTimer ? true : undefined}>
                <summary className="flex items-center gap-2 cursor-pointer lux-eyebrow hover:opacity-75 transition-opacity py-2" style={{ color: "var(--lux-brass)" }}>
                  <span className="text-xs">▶</span>
                  <span className="group-open:hidden">Customize +</span>
                  <span className="hidden group-open:inline">Customize −</span>
                </summary>

                <div className="p-6 space-y-6 mt-2" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
                  {/* Transformation Type */}
                  <div className="space-y-3">
                    <label className="lux-eyebrow flex items-center" style={{ color: "var(--lux-brass)" }}>
                      TRANSFORMATION TYPE
                      <SettingTooltip text="What kind of project did you complete? This helps our AI write the right construction story for your video." />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TRANSFORMATION_TYPES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTransformationType(t.id)}
                          className="py-2 px-3 border text-xs font-medium transition-all text-left lux-prose"
                          style={transformationType === t.id ? {
                            background: "var(--lux-ink)",
                            borderColor: "var(--lux-brass)",
                            color: "var(--lux-bone)",
                          } : {
                            background: "var(--lux-bone)",
                            borderColor: "var(--lux-hairline)",
                            color: "var(--lux-ink)",
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Build Type */}
                  <div className="space-y-2">
                    <label className="lux-eyebrow flex items-center" style={{ color: "var(--lux-brass)" }}>
                      BUILD TYPE
                      <SettingTooltip text="Full Build = excavators and heavy machinery. Team Build = 2-4 workers building together. DIY = solo project by one person." />
                    </label>
                    <p className="lux-prose text-xs" style={{ color: "var(--lux-ash)", margin: "0 0 12px" }}>
                      Tells the AI what kind of crew to show in your video
                    </p>
                    <div className="space-y-0">
                      {BUILD_TYPES.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => setBuildType(b.id)}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "14px",
                            padding: "16px",
                            background: buildType === b.id ? "var(--lux-ink)" : "var(--lux-bone)",
                            border: buildType === b.id ? "1px solid var(--lux-brass)" : "1px solid var(--lux-hairline)",
                            borderLeft: buildType === b.id ? "4px solid var(--lux-brass)" : "4px solid transparent",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            marginBottom: "8px",
                          }}
                        >
                          <span style={{ fontSize: "24px", lineHeight: 1 }}>{b.icon}</span>
                          <div>
                            <div className="lux-eyebrow" style={{
                              color: buildType === b.id ? "var(--lux-champagne)" : "var(--lux-ink)",
                              marginBottom: buildType === b.id ? "6px" : "0",
                            }}>
                              {b.label}
                            </div>
                            {buildType === b.id && (
                              <div className="lux-prose text-[10px]" style={{
                                color: buildType === b.id ? "var(--lux-smoke)" : "var(--lux-ash)",
                                lineHeight: 1.6,
                              }}>
                                {b.description}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Motion Style */}
                  <div className="space-y-3">
                    <label className="lux-eyebrow flex items-center" style={{ color: "var(--lux-brass)" }}>
                      MOTION STYLE
                      <SettingTooltip text="Controls the energy, pacing, and camera behaviour of the entire video." />
                    </label>
                    <div className="space-y-0">
                      {MOTION_STYLES.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setMotionStyle(m.id)}
                          style={{
                            background: motionStyle === m.id ? "var(--lux-ink)" : "var(--lux-bone)",
                            border: motionStyle === m.id ? "1px solid var(--lux-brass)" : "1px solid var(--lux-hairline)",
                            padding: "16px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            marginBottom: "4px",
                          }}
                        >
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: motionStyle === m.id ? "8px" : "0",
                          }}>
                            <span className="lux-eyebrow" style={{
                              color: motionStyle === m.id ? "var(--lux-champagne)" : "var(--lux-ink)",
                            }}>
                              {m.label}
                            </span>
                            {m.badge && (
                              <span className="lux-eyebrow text-[7px]" style={{
                                background: motionStyle === m.id ? "rgba(201, 169, 110, 0.2)" : "rgba(14, 14, 12, 0.08)",
                                border: motionStyle === m.id ? "1px solid var(--lux-champagne)" : "1px solid var(--lux-hairline)",
                                color: motionStyle === m.id ? "var(--lux-champagne)" : "var(--lux-ash)",
                                padding: "2px 7px",
                                borderRadius: "2px",
                              }}>
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <div style={{
                            maxHeight: motionStyle === m.id ? "80px" : "0",
                            overflow: "hidden",
                            transition: "max-height 0.2s ease",
                          }}>
                            <p className="lux-prose text-[10px]" style={{
                              color: motionStyle === m.id ? "var(--lux-smoke)" : "var(--lux-ash)",
                              margin: 0,
                              lineHeight: 1.6,
                            }}>
                              {m.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shot Type */}
                  <div className="space-y-3">
                    <label className="lux-eyebrow flex items-center" style={{ color: "var(--lux-brass)" }}>
                      SHOT TYPE
                      <SettingTooltip text="Choose the cinematic motion style. Each has different quality and credit costs." />
                    </label>
                    <ShotTypePicker value={shotType} onChange={setShotType} />
                  </div>

                  {/* Duration & Format */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="lux-eyebrow flex items-center" style={{ color: "var(--lux-brass)" }}>
                        DURATION
                        <SettingTooltip text="5s = snappy and punchy, great for TikTok. 10s = more story, better for Instagram." />
                      </label>
                      <div className="flex gap-2">
                        {(["5s", "10s"] as Duration[]).map((d) => (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className="flex-1 py-2 border text-xs font-medium transition-all lux-prose"
                            style={duration === d ? {
                              background: "var(--lux-ink)",
                              borderColor: "var(--lux-brass)",
                              color: "var(--lux-bone)",
                            } : {
                              background: "var(--lux-bone)",
                              borderColor: "var(--lux-hairline)",
                              color: "var(--lux-ink)",
                            }}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <p className="lux-prose text-[10px]" style={{ color: "var(--lux-ash)" }}>Longer = more story = more saves</p>
                    </div>

                    <div className="space-y-3">
                      <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>FORMAT</label>
                      <div className="flex flex-col gap-2">
                        {FORMAT_OPTIONS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setFormat(f.id)}
                            className="py-2 px-2 border text-xs font-medium transition-all text-left lux-prose"
                            style={format === f.id ? {
                              background: "var(--lux-ink)",
                              borderColor: "var(--lux-brass)",
                              color: "var(--lux-bone)",
                            } : {
                              background: "var(--lux-bone)",
                              borderColor: "var(--lux-hairline)",
                              color: "var(--lux-ink)",
                            }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="lux-prose text-[10px] text-center" style={{
                    color: "var(--lux-ash)",
                    marginTop: "16px",
                  }}>
                    Defaults set to the most popular settings for viral TikTok content
                  </p>
                </div>
              </details>
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Project Description */}
      <div className="p-6 space-y-3" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
        <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>DESCRIBE THE TRANSFORMATION <span className="lux-prose text-xs" style={{ color: "var(--lux-ash)", fontWeight: "normal", textTransform: "none", letterSpacing: "0" }}>(Optional)</span></label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 300))}
          placeholder="Tell us about the project — what was built, any special details. (Optional but helps the AI write a better prompt)"
          className="resize-none text-sm lux-prose"
          rows={3}
          style={{ borderColor: "var(--lux-hairline)", background: "var(--lux-bone)" }}
        />
        <p className="lux-prose text-[10px] text-right" style={{ color: "var(--lux-ash)" }}>{description.length}/300</p>
      </div>

      {/* Prompt Preview (Advanced) */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer lux-eyebrow hover:opacity-75 transition-opacity py-2" style={{ color: "var(--lux-brass)" }}>
          <span className="text-xs">▶</span>
          <span className="group-open:hidden">ADVANCED: PREVIEW PROMPT +</span>
          <span className="hidden group-open:inline">ADVANCED: PREVIEW PROMPT −</span>
        </summary>

        <div className="p-6 space-y-3 mt-2" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
          <p className="lux-prose text-xs" style={{ color: "var(--lux-ash)" }}>Preview and edit the AI-generated Kling prompt before spending credits.</p>
          <button
            className="lux-btn-ghost w-full gap-2 flex items-center justify-center"
            style={{ padding: "12px 16px", border: "1px solid var(--lux-hairline)", color: "var(--lux-ink)", opacity: !afterImageUrl || isLoadingPrompt ? 0.5 : 1 }}
            disabled={!afterImageUrl || isLoadingPrompt}
            onClick={async () => {
              if (!afterImageUrl) return;
              setIsLoadingPrompt(true);
              try {
                const { data, error } = await supabase.functions.invoke("build-video-prompt", {
                  body: {
                    before_image_url: beforeImageUrl,
                    after_image_url: afterImageUrl,
                    transformation_type: transformationType,
                    motion_style: motionStyle,
                    description,
                  },
                });
                if (error) throw error;
                if (data?.video_prompt) {
                  setPreviewPrompt(data.video_prompt);
                  setEditedPrompt(data.video_prompt);
                  setShowPromptPreview(true);
                }
              } catch (err) {
                console.error("Prompt preview error:", err);
              } finally {
                setIsLoadingPrompt(false);
              }
            }}
          >
            {isLoadingPrompt ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating prompt...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Preview Prompt</>
            )}
          </button>

          {showPromptPreview && previewPrompt && (
            <div className="space-y-2">
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="resize-none text-xs font-mono lux-prose"
                rows={6}
                style={{ borderColor: "var(--lux-hairline)", background: "var(--lux-bone)" }}
              />
              <p className="lux-prose text-[10px]" style={{ color: "var(--lux-ash)" }}>
                Edit the prompt above to customize the video. Changes will be used during generation.
              </p>
            </div>
          )}
        </div>
      </details>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={{ background: "var(--lux-bone)", borderTop: "1px solid var(--lux-hairline)" }}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4 p-4" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5" style={{ color: hasEnoughCredits ? "var(--lux-brass)" : "var(--lux-rust)" }} />
            <div className="flex flex-col">
              <span className="lux-prose text-sm font-semibold leading-tight" style={{
                color: hasEnoughCredits ? "var(--lux-ink)" : "var(--lux-rust)"
              }}>
                {creditCost} credit{creditCost > 1 ? "s" : ""}
              </span>
              {!hasEnoughCredits && credits !== null && (
                <span className="lux-prose text-xs" style={{ color: "var(--lux-rust)" }}>
                  Need {creditCost - credits} more
                </span>
              )}
            </div>
          </div>

          {!hasEnoughCredits && credits !== null ? (
            <Link to="/pricing" className="lux-btn px-6 py-3 gap-2 flex items-center" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", textDecoration: "none" }}>
              Get Credits
            </Link>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="lux-btn px-6 py-3 gap-2 flex items-center"
              style={{
                background: canGenerate ? "var(--lux-ink)" : "var(--lux-ash)",
                color: "var(--lux-bone)",
                opacity: canGenerate ? 1 : 0.5,
                cursor: canGenerate ? "pointer" : "not-allowed",
              }}
            >
              <Sparkles className="h-5 w-5" />
              {isFirstTimer ? "Generate My First Video →" : "Generate Transformation Video"}
            </button>
          )}
        </div>
      </div>

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        open={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        required={creditCost}
        available={credits ?? 0}
      />
    </div>
  );
}
