import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Loader2, Heart, Eye, AlertCircle, Play } from "lucide-react";
import { motion } from "motion/react";
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

interface GalleryVideoCardProps {
  video: VideoItem;
  onView: (video: VideoItem) => void;
  onDownload: (video: VideoItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  deletingId: string | null;
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

export const GalleryVideoCard = ({
  video,
  onView,
  onDownload,
  onDelete,
  onToggleFavorite,
  deletingId,
}: GalleryVideoCardProps) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  // Convert signed URLs to public URLs
  const publicVideoUrl = useMemo(() => 
    getPublicStorageUrl(video.video_url), 
    [video.video_url]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 hover:border-primary/30" onClick={() => onView(video)}>
        <div className="relative aspect-video bg-muted">
          {publicVideoUrl && !thumbnailError ? (
            <>
              {!thumbnailLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
              )}
              <video
                src={publicVideoUrl}
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${thumbnailLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoadedData={() => setThumbnailLoaded(true)}
                onError={() => setThumbnailError(true)}
                muted
                playsInline
                preload="metadata"
              />
              {/* Play icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2">
              {thumbnailError ? (
                <>
                  <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">Video unavailable</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setThumbnailError(false);
                      setThumbnailLoaded(false);
                    }}
                  >
                    Retry
                  </Button>
                </>
              ) : (
                <Play className="h-12 w-12 text-muted-foreground/50" />
              )}
            </div>
          )}

          {/* Favorite indicator */}
          {video.is_favorite && (
            <div className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm">
              <Heart className="h-4 w-4 text-red-500 fill-current" />
            </div>
          )}

          {/* Duration badge */}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-medium">
            {video.duration}s
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onView(video);
              }}
              className="hover:scale-105 transition-transform"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(video);
              }}
              disabled={!video.video_url}
              className="hover:scale-105 transition-transform"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(video.id, !video.is_favorite);
              }}
              className={`hover:scale-105 transition-transform ${video.is_favorite ? "text-red-500" : "text-white"}`}
            >
              <Heart className={`h-4 w-4 ${video.is_favorite ? "fill-current" : ""}`} />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(video.id);
              }}
              disabled={deletingId === video.id}
              className="hover:scale-105 transition-transform"
            >
              {deletingId === video.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {getMotionLabel(video.motion_style)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(video.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
