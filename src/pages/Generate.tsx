import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GenerateTopNav } from "@/components/generate/GenerateTopNav";
import { GenerateSidebar } from "@/components/generate/GenerateSidebar";
import { GenerateMainArea } from "@/components/generate/GenerateMainArea";
import { HistorySidebar } from "@/components/generate/HistorySidebar";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Upload,
  Home,
  Building2,
  Sparkles,
  Loader2,
  Sun,
  Sunset,
  Moon,
  Cloud,
  Trees,
  Lightbulb,
  Palette,
  Eraser,
  Square,
  Sofa,
} from "lucide-react";
export interface EnhancementResult {
  originalUrl: string;
  enhancedUrl: string;
  preset: string;
  createdAt: Date;
  enhancementId: string;
}

export type PresetType =
  // Exterior presets
  | "clarity-boost"
  | "sky-replacement"
  | "day-to-dusk"
  | "lawn-enhancement"
  | "declutter"
  // Interior presets
  | "listing-ready"
  | "interior-declutter"
  | "virtual-staging"
  | "color-update"
  | "flooring-upgrade"
  | "window-fix"
  | "lighting-boost"
  | "warm-inviting";

export type PhotoCategory = "exterior" | "interior";

export default function Generate() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { credits, fetchCredits } = useCredits();
  const { toast } = useToast();

  // Check if we're enhancing for video flow
  const enhanceForVideoId = searchParams.get("enhanceForVideo");

  // State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetType>("sky-replacement");
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>("exterior");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  // Mobile presets based on category
  const mobilePresets = photoCategory === "exterior" 
    ? [
        { value: "clarity-boost" as PresetType, icon: Sparkles, iconColor: "text-purple-500", name: "Quality Boost", badge: { label: "Default", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" } },
        { value: "sky-replacement" as PresetType, icon: Cloud, iconColor: "text-blue-500", name: "Sunny Skies", badge: { label: "Popular", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" } },
        { value: "day-to-dusk" as PresetType, icon: Sunset, iconColor: "text-orange-500", name: "Twilight", badge: { label: "Premium", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" } },
        { value: "lawn-enhancement" as PresetType, icon: Trees, iconColor: "text-green-500", name: "Curb Appeal", badge: { label: "Green", className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" } },
        { value: "declutter" as PresetType, icon: Eraser, iconColor: "text-rose-500", name: "Remove Objects", badge: { label: "Clean", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" } },
      ]
    : [
        { value: "listing-ready" as PresetType, icon: Sparkles, iconColor: "text-amber-500", name: "Quality Boost", badge: { label: "Default", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" } },
        { value: "interior-declutter" as PresetType, icon: Eraser, iconColor: "text-rose-500", name: "Declutter", badge: { label: "Clean", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" } },
        { value: "virtual-staging" as PresetType, icon: Sofa, iconColor: "text-emerald-500", name: "Virtual Stage", badge: { label: "Staging", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" } },
        { value: "window-fix" as PresetType, icon: Square, iconColor: "text-blue-500", name: "Window Fix", badge: { label: "HDR", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" } },
        { value: "lighting-boost" as PresetType, icon: Lightbulb, iconColor: "text-yellow-500", name: "Light Boost", badge: { label: "Bright", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" } },
        { value: "warm-inviting" as PresetType, icon: Sunset, iconColor: "text-orange-500", name: "Warm", badge: { label: "Cozy", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" } },
      ];
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/generate");
    }
  }, [user, authLoading, navigate]);

  const handleUpload = async (file: File) => {
    if (!user) return;

    // Validate file type - only allow safe image formats
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp'];
    
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const hasValidExtension = allowedExtensions.includes(fileExtension);
    
    // For mobile uploads, MIME type may be empty - rely on extension in that case
    const hasValidType = file.type ? allowedTypes.includes(file.type.toLowerCase()) : hasValidExtension;
    
    if (!hasValidType || !hasValidExtension) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, HEIC, or WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10485760) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);

    // Create local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setResult(null);
    setError(null);
  };

  const handleEnhance = async () => {
    if (!uploadedFile || !user || credits < 1) return;

    setIsProcessing(true);
    setProgress(5);
    setProgressMessage("Uploading image...");
    setError(null);

    try {
      // Upload to Supabase Storage
      const timestamp = Date.now();
      const fileExt = uploadedFile.name.split(".").pop();
      const filePath = `${user.id}/${timestamp}-original.${fileExt}`;

      setProgress(15);
      setProgressMessage("Uploading to storage...");

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("property-photos")
        .upload(filePath, uploadedFile);

      if (uploadError) {
        throw new Error("Failed to upload image: " + uploadError.message);
      }

      // Get signed URL for secure access (24-hour expiry)
      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from("property-photos")
        .createSignedUrl(filePath, 86400); // 24 hours

      if (signedUrlError || !urlData?.signedUrl) {
        throw new Error("Failed to generate secure URL: " + (signedUrlError?.message || "Unknown error"));
      }

      const imageUrl = urlData.signedUrl;

      setProgress(30);
      setProgressMessage("Starting AI enhancement...");

      // Call enhance API - Nano Banana returns result directly (no polling needed)
      const response = await supabase.functions.invoke("enhance-photo", {
        body: {
          imageUrl,
          preset: selectedPreset,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to start enhancement");
      }

      setProgress(70);
      setProgressMessage("AI processing image...");

      const { status, enhancementId, imageUrl: enhancedUrl, newCreditsBalance, error: responseError } = response.data;

      // Update credits display
      fetchCredits();

      if (status === "completed" && enhancedUrl) {
        setProgress(100);
        setProgressMessage("Enhancement complete!");

        setResult({
          originalUrl: imageUrl,
          enhancedUrl,
          preset: selectedPreset,
          createdAt: new Date(),
          enhancementId,
        });

        toast({
          title: "Enhancement complete!",
          description: "Your property photo has been enhanced successfully.",
        });

        // If we came from video flow, redirect back with the enhanced image
        if (enhanceForVideoId) {
          setTimeout(() => {
            navigate(`/video?returnFromEnhance=${enhancementId}`);
          }, 1500);
        }
      } else if (responseError) {
        throw new Error(responseError);
      } else {
        throw new Error("Enhancement failed - no result returned");
      }
    } catch (err) {
      console.error("Enhancement error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      toast({
        title: "Enhancement failed",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      fetchCredits(); // Refresh in case credit was refunded
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedPreset(photoCategory === "exterior" ? "sky-replacement" : "listing-ready");
    toast({
      title: "Settings reset",
      description: "Preset has been reset to default.",
    });
  };

  const handleCategoryChange = (category: PhotoCategory) => {
    setPhotoCategory(category);
    setSelectedPreset(category === "exterior" ? "sky-replacement" : "listing-ready");
  };

  const handleStartNew = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressMessage("");
  };

  const handleSaveToGallery = async () => {
    if (!result?.enhancementId) return;

    try {
      const { error } = await supabase
        .from("enhancements")
        .update({ saved_to_gallery: true })
        .eq("id", result.enhancementId);

      if (error) throw error;

      toast({
        title: "Saved to gallery",
        description: "Your enhancement has been saved to your gallery.",
      });
    } catch (err) {
      toast({
        title: "Failed to save",
        description: "Could not save to gallery. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLoadFromHistory = (enhancement: {
    original_image_url: string;
    enhanced_image_url: string;
    preset_used: string;
    created_at: string;
    id: string;
  }) => {
    setResult({
      originalUrl: enhancement.original_image_url,
      enhancedUrl: enhancement.enhanced_image_url,
      preset: enhancement.preset_used,
      createdAt: new Date(enhancement.created_at),
      enhancementId: enhancement.id,
    });
    setIsHistoryOpen(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <GenerateTopNav
        credits={credits}
        onMenuClick={() => setIsMobileSidebarOpen(true)}
      />

      {/* Mobile Layout - Single Column Stacked */}
      <div className="lg:hidden pt-16 pb-8">
        <div className="px-4 space-y-6">
          {/* Mobile Upload & Controls */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-4">
            {/* Upload Zone */}
            <input
              ref={mobileFileInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.heic,.heif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="hidden"
            />
            <div
              onClick={() => !uploadedImage && mobileFileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[150px]",
                uploadedImage
                  ? "border-border bg-background"
                  : "border-muted-foreground/30 bg-background hover:border-amber-400"
              )}
            >
              {uploadedImage ? (
                <div className="relative w-full">
                  <img
                    src={uploadedImage}
                    alt="Uploaded property"
                    className="w-full max-h-[200px] object-cover rounded-lg"
                  />
                  <div className="flex gap-2 mt-3 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        mobileFileInputRef.current?.click();
                      }}
                    >
                      Change
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <h3 className="text-base font-semibold">Upload Property Photo</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tap to select • JPG, PNG, HEIC (max 10MB)
                  </p>
                </>
              )}
            </div>

            {/* Photo Type Toggle */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Photo Type</h3>
              <div className="flex rounded-lg border border-border bg-muted/50 p-1">
                <button
                  onClick={() => handleCategoryChange("exterior")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                    photoCategory === "exterior"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  <Home className="h-4 w-4" />
                  Exterior
                </button>
                <button
                  onClick={() => handleCategoryChange("interior")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                    photoCategory === "interior"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Interior
                </button>
              </div>
            </div>

            {/* Preset Selector */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Enhancement Style</h3>
              <div className="grid grid-cols-2 gap-2">
                {mobilePresets.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = selectedPreset === preset.value;
                  return (
                    <button
                      key={preset.value}
                      onClick={() => setSelectedPreset(preset.value)}
                      className={cn(
                        "border-2 rounded-lg p-3 text-left transition-all",
                        isSelected
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
                          : "border-border bg-background"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("h-4 w-4", preset.iconColor)} />
                        <span className="text-xs font-semibold truncate">{preset.name}</span>
                      </div>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded", preset.badge.className)}>
                        {preset.badge.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credits & Enhance Button */}
            <div className="space-y-3">
              <div className={cn(
                "rounded-lg p-3 border text-sm",
                credits < 1
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">This will use</span>
                    <span className="font-bold text-amber-600">1 credit</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Balance: </span>
                    <span className={cn("font-semibold", credits < 1 && "text-destructive")}>
                      {credits}
                    </span>
                  </div>
                </div>
                {credits < 1 && (
                  <p className="text-xs text-destructive mt-2 font-medium">
                    Insufficient credits! Add more to continue.
                  </p>
                )}
              </div>
              <Button
                size="lg"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                disabled={!uploadedImage || credits < 1 || isProcessing}
                onClick={handleEnhance}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Enhance Photo (1 Credit)
                  </>
                )}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                MLS-ready enhancement with realistic results
              </p>
            </div>
          </div>

          {/* Mobile Result Area */}
          {(isProcessing || result || error) && (
            <div className="bg-muted/30 rounded-xl p-4">
              <GenerateMainArea
                uploadedImage={uploadedImage}
                isProcessing={isProcessing}
                progress={progress}
                progressMessage={progressMessage}
                result={result}
                error={error}
                onStartNew={handleStartNew}
                onSaveToGallery={handleSaveToGallery}
                onEnhanceAgain={handleEnhance}
                credits={credits}
                isMobile
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout - Side by Side */}
      <div className="hidden lg:flex pt-16">
        {/* Desktop Sidebar */}
        <div className="w-[420px] flex-shrink-0">
          <GenerateSidebar
            uploadedImage={uploadedImage}
            uploadedFile={uploadedFile}
            selectedPreset={selectedPreset}
            credits={credits}
            isProcessing={isProcessing}
            onUpload={handleUpload}
            onRemoveImage={handleRemoveImage}
            onPresetChange={setSelectedPreset}
            onEnhance={handleEnhance}
            onReset={handleReset}
            photoCategory={photoCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* Main Area */}
        <div className="flex-1 min-w-0">
          <GenerateMainArea
            uploadedImage={uploadedImage}
            isProcessing={isProcessing}
            progress={progress}
            progressMessage={progressMessage}
            result={result}
            error={error}
            onStartNew={handleStartNew}
            onSaveToGallery={handleSaveToGallery}
            onEnhanceAgain={handleEnhance}
            credits={credits}
          />
        </div>

        {/* History Sidebar */}
        <HistorySidebar
          isOpen={isHistoryOpen}
          onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
          onLoadEnhancement={handleLoadFromHistory}
        />
      </div>
    </div>
  );
}
