import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";
import { SettingTooltip } from "./SettingTooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "motion/react";
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
    file: File,
    type: "before" | "after"
  ) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error("Please upload a JPG, PNG, or WebP image");
      return;
    }
    if (file.size > 10485760) {
      toast.error("Maximum file size is 10MB");
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

    const setUploading = type === "before" ? setIsUploadingBefore : setIsUploadingAfter;
    const setUrl = type === "before" ? setBeforeImageUrl : setAfterImageUrl;

    setUploading(true);
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
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <Check className="h-6 w-6 text-green-500" />
          </div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>✅ YOUR VIDEO IS READY</h2>
        </div>

        {displayBeforeUrl && afterImage && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Before</span>
              <img src={displayBeforeUrl} alt="Before" className="w-full rounded-lg object-cover aspect-[3/4]" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">After</span>
              <img src={afterImage} alt="After" className="w-full rounded-lg object-cover aspect-[3/4]" />
            </div>
          </div>
        )}

        <video src={videoUrl} controls autoPlay loop muted playsInline className="w-full rounded-xl max-h-[60vh] object-contain bg-black" />

        <div className="flex gap-3">
          <Button onClick={() => window.open(videoUrl, "_blank")} className="flex-1 gap-2">
            <Download className="h-4 w-4" />
            Download Video
          </Button>
          <Button variant="outline" asChild className="flex-1 gap-2">
            <Link to="/gallery">
              <FolderOpen className="h-4 w-4" />
              View in Gallery
            </Link>
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          {creditCost} credits used · {(credits ?? 0)} credits remaining
        </p>
      </div>
    );
  }

  // Error screen with retry
  if (error && !isGenerating) {
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
          <Button onClick={handleGenerate} className="flex-1 gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Button variant="outline" onClick={() => setError(null)} className="flex-1">
            Back to Settings
          </Button>
        </div>
      </Card>
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
        background: "#111111",
        borderLeft: "4px solid #E8C547",
        padding: "12px 16px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
      }}>
        <span style={{ fontSize: "24px" }}>
          {transformationCategory === "construction" ? "🏗️" : transformationCategory === "cleanup" ? "🧹" : "✨"}
        </span>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#FFFFFF", fontWeight: 700 }}>
            {transformationCategory === "construction" ? "CONSTRUCTION TRANSFORMATION" : transformationCategory === "cleanup" ? "CLEANUP TRANSFORMATION" : "SETUP TRANSFORMATION"}
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#555555" }}>
            {transformationCategory === "construction" ? "We'll reconstruct the before build state" : transformationCategory === "cleanup" ? "We'll generate the cluttered before state" : "We'll generate the empty before state"}
          </div>
        </div>
      </div>
      {/* Coming Soon Banner */}
      {!bannerDismissed && (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "#3D2E00" }}>
          <Zap className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="flex-1 text-xs font-mono text-amber-400">
            NOW POWERED BY KLING 2.5 TURBO PRO — 1080p cinematic quality with start and end frame precision. Better than ever.
          </p>
          <button onClick={handleDismissBanner} className="text-amber-400/60 hover:text-amber-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Zones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Before Photo */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider">Before Photo</label>
          <p className="text-xs text-muted-foreground">Upload the before state, or we'll generate it from your after photo</p>
          
          <input
            ref={beforeInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "before")}
            className="hidden"
          />

          {beforeMode === "upload" && beforeImage ? (
            <div className="relative">
              <img src={beforeImage} alt="Before" className="w-full rounded-lg object-cover aspect-[3/4]" />
              {isUploadingBefore && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => { setBeforeImage(null); setBeforeImageUrl(null); setBeforeFile(null); }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : beforeMode === "upload" ? (
            <button
              onClick={() => beforeInputRef.current?.click()}
              className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 flex flex-col items-center justify-center hover:border-primary/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <span className="text-xs font-medium">Upload before photo</span>
            </button>
          ) : (
            <div className="w-full border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 flex flex-col items-center justify-center bg-muted/30">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <span className="text-xs text-muted-foreground">We'll reconstruct the before state using AI</span>
            </div>
          )}

          {/* Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setBeforeMode("upload")}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium transition-all",
                beforeMode === "upload" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              Upload my own
            </button>
            <button
              onClick={() => { setBeforeMode("ai"); setBeforeImage(null); setBeforeImageUrl(null); setBeforeFile(null); }}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium transition-all",
                beforeMode === "ai" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              AI Generate it
            </button>
          </div>
        </div>

      {/* After Photo */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider">After Photo</label>
          <p className="text-xs text-muted-foreground">Upload your finished project photo. We reconstruct the before state using AI.</p>

          <input
            ref={afterInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "after")}
            className="hidden"
          />

          {afterImage ? (
            <div className="relative">
              <img src={afterImage} alt="After" className="w-full rounded-lg object-cover aspect-[3/4]" />
              {isUploadingAfter && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => { setAfterImage(null); setAfterImageUrl(null); setAfterFile(null); }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => afterInputRef.current?.click()}
              className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 flex flex-col items-center justify-center hover:border-primary/50 transition-colors aspect-[3/4]"
            >
              <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <span className="text-xs font-medium">Upload after photo</span>
              <span className="text-[10px] text-muted-foreground mt-1">JPG, PNG, or WebP (max 10MB)</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Section */}
      {isFirstTimer && !showAdvanced ? (
        /* Simplified mode for first-timers */
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary" style={{ fontFamily: "'Space Mono', monospace" }}>
              QUICK START — best settings chosen for you
            </span>
          </div>

          {/* Only Transformation Type */}
          <Card className="p-4 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider flex items-center">
              Transformation Type
              <SettingTooltip text="What kind of project did you complete? This helps our AI write the right construction story for your video." />
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {TRANSFORMATION_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTransformationType(t.id)}
                  className={cn(
                    "py-2 px-3 rounded-lg border text-xs font-medium transition-all text-left",
                    transformationType === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Card>

          <button
            onClick={handleExpandAdvanced}
            className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
          >
            Advanced options +
          </button>
        </div>
      ) : (
        /* Full settings - experienced users or expanded */
        <>
          {isFirstTimer && showAdvanced && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Space Mono', monospace" }}>
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
                <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-2">
                  <span className="text-xs">▶</span>
                  <span className="group-open:hidden">Customize +</span>
                  <span className="hidden group-open:inline">Customize −</span>
                </summary>

                <Card className="p-4 space-y-4 mt-2">
                  {/* Transformation Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider flex items-center">
                      Transformation Type
                      <SettingTooltip text="What kind of project did you complete? This helps our AI write the right construction story for your video." />
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TRANSFORMATION_TYPES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTransformationType(t.id)}
                          className={cn(
                            "py-2 px-3 rounded-lg border text-xs font-medium transition-all text-left",
                            transformationType === t.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Build Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider flex items-center">
                      Build Type
                      <SettingTooltip text="Full Build = excavators and heavy machinery. Team Build = 2-4 workers building together. DIY = solo project by one person." />
                    </label>
                    <p style={{ fontFamily: "Space Mono, monospace", fontSize: "10px", color: "#555555", margin: "4px 0 12px" }}>
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
                            background: buildType === b.id ? "rgba(232,197,71,0.08)" : "#111111",
                            border: buildType === b.id ? "1px solid #E8C547" : "1px solid #222222",
                            borderLeft: buildType === b.id ? "4px solid #E8C547" : "4px solid transparent",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            marginBottom: "8px",
                          }}
                        >
                          <span style={{ fontSize: "24px", lineHeight: 1 }}>{b.icon}</span>
                          <div>
                            <div style={{
                              fontFamily: "Space Mono, monospace",
                              fontSize: "12px",
                              fontWeight: 700,
                              letterSpacing: "1px",
                              color: buildType === b.id ? "#E8C547" : "#F5F5F0",
                              marginBottom: buildType === b.id ? "6px" : "0",
                            }}>
                              {b.label}
                            </div>
                            {buildType === b.id && (
                              <div style={{
                                fontFamily: "Space Mono, monospace",
                                fontSize: "10px",
                                color: "#AAAAAA",
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
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider flex items-center">
                      Motion Style
                      <SettingTooltip text="Controls the energy, pacing, and camera behaviour of the entire video." />
                    </label>
                    <div className="space-y-0">
                      {MOTION_STYLES.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setMotionStyle(m.id)}
                          style={{
                            background: motionStyle === m.id ? "rgba(232,197,71,0.08)" : "#111111",
                            border: motionStyle === m.id ? "1px solid #E8C547" : "1px solid #222222",
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
                            <span style={{
                              fontFamily: "Space Mono, monospace",
                              fontSize: "12px",
                              fontWeight: 700,
                              letterSpacing: "1px",
                              color: motionStyle === m.id ? "#E8C547" : "#F5F5F0",
                            }}>
                              {m.label}
                            </span>
                            {m.badge && (
                              <span style={{
                                background: "rgba(232,197,71,0.12)",
                                border: "1px solid rgba(232,197,71,0.35)",
                                color: "#E8C547",
                                fontFamily: "Space Mono, monospace",
                                fontSize: "8px",
                                letterSpacing: "1px",
                                padding: "2px 7px",
                                fontWeight: 700,
                              }}>
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <div style={{
                            maxHeight: motionStyle === m.id ? "60px" : "0",
                            overflow: "hidden",
                            transition: "max-height 0.2s ease",
                          }}>
                            <p style={{
                              fontFamily: "Space Mono, monospace",
                              fontSize: "10px",
                              color: "#AAAAAA",
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

                  {/* Duration & Format */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider flex items-center">
                        Duration
                        <SettingTooltip text="5s = snappy and punchy, great for TikTok. 10s = more story, better for Instagram." />
                      </label>
                      <div className="flex gap-1.5">
                        {(["5s", "10s"] as Duration[]).map((d) => (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className={cn(
                              "flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-all",
                              duration === d
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Longer = more story = more saves</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider">Format</label>
                      <div className="flex flex-col gap-1.5">
                        {FORMAT_OPTIONS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setFormat(f.id)}
                            className={cn(
                              "py-1.5 px-2 rounded-lg border text-xs font-medium transition-all text-left",
                              format === f.id
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "10px",
                    color: "#444444",
                    textAlign: "center",
                    marginTop: "16px",
                  }}>
                    Defaults set to the most popular settings for viral TikTok content
                  </p>
                </Card>
              </details>
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Project Description */}
      <Card className="p-4 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider">Describe the Transformation <span className="text-muted-foreground font-normal normal-case">(Optional)</span></label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 300))}
          placeholder="Tell us about the project — what was built, any special details. (Optional but helps the AI write a better prompt)"
          className="resize-none text-sm"
          rows={3}
        />
        <p className="text-[10px] text-muted-foreground text-right">{description.length}/300</p>
      </Card>

      {/* Prompt Preview (Advanced) */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-2">
          <span className="text-xs">▶</span>
          <span className="group-open:hidden">Advanced: Preview prompt +</span>
          <span className="hidden group-open:inline">Advanced: Preview prompt −</span>
        </summary>

        <Card className="p-4 space-y-3 mt-2">
          <p className="text-xs text-muted-foreground">Preview and edit the AI-generated Kling prompt before spending credits.</p>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
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
          </Button>

          {showPromptPreview && previewPrompt && (
            <div className="space-y-2">
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="resize-none text-xs font-mono"
                rows={6}
              />
              <p className="text-[10px] text-muted-foreground">
                Edit the prompt above to customize the video. Changes will be used during generation.
              </p>
            </div>
          )}
        </Card>
      </details>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border p-4 pb-safe">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coins className={cn("h-5 w-5", hasEnoughCredits ? "text-amber-500" : "text-destructive")} />
            <div className="flex flex-col">
              <span className={cn(
                "font-bold text-lg leading-tight",
                hasEnoughCredits ? "text-amber-600 dark:text-amber-400" : "text-destructive"
              )}>
                {creditCost} credit{creditCost > 1 ? "s" : ""}
              </span>
              {!hasEnoughCredits && credits !== null && (
                <span className="text-xs text-destructive">
                  Need {creditCost - credits} more
                </span>
              )}
            </div>
          </div>

          {!hasEnoughCredits && credits !== null ? (
            <Button asChild className="h-12 px-6 text-base">
              <Link to="/pricing">Get Credits</Link>
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="h-12 px-6 text-base gap-2"
            >
              <Sparkles className="h-5 w-5" />
              {isFirstTimer ? "Generate My First Video →" : "Generate Transformation Video"}
            </Button>
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
