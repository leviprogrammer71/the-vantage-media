import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoThumbnail } from "./PhotoThumbnail";
import { ChevronRight, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Enhancement {
  id: string;
  original_image_url: string;
  enhanced_image_url: string | null;
  created_at: string;
}

interface RecentPhotosCarouselProps {
  enhancements: Enhancement[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (enhancement: Enhancement) => void;
  className?: string;
}

export function RecentPhotosCarousel({
  enhancements,
  loading,
  selectedId,
  onSelect,
  className,
}: RecentPhotosCarouselProps) {
  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Or pick a recent photo</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (enhancements.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="text-sm font-medium text-muted-foreground">Or pick a recent photo</h3>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-dashed border-border">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No photos yet. Upload one above or{" "}
            <Link to="/generate" className="text-primary hover:underline">
              enhance a photo first
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Or pick a recent photo</h3>
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
          <Link to="/gallery">
            Browse Gallery
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {enhancements.map((enhancement) => (
          <PhotoThumbnail
            key={enhancement.id}
            src={enhancement.enhanced_image_url ?? enhancement.original_image_url}
            alt="Recent photo"
            isSelected={selectedId === enhancement.id}
            hasEnhanced={Boolean(enhancement.enhanced_image_url)}
            onClick={() => onSelect(enhancement)}
          />
        ))}
      </div>
    </div>
  );
}
