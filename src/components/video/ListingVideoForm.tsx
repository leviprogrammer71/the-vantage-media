import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCredits } from "@/hooks/useUserCredits";
import { supabase } from "@/integrations/supabase/client";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload,
  Loader2,
  Download,
  Check,
  Coins,
  X,
  Sparkles,
  RefreshCw,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

type SceneType = "exterior" | "interior";
type MotionStyle = "slow_push" | "drone_overview" | "curbside_pan" | "twilight_orbit";
type Duration = "5s" | "10s";
type Format = "MLS" | "Reels";

const MOTION_STYLES = [
  { id: "slow_push" as const, label: "Slow Push" },
  { id: "drone_overview" as const, label: "Drone Overview" },
  { id: "curbside_pan" as const, label: "Curbside Pan" },
  { id: "twilight_orbit" as const, label: "Twilight Orbit" },
];

export function ListingVideoForm() {
  const { user } = useAuth();
  const { credits, fetchCredits, deductCredits } = useUserCredits();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sceneType, setSceneType] = useState<SceneType>("exterior");
  const [motionStyle, setMotionStyle] = useState<MotionStyle>("slow_push");
  const [duration, setDuration] = useState<Duration>("5s");
  const [format, setFormat] = useState<Format>("Reels");

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const creditCost = duration === "10s" ? 30 : 20;
  const hasEnoughCredits = credits !== null && credits >= creditCost;

  const handleFileSelect = async (file: File) => {
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
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
    setImageFile(file);

    setIsUploading(true);
    try {
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

      setImageUrl(urlData.signedUrl);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error("Failed to upload photo");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!imageUrl || !user) return;

    if (!hasEnoughCredits) {
      setShowCreditsModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(10);

    try {
      // Upload source photo to project-submissions and create submission row
      const timestamp = Date.now();
      let sourceStoragePath: string | undefined;

      if (imageFile) {
        const sourcePath = `${user.id}/${timestamp}/after/${imageFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("project-submissions")
          .upload(sourcePath, imageFile, { upsert: true });
        if (!uploadErr) sourceStoragePath = sourcePath;
      }

      // Create submission row
      const { data: submission, error: insertError } = await (supabase.from("submissions") as any)
        .insert({
          user_id: user.id,
          full_name: user.email || "",
          email: user.email || "",
          business_name: "Self",
          project_description: `Listing video (${sceneType}, ${motionStyle})`,
          transformation_type: sceneType,
          build_type: "team_build",
          video_style: motionStyle,
          after_photo_paths: sourceStoragePath ? [sourceStoragePath] : [],
          status: "received",
          prompt_status: "pending",
          video_type: "listing",
        })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to create submission: ${insertError.message}`);

      const { data, error: invokeError } = await supabase.functions.invoke(
        "generate-listing-video",
        {
          body: {
            image_url: imageUrl,
            scene_type: sceneType,
            motion_style: motionStyle,
            format,
            duration: duration === "5s" ? "5" : "10",
            submission_id: submission.id,
          },
        }
      );

      if (invokeError) throw new Error(invokeError.message);
      if (!data?.video_url) throw new Error("Video generation failed");

      setProgress(100);
      setVideoUrl(data.video_url);

      await deductCredits(creditCost, `Listing video (${sceneType}, ${duration})`);
      fetchCredits();
      toast.success("Listing video ready!");
    } catch (err) {
      console.error("Listing video error:", err);
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
        <Progress value={progress} className="h-2" />
        {image && (
          <img src={image} alt="Source" className="max-h-32 rounded-lg opacity-75 mx-auto" />
        )}
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
    <div className="space-y-5">
      {/* Upload */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider">Upload Photo</label>
        <p className="text-xs text-muted-foreground">Upload a clean, well-lit photo of the room or property exterior.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />
        {image ? (
          <div className="relative">
            <img src={image} alt="Property" className="w-full rounded-lg object-cover max-h-64" />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={() => { setImage(null); setImageUrl(null); setImageFile(null); }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center justify-center hover:border-primary/50 transition-colors"
          >
            <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold">Upload a photo</h3>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP (max 10MB)</p>
          </button>
        )}
      </div>

      {/* Settings */}
      <Card className="p-4 space-y-4">
        {/* Scene Type */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider">Scene Type</label>
          <div className="flex gap-2">
            {(["exterior", "interior"] as SceneType[]).map((s) => (
              <button
                key={s}
                onClick={() => setSceneType(s)}
                className={cn(
                  "flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all",
                  sceneType === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {s === "exterior" ? "🏠 Exterior" : "🛋️ Interior"}
              </button>
            ))}
          </div>
        </div>

        {/* Motion Style */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider">Motion Style</label>
          <div className="flex flex-wrap gap-2">
            {MOTION_STYLES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMotionStyle(m.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  motionStyle === m.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 border-border hover:border-primary/50"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider">Duration</label>
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
        </div>

        {/* Format */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider">Format</label>
          <div className="flex gap-2">
            {(["MLS", "Reels"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                  format === f
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {f === "MLS" ? "MLS (16:9)" : "Reels (9:16)"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border p-4 pb-safe">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coins className={cn("h-5 w-5", hasEnoughCredits ? "text-amber-500" : "text-destructive")} />
            <span className={cn(
              "font-bold text-lg leading-tight",
              hasEnoughCredits ? "text-amber-600 dark:text-amber-400" : "text-destructive"
            )}>
              {creditCost} credits
            </span>
          </div>

          {!hasEnoughCredits && credits !== null ? (
            <Button asChild className="h-12 px-6 text-base">
              <Link to="/pricing">Get Credits</Link>
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={!imageUrl}
              className="h-12 px-6 text-base gap-2"
            >
              <Sparkles className="h-5 w-5" />
              Generate Listing Video
            </Button>
          )}
        </div>
      </div>

      <InsufficientCreditsModal
        open={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        required={creditCost}
        available={credits ?? 0}
      />
    </div>
  );
}
