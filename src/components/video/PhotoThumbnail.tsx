import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ImageOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoThumbnailProps {
  src: string;
  alt?: string;
  isSelected?: boolean;
  hasEnhanced?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PhotoThumbnail({
  src,
  alt = "Photo",
  isSelected = false,
  hasEnhanced = false,
  onClick,
  className,
}: PhotoThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    if (retryCount < 2) {
      // Retry with cache-busting
      setRetryCount((prev) => prev + 1);
    } else {
      setLoading(false);
      setError(true);
    }
  };

  const imageSrc = retryCount > 0 ? `${src}${src.includes("?") ? "&" : "?"}retry=${retryCount}` : src;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected
          ? "border-primary ring-2 ring-primary ring-offset-2"
          : "border-border hover:border-primary/50",
        className
      )}
    >
      {loading && (
        <Skeleton className="absolute inset-0" />
      )}

      {error ? (
        <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center">
          <ImageOff className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          className={cn(
            "w-full h-full object-cover transition-opacity",
            loading ? "opacity-0" : "opacity-100"
          )}
        />
      )}

      {hasEnhanced && !error && (
        <Badge
          variant="secondary"
          className="absolute bottom-1 left-1 text-[10px] px-1 py-0 h-4 bg-primary/90 text-primary-foreground"
        >
          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
          AI
        </Badge>
      )}

      {isSelected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
      )}
    </button>
  );
}
