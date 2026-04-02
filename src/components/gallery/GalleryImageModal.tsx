import { useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Heart, HeartOff, Loader2, AlertCircle } from "lucide-react";
import { ImageCompareSlider } from "@/components/generate/ImageCompareSlider";
import { motion, AnimatePresence } from "motion/react";
import { getPublicStorageUrl } from "@/lib/storage-utils";

interface Enhancement {
  id: string;
  original_image_url: string;
  enhanced_image_url: string | null;
  preset_used: string;
  credits_used: number;
  created_at: string;
  status: string;
  is_favorite?: boolean;
}

interface GalleryImageModalProps {
  enhancement: Enhancement | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onDownload: (enhancement: Enhancement) => void;
  getPresetLabel: (preset: string) => string;
}

export const GalleryImageModal = ({
  enhancement,
  isOpen,
  onClose,
  onToggleFavorite,
  onDownload,
  getPresetLabel,
}: GalleryImageModalProps) => {
  const [viewMode, setViewMode] = useState<"original" | "enhanced" | "compare">("compare");
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Convert signed URLs to public URLs
  const publicOriginalUrl = useMemo(() => 
    getPublicStorageUrl(enhancement?.original_image_url || null), 
    [enhancement?.original_image_url]
  );
  const publicEnhancedUrl = useMemo(() => 
    getPublicStorageUrl(enhancement?.enhanced_image_url || null), 
    [enhancement?.enhanced_image_url]
  );

  if (!enhancement) return null;

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                {getPresetLabel(enhancement.preset_used)}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(enhancement.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                {["original", "enhanced", "compare"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setViewMode(mode as typeof viewMode);
                      setImageLoading(true);
                      setImageError(false);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      viewMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite(enhancement.id, !enhancement.is_favorite)}
                className={`transition-colors ${enhancement.is_favorite ? "text-red-500" : "text-muted-foreground"}`}
              >
                {enhancement.is_favorite ? (
                  <Heart className="h-5 w-5 fill-current" />
                ) : (
                  <HeartOff className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(enhancement)}
                disabled={!enhancement.enhanced_image_url}
                className="hover:scale-105 transition-transform"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>

              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 flex items-center justify-center p-4 bg-muted/30 overflow-hidden">
            <AnimatePresence mode="wait">
              {viewMode === "compare" && publicEnhancedUrl && publicOriginalUrl ? (
                <motion.div 
                  key="compare"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full max-w-5xl"
                >
                  <ImageCompareSlider
                    beforeImage={publicOriginalUrl}
                    afterImage={publicEnhancedUrl}
                    className="w-full h-full rounded-lg"
                  />
                </motion.div>
              ) : (
                <motion.div 
                  key={viewMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative max-w-full max-h-full"
                >
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </div>
                  )}
                  {imageError ? (
                    <div className="flex flex-col items-center justify-center gap-4 p-8">
                      <AlertCircle className="h-16 w-16 text-muted-foreground" />
                      <p className="text-muted-foreground">Failed to load image</p>
                    </div>
                  ) : (
                    <img
                      src={
                        viewMode === "original"
                          ? publicOriginalUrl || ""
                          : publicEnhancedUrl || publicOriginalUrl || ""
                      }
                      alt={viewMode === "original" ? "Original photo" : "Enhanced photo"}
                      className={`max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
