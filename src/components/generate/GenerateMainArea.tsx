import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ImageIcon,
  Loader2,
  AlertTriangle,
  Download,
  RefreshCw,
  Bookmark,
  Plus,
  ZoomIn,
  Clock,
  Palette,
  Coins,
  Monitor,
  Check,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnhancementResult } from "@/pages/Generate";
import { ImageCompareSlider } from "./ImageCompareSlider";
import { VideoUpsell } from "./VideoUpsell";

interface GenerateMainAreaProps {
  uploadedImage: string | null;
  isProcessing: boolean;
  progress: number;
  progressMessage: string;
  result: EnhancementResult | null;
  error: string | null;
  onStartNew: () => void;
  onSaveToGallery: () => void;
  onEnhanceAgain: () => void;
  credits: number;
  isMobile?: boolean;
}

export function GenerateMainArea({
  uploadedImage,
  isProcessing,
  progress,
  progressMessage,
  result,
  error,
  onStartNew,
  onSaveToGallery,
  onEnhanceAgain,
  credits,
  isMobile = false,
}: GenerateMainAreaProps) {
  const [viewMode, setViewMode] = useState<"original" | "enhanced" | "compare">(
    "enhanced"
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVideoUpsell, setShowVideoUpsell] = useState(false);

  const handleDownload = async () => {
    if (!result?.enhancedUrl) return;

    try {
      const response = await fetch(result.enhancedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PropertyLens-Enhanced-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleSave = () => {
    onSaveToGallery();
    setIsSaved(true);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  };

  const getPresetLabel = (preset: string) => {
    const labels: Record<string, string> = {
      "bright-clear": "Bright & Clear",
      "natural-light": "Natural Light",
      "high-contrast": "High Contrast",
      "overcast-sunny": "Overcast to Sunny",
      twilight: "Twilight Enhancement",
    };
    return labels[preset] || preset;
  };

  // Empty State - skip on mobile since upload is inline
  if (!uploadedImage && !isProcessing && !result && !error) {
    if (isMobile) return null;
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center p-8 bg-background">
        <ImageIcon className="h-20 w-20 text-muted-foreground/30 mb-6" />
        <h2 className="text-2xl font-bold text-center">
          Upload a Photo to Get Started
        </h2>
        <p className="text-muted-foreground mt-2 text-center">
          Your enhanced property photo will appear here
        </p>
      </div>
    );
  }

  // Processing State
  if (isProcessing) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-8 bg-background",
        isMobile ? "min-h-[300px]" : "h-[calc(100vh-64px)]"
      )}>
        <Loader2 className={cn("text-amber-500 animate-spin mb-6", isMobile ? "h-12 w-12" : "h-16 w-16")} />
        <h2 className={cn("font-semibold mb-4", isMobile ? "text-lg" : "text-xl")}>Enhancing Your Photo...</h2>
        <div className="w-full max-w-xs mb-4">
          <Progress value={progress} className="h-2" />
        </div>
        <p className="text-muted-foreground text-sm">{progressMessage}</p>
        <p className="text-xs text-muted-foreground mt-2">
          30-40 seconds • Don't close this page
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-6 bg-background",
        isMobile ? "min-h-[250px]" : "h-[calc(100vh-64px)] p-8"
      )}>
        <AlertTriangle className={cn("text-destructive mb-4", isMobile ? "h-12 w-12" : "h-16 w-16 mb-6")} />
        <h2 className={cn("font-bold text-destructive mb-4", isMobile ? "text-lg" : "text-xl")}>
          Enhancement Failed
        </h2>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 max-w-md text-center mb-4">
          <p className="text-sm mb-2">Error processing your photo.</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <p className="text-sm mt-2 text-muted-foreground">Credit refunded.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onEnhanceAgain} className="bg-amber-500 hover:bg-amber-600">
            Try Again
          </Button>
          <Button variant="outline" onClick={onStartNew}>
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  // Success State
  if (result) {
    return (
      <div className={cn(
        "flex flex-col bg-background overflow-auto",
        isMobile ? "p-2" : "h-[calc(100vh-64px)] p-4 lg:p-8"
      )}>
        {/* Control Bar */}
        <div className={cn(
          "flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-muted/50 rounded-lg",
          isMobile && "p-2"
        )}>
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as typeof viewMode)}
          >
            <TabsList className={isMobile ? "h-8" : ""}>
              <TabsTrigger value="original" className={isMobile ? "text-xs px-2 h-6" : ""}>Original</TabsTrigger>
              <TabsTrigger value="enhanced" className={isMobile ? "text-xs px-2 h-6" : ""}>Enhanced</TabsTrigger>
              <TabsTrigger value="compare" className={isMobile ? "text-xs px-2 h-6" : ""}>Compare</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-1">
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(true)}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleDownload} className={isMobile ? "h-8 w-8" : ""}>
              <Download className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </Button>
          </div>
        </div>

        {/* Image Display */}
        <div className={cn(
          "flex-1 flex items-center justify-center min-h-0 mb-4",
          isMobile && "min-h-[200px]"
        )}>
          {viewMode === "original" && (
            <img
              src={result.originalUrl}
              alt="Original property photo"
              className={cn(
                "max-w-full object-contain rounded-lg shadow-xl",
                isMobile ? "max-h-[250px]" : "max-h-[calc(100vh-350px)]"
              )}
            />
          )}
          {viewMode === "enhanced" && (
            <img
              src={result.enhancedUrl}
              alt="Enhanced property photo"
              className={cn(
                "max-w-full object-contain rounded-lg shadow-xl border-2 border-amber-500/20",
                isMobile ? "max-h-[250px]" : "max-h-[calc(100vh-350px)]"
              )}
            />
          )}
          {viewMode === "compare" && (
            <div className="w-full max-w-4xl">
              <ImageCompareSlider
                beforeImage={result.originalUrl}
                afterImage={result.enhancedUrl}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={cn(
          "flex flex-wrap gap-2 justify-center mb-4",
          isMobile && "gap-1.5"
        )}>
          <Button
            size={isMobile ? "sm" : "lg"}
            className="bg-amber-500 hover:bg-amber-600"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </Button>

          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={onEnhanceAgain}
            disabled={credits < 1}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Again
          </Button>

          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={handleSave}
            disabled={isSaved}
          >
            {isSaved ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-1.5" />
                Save
              </>
            )}
          </Button>

          <Button variant="ghost" size={isMobile ? "sm" : "default"} onClick={onStartNew}>
            <Plus className="h-4 w-4 mr-1.5" />
            New
          </Button>

          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "default"} 
            onClick={() => setShowVideoUpsell(!showVideoUpsell)}
            className="border-primary/30 text-primary hover:bg-primary/5"
          >
            <Video className="h-4 w-4 mr-1.5" />
            Video
          </Button>
        </div>

        {/* Video Upsell */}
        {showVideoUpsell && result && (
          <div className="mb-4">
            <VideoUpsell 
              enhancedImageUrl={result.enhancedUrl} 
              credits={credits}
              onClose={() => setShowVideoUpsell(false)} 
            />
          </div>
        )}

        {/* Technical Details - hide on mobile */}
        {!isMobile && (
          <div className="flex flex-wrap gap-4 justify-center items-center p-4 bg-muted/30 rounded-md text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Enhanced: {formatTimeAgo(result.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Palette className="h-3.5 w-3.5" />
              <span>Preset: {getPresetLabel(result.preset)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />
              <span>Credits used: 1</span>
            </div>
            <div className="flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5" />
              <span>High Resolution</span>
            </div>
          </div>
        )}

        {/* Fullscreen Modal - desktop only */}
        {!isMobile && isFullscreen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setIsFullscreen(false)}
            >
              <span className="sr-only">Close</span>
              ×
            </Button>
            <img
              src={viewMode === "original" ? result.originalUrl : result.enhancedUrl}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  // Fallback - show uploaded image preview while waiting
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center p-8 bg-background">
      <img
        src={uploadedImage!}
        alt="Uploaded preview"
        className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
      />
      <p className="text-muted-foreground mt-4">
        Ready to enhance. Click "Enhance Photo" to begin.
      </p>
    </div>
  );
}
