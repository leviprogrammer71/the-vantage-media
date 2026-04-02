import { useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Heart, HeartOff, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getPublicStorageUrl } from "@/lib/storage-utils";

interface VideoItem {
  id: string;
  source_image_url: string;
  video_url: string | null;
  motion_style: string;
  quality: string;
  aspect_ratio: string;
  duration: number;
  credits_used: number;
  created_at: string;
  is_favorite?: boolean;
}

interface GalleryVideoModalProps {
  video: VideoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onDownload: (video: VideoItem) => void;
}

const getMotionLabel = (motion: string): string => {
  const labels: Record<string, string> = {
    slow_push: "Push-in",
    parallax: "Parallax",
    zoom_out: "Zoom Out",
    static_ambient: "Ambient",
    drone_overview: "Drone Overview",
    curbside_pan: "Curbside Pan",
    twilight_orbit: "Twilight Orbit",
    front_door_reveal: "Door Reveal",
    yard_360: "360° Yard",
    kitchen_walkthrough: "Kitchen Tour",
    living_room_pan: "Living Room Pan",
    cozy_evening: "Cozy Evening",
    bedroom_showcase: "Bedroom",
    open_concept_flow: "Open Concept",
  };
  return labels[motion] || motion.replace(/_/g, " ");
};

export const GalleryVideoModal = ({
  video,
  isOpen,
  onClose,
  onToggleFavorite,
  onDownload,
}: GalleryVideoModalProps) => {
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Convert signed URLs to public URLs
  const publicVideoUrl = useMemo(() => 
    getPublicStorageUrl(video?.video_url || null), 
    [video?.video_url]
  );

  if (!video) return null;

  const handleVideoLoad = () => {
    setVideoLoading(false);
    setVideoError(false);
  };

  const handleVideoError = () => {
    setVideoLoading(false);
    setVideoError(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden">
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
                {getMotionLabel(video.motion_style)}
              </span>
              <span className="text-sm text-muted-foreground">
                {video.duration}s • {video.aspect_ratio}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(video.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite(video.id, !video.is_favorite)}
                className={`transition-colors ${video.is_favorite ? "text-red-500" : "text-muted-foreground"}`}
              >
                {video.is_favorite ? (
                  <Heart className="h-5 w-5 fill-current" />
                ) : (
                  <HeartOff className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(video)}
                disabled={!video.video_url}
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

          {/* Video area */}
          <div className="flex-1 flex items-center justify-center p-4 bg-black overflow-hidden">
            <AnimatePresence mode="wait">
              {videoError ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-4 p-8"
                >
                  <AlertCircle className="h-16 w-16 text-muted-foreground" />
                  <p className="text-muted-foreground">Failed to load video</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="video"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  {videoLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-white animate-spin" />
                    </div>
                  )}
                  <video
                    src={publicVideoUrl || ""}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className={`max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300 ${videoLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoadedData={handleVideoLoad}
                    onError={handleVideoError}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
