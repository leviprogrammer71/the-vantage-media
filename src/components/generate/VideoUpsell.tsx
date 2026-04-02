import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Video, 
  Sparkles, 
  Loader2,
  Check,
  Download,
  AlertCircle,
  Coins,
  Home,
  Sofa,
  X,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  EnhancementRecommendation,
  shouldShowEnhancementRecommendation,
} from "@/components/generate/EnhancementRecommendation";

interface VideoUpsellProps {
  enhancedImageUrl?: string;
  originalImageUrl?: string;
  isEnhanced?: boolean;
  credits: number | null;
  onClose?: () => void;
  onRequestEnhancement?: () => void;
}

type VideoQuality = "standard" | "cinematic";
type VideoLength = "5s" | "10s";
type AspectRatio = "16:9" | "9:16";
type SceneType = "exterior" | "interior";

// Motion styles based on PDF recommendations
const EXTERIOR_MOTIONS = [
  { id: "drone_overview", label: "Drone Overview", desc: "Sweeping aerial view" },
  { id: "curbside_pan", label: "Curbside Pan", desc: "Street-level pan" },
  { id: "twilight_orbit", label: "Twilight Orbit", desc: "Evening circling shot" },
  { id: "front_door_reveal", label: "Door Reveal", desc: "Pull back & rise" },
  { id: "slow_push", label: "Slow Push", desc: "Subtle push-in" },
];

const INTERIOR_MOTIONS = [
  { id: "living_room_pan", label: "Room Pan", desc: "Wide-angle sweep" },
  { id: "kitchen_walkthrough", label: "Walkthrough", desc: "Morning walkthrough" },
  { id: "cozy_evening", label: "Cozy Evening", desc: "Warm ambient" },
  { id: "bedroom_showcase", label: "Bedroom Tour", desc: "Tranquil pan" },
  { id: "open_concept_flow", label: "Open Concept", desc: "Room-to-room flow" },
];

// Credit costs based on the system
const getCreditCost = (quality: VideoQuality, length: VideoLength, extraFormat: boolean): number => {
  let base = 0;
  if (quality === "standard") {
    base = length === "5s" ? 10 : 20;
  } else {
    base = length === "5s" ? 20 : 30;
  }
  return extraFormat ? base + 10 : base;
};

