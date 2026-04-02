import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Upload,
  X,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Cloud,
  Trees,
  Info,
  AlertCircle,
  Loader2,
  RotateCcw,
  Home,
  Building2,
  Lightbulb,
  Palette,
  Eraser,
  Square,
  Sofa,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PresetType, PhotoCategory } from "@/pages/Generate";

interface GenerateSidebarProps {
  uploadedImage: string | null;
  uploadedFile: File | null;
  selectedPreset: PresetType;
  credits: number;
  isProcessing: boolean;
  onUpload: (file: File) => void;
  onRemoveImage: () => void;
  onPresetChange: (preset: PresetType) => void;
  onEnhance: () => void;
  onReset: () => void;
  onClose?: () => void;
  isMobile?: boolean;
  photoCategory: PhotoCategory;
  onCategoryChange: (category: PhotoCategory) => void;
}

const exteriorPresets = [
  {
    value: "clarity-boost" as PresetType,
    icon: Sparkles,
    iconColor: "text-purple-500",
    name: "✨ Quality Enhancement",
    description: "Improve overall quality, sharpness, and lighting realism",
    badge: { label: "Default", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  },
  {
    value: "sky-replacement" as PresetType,
    icon: Sun,
    iconColor: "text-blue-500",
    name: "☀️ Sunny Skies",
    description: "Change to sunny day with clear blue sky and bright daylight",
    badge: { label: "Most Popular", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  },
  {
    value: "day-to-dusk" as PresetType,
    icon: Sunset,
    iconColor: "text-orange-500",
    name: "🌇 Twilight Conversion",
    description: "Transform to warm twilight with glowing interior lights",
    badge: { label: "Premium", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  },
  {
    value: "lawn-enhancement" as PresetType,
    icon: Trees,
    iconColor: "text-green-500",
    name: "🌿 Curb Appeal",
    description: "Fresh green manicured lawn and improved landscaping",
    badge: { label: "Curb Appeal", className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  },
  {
    value: "declutter" as PresetType,
    icon: Eraser,
    iconColor: "text-rose-500",
    name: "🧹 Object Removal",
    description: "Remove cars, trash bins, and unwanted objects",
    badge: { label: "Clean Up", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" },
  },
];

const interiorPresets = [
  {
    value: "listing-ready" as PresetType,
    icon: Sparkles,
    iconColor: "text-amber-500",
    name: "✨ Quality Enhancement",
    description: "Improve brightness, sharpness, and lighting balance",
    badge: { label: "Default", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  },
  {
    value: "interior-declutter" as PresetType,
    icon: Eraser,
    iconColor: "text-rose-500",
    name: "🧹 Clutter Removal",
    description: "Remove personal items, toys, and clutter for clean look",
    badge: { label: "Clean Up", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" },
  },
  {
    value: "virtual-staging" as PresetType,
    icon: Sofa,
    iconColor: "text-emerald-500",
    name: "🛋️ Virtual Staging",
    description: "Add modern, tasteful furniture to empty rooms",
    badge: { label: "Staging", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
  },
  {
    value: "color-update" as PresetType,
    icon: Palette,
    iconColor: "text-violet-500",
    name: "🎨 Modern Color Update",
    description: "Repaint walls to neutral, modern palette",
    badge: { label: "Refresh", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
  },
  {
    value: "flooring-upgrade" as PresetType,
    icon: Square,
    iconColor: "text-amber-600",
    name: "🪵 Flooring Upgrade",
    description: "Replace flooring with light oak hardwood",
    badge: { label: "Upgrade", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  },
  {
    value: "window-fix" as PresetType,
    icon: Square,
    iconColor: "text-blue-500",
    name: "🪟 Window Exposure Fix",
    description: "Balance interior and window exposure professionally",
    badge: { label: "HDR Fix", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  },
  {
    value: "lighting-boost" as PresetType,
    icon: Lightbulb,
    iconColor: "text-yellow-500",
    name: "💡 Lighting Boost",
    description: "Simulate bright natural daylight throughout",
    badge: { label: "Bright", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" },
  },
  {
    value: "warm-inviting" as PresetType,
    icon: Sunset,
    iconColor: "text-orange-500",
    name: "🔥 Warm & Inviting",
    description: "Cozy warm tones with soft evening lighting",
    badge: { label: "Cozy", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  },
];

export function GenerateSidebar({
  uploadedImage,
  uploadedFile,
  selectedPreset,
  credits,
  isProcessing,
  onUpload,
  onRemoveImage,
  onPresetChange,
  onEnhance,
  onReset,
  onClose,
  isMobile,
  photoCategory,
  onCategoryChange,
}: GenerateSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const enhanceCost = 10;
  const creditsAfter = credits - enhanceCost;
  const hasInsufficientCredits = credits < enhanceCost;
  const presets = photoCategory === "exterior" ? exteriorPresets : interiorPresets;

  return (
    <div
      className={cn(
        "h-[calc(100vh-64px)] bg-muted/30 border-r border-border/50 overflow-y-auto",
        isMobile && "pt-4"
      )}
    >
      <div className="p-6 space-y-6">
        {/* Mobile Close Button */}
        {isMobile && onClose && (
          <div className="flex justify-end -mt-2 -mr-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Section 1: Upload Zone */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.heic"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onClick={() => !uploadedImage && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 min-h-[200px] cursor-pointer transition-all flex flex-col items-center justify-center",
              isDragging
                ? "border-amber-400 bg-amber-50 dark:bg-amber-900/10"
                : uploadedImage
                ? "border-border bg-background"
                : "border-muted-foreground/30 bg-background hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
            )}
          >
            {uploadedImage ? (
              <div className="relative w-full group">
                <img
                  src={uploadedImage}
                  alt="Uploaded property"
                  className="w-full max-h-[200px] object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Change Photo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:text-red-400 hover:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage();
                    }}
                  >
                    Remove
                  </Button>
                </div>
                {uploadedFile && (
                  <div className="mt-3 text-center">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Upload Property Photo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click to browse or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG, HEIC (max 10MB)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Section 2: Category Toggle */}
        <div>
          <h3 className="text-base font-semibold mb-3">Photo Type</h3>
          <div className="flex rounded-lg border border-border bg-muted/50 p-1">
            <button
              onClick={() => onCategoryChange("exterior")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all",
                photoCategory === "exterior"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Home className="h-4 w-4" />
              Exterior
            </button>
            <button
              onClick={() => onCategoryChange("interior")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all",
                photoCategory === "interior"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="h-4 w-4" />
              Interior
            </button>
          </div>
        </div>

        {/* Section 3: Enhancement Preset */}
        <div>
          <h3 className="text-base font-semibold mb-3">Enhancement Style</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {presets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset === preset.value;

              return (
                <button
                  key={preset.value}
                  onClick={() => onPresetChange(preset.value)}
                  className={cn(
                    "w-full border-2 rounded-lg p-4 text-left transition-all flex items-start gap-3",
                    isSelected
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10 shadow-sm"
                      : "border-border hover:border-amber-300 bg-background"
                  )}
                >
                  <Icon className={cn("h-6 w-6 mt-0.5 flex-shrink-0", preset.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{preset.name}</span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          preset.badge.className
                        )}
                      >
                        {preset.badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {preset.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Cost Display */}
        <div
          className={cn(
            "rounded-lg p-4 flex items-center gap-3 border",
            hasInsufficientCredits
              ? "bg-destructive/10 border-destructive/30"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          )}
        >
          {hasInsufficientCredits ? (
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            {hasInsufficientCredits ? (
              <>
                <p className="text-sm font-medium text-destructive">
                  Insufficient credits!
                </p>
                <p className="text-xs text-muted-foreground">
                  Purchase credits to continue
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This enhancement will cost:
                </p>
                <p className="text-lg font-bold text-amber-600">{enhanceCost} credits</p>
                <p className="text-xs text-muted-foreground">
                  Your balance after: {creditsAfter} credits
                </p>
              </>
            )}
          </div>
        </div>

        {/* Section 5: Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            size="lg"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            disabled={!uploadedImage || hasInsufficientCredits || isProcessing}
            onClick={onEnhance}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Enhance Photo
              </>
            )}
          </Button>

          {isProcessing && (
            <p className="text-xs text-center text-muted-foreground">
              Processing... 30-45 seconds
            </p>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={onReset}
            disabled={isProcessing}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
