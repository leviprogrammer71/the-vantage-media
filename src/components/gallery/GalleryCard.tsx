import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Image, Loader2, Heart, Eye, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
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

interface GalleryCardProps {
  enhancement: Enhancement;
  onView: (enhancement: Enhancement) => void;
  onDownload: (enhancement: Enhancement) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  deletingId: string | null;
  getPresetLabel: (preset: string) => string;
}

export const GalleryCard = ({
  enhancement,
  onView,
  onDownload,
  onDelete,
  onToggleFavorite,
  deletingId,
  getPresetLabel,
}: GalleryCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Convert signed URLs to public URLs
  const publicEnhancedUrl = useMemo(() => 
    getPublicStorageUrl(enhancement.enhanced_image_url), 
    [enhancement.enhanced_image_url]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 hover:border-primary/30" onClick={() => onView(enhancement)}>
        <div className="relative aspect-[3/2] bg-muted">
          {publicEnhancedUrl && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
              )}
              <img
                src={publicEnhancedUrl}
                alt="Enhanced photo"
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2">
              {imageError ? (
                <>
                  <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">Image unavailable</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageError(false);
                      setImageLoaded(false);
                    }}
                  >
                    Retry
                  </Button>
                </>
              ) : (
                <Image className="h-12 w-12 text-muted-foreground/50" />
              )}
            </div>
          )}

          {/* Favorite indicator */}
          {enhancement.is_favorite && (
            <div className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm">
              <Heart className="h-4 w-4 text-red-500 fill-current" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onView(enhancement);
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
                onDownload(enhancement);
              }}
              disabled={!enhancement.enhanced_image_url}
              className="hover:scale-105 transition-transform"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(enhancement.id, !enhancement.is_favorite);
              }}
              className={`hover:scale-105 transition-transform ${enhancement.is_favorite ? "text-red-500" : "text-white"}`}
            >
              <Heart className={`h-4 w-4 ${enhancement.is_favorite ? "fill-current" : ""}`} />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(enhancement.id);
              }}
              disabled={deletingId === enhancement.id}
              className="hover:scale-105 transition-transform"
            >
              {deletingId === enhancement.id ? (
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
              {getPresetLabel(enhancement.preset_used)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(enhancement.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