export const VideoUpsell = ({ 
  enhancedImageUrl, 
  originalImageUrl,
  isEnhanced = true,
  credits, 
  onClose,
  onRequestEnhancement
}: VideoUpsellProps) => {
  const [quality, setQuality] = useState<VideoQuality>("standard");
  const [length, setLength] = useState<VideoLength>("5s");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [sceneType, setSceneType] = useState<SceneType>("exterior");
  const [motion, setMotion] = useState("slow_push");
  const [extraFormat, setExtraFormat] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);

  const imageUrl = enhancedImageUrl || originalImageUrl;
  const creditCost = getCreditCost(quality, length, extraFormat);
  const hasEnoughCredits = credits !== null && credits >= creditCost;
  const motionOptions = sceneType === "exterior" ? EXTERIOR_MOTIONS : INTERIOR_MOTIONS;

  const executeVideoGeneration = async () => {
    if (!imageUrl || !hasEnoughCredits) {
      toast.error("Not enough credits");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("generate-video", {
        body: {
          imageUrl,
          quality,
          aspectRatio,
          motion,
          duration: length === "5s" ? 5 : 10,
          sceneType,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.predictionId) {
        throw new Error("Failed to start video generation");
      }

      setProgress(10);
      toast.info(`Video generation started (${data.estimatedTime})`);

      await pollForCompletion(data.predictionId);

    } catch (err) {
      console.error("Video generation error:", err);
      setError(err instanceof Error ? err.message : "Video generation failed");
      toast.error("Video generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = () => {
    if (!imageUrl || !hasEnoughCredits) {
      toast.error("Not enough credits");
      return;
    }

    // Show recommendation for unenhanced images if user hasn't permanently dismissed
    if (!isEnhanced && shouldShowEnhancementRecommendation()) {
      setShowRecommendation(true);
    } else {
      executeVideoGeneration();
    }
  };

  const handleGenerateAnyway = () => {
    setShowRecommendation(false);
    executeVideoGeneration();
  };

  const pollForCompletion = async (id: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      try {
        const { data, error } = await supabase.functions.invoke("generate-video", {
          body: { predictionId: id },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.progress) {
          setProgress(Math.min(10 + data.progress * 0.9, 95));
        }

        if (data?.status === "succeeded" && data?.output) {
          setProgress(100);
          const url = Array.isArray(data.output) ? data.output[0] : data.output;
          setVideoUrl(url);
          toast.success("Video generated successfully!");
          return;
        }

        if (data?.status === "failed") {
          throw new Error(data.error || "Video generation failed");
        }

      } catch (err) {
        console.error("Poll error:", err);
      }
    }

    throw new Error("Video generation timed out");
  };

  const handleDownload = () => {
    if (videoUrl) {
      window.open(videoUrl, "_blank");
    }
  };

  // Enhancement Recommendation (non-blocking inline banner)
  if (showRecommendation && !isEnhanced) {
    return (
      <EnhancementRecommendation
        onEnhanceFirst={onRequestEnhancement}
        onGenerateAnyway={handleGenerateAnyway}
      />
    );
  }

  if (videoUrl) {
    return (
      <Card className="p-4 bg-card border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">Video Ready!</h3>
          </div>
          
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            muted
            className="w-full rounded-lg"
          />

          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Video
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive/30">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">Generation Failed</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>
            Try Again
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div>
              <h3 className="font-semibold">Creating Your Video...</h3>
              <p className="text-sm text-muted-foreground">
                {quality === "cinematic" ? "Veo 3 (2-4 min)" : "Standard (1-2 min)"}
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {progress < 20 ? "Initializing..." : 
             progress < 50 ? "Generating motion..." : 
             progress < 80 ? "Rendering frames..." : "Finalizing..."}
          </p>
        </div>
      </Card>
    );
  }

  if (!hasEnoughCredits && credits !== null) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Coins className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <h3 className="font-semibold">More Credits Needed</h3>
            <p className="text-sm text-muted-foreground">
              Video requires {creditCost} credits. You have {credits}.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/pricing">Get Credits</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Create Listing Video</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Non-enhanced image notice */}
      {!isEnhanced && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>Using original image. Enhanced photos produce better videos.</span>
        </div>
      )}

      {/* Scene Type */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setSceneType("exterior"); setMotion("slow_push"); }}
          className={cn(
            "p-3 rounded-lg border-2 flex items-center gap-2 transition-all text-sm",
            sceneType === "exterior" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <Home className="h-4 w-4" />
          Exterior
        </button>
        <button
          onClick={() => { setSceneType("interior"); setMotion("living_room_pan"); }}
          className={cn(
            "p-3 rounded-lg border-2 flex items-center gap-2 transition-all text-sm",
            sceneType === "interior" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <Sofa className="h-4 w-4" />
          Interior
        </button>
      </div>

      {/* Motion Style */}
      <div className="grid grid-cols-2 gap-1.5">
        {motionOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setMotion(opt.id)}
            className={cn(
              "p-2 rounded-lg border text-left transition-all text-xs",
              motion === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <span className="font-medium">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Quality */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setQuality("standard")}
          className={cn(
            "p-3 rounded-lg border-2 text-left transition-all",
            quality === "standard" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm">Standard</span>
            <Badge variant="secondary" className="text-xs">1-2 cr</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Wan 2.1 • Fast</p>
        </button>
        <button
          onClick={() => setQuality("cinematic")}
          className={cn(
            "p-3 rounded-lg border-2 text-left transition-all",
            quality === "cinematic" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm">Cinematic</span>
            <Badge className="bg-amber-500 text-xs">3-4 cr</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Veo 3 • Premium</p>
        </button>
      </div>

      {/* Length & Aspect Ratio */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-medium">Length</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setLength("5s")}
              className={cn(
                "py-1.5 px-2 rounded border text-xs font-medium transition-all",
                length === "5s" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              5 sec
            </button>
            <button
              onClick={() => setLength("10s")}
              className={cn(
                "py-1.5 px-2 rounded border text-xs font-medium transition-all",
                length === "10s" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              8-10 sec
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium">Format</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setAspectRatio("16:9")}
              className={cn(
                "py-1.5 px-2 rounded border text-xs font-medium transition-all",
                aspectRatio === "16:9" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              16:9
            </button>
            <button
              onClick={() => setAspectRatio("9:16")}
              className={cn(
                "py-1.5 px-2 rounded border text-xs font-medium transition-all",
                aspectRatio === "9:16" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              9:16
            </button>
          </div>
        </div>
      </div>

      {/* Extra format option */}
      <button
        onClick={() => setExtraFormat(!extraFormat)}
        className={cn(
          "w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between",
          extraFormat ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <div>
          <span className="font-medium text-sm">Add both formats</span>
          <p className="text-xs text-muted-foreground">Get 16:9 + 9:16</p>
        </div>
        <Badge variant="secondary">+1 cr</Badge>
      </button>

      {/* Cost & Generate */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm">Cost:</span>
            <span className="font-bold text-amber-600">{creditCost} credit{creditCost > 1 ? "s" : ""}</span>
          </div>
          <span className="text-sm text-muted-foreground">Balance: {credits ?? 0}</span>
        </div>

        <Button
          onClick={handleGenerateVideo}
          className="w-full"
          disabled={!imageUrl}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Video ({creditCost} Credit{creditCost > 1 ? "s" : ""})
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Powered by Veo 3 & Wan 2.1 • Professional real estate videos
        </p>
      </div>
    </Card>
  );
};
