import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageCompareSliderProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
}

export function ImageCompareSlider({
  beforeImage,
  afterImage,
  className,
}: ImageCompareSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full aspect-[3/2] overflow-hidden rounded-lg shadow-xl cursor-ew-resize select-none bg-muted",
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      {/* After Image (Full) */}
      <img
        src={afterImage}
        alt="Enhanced"
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          !afterLoaded && "opacity-0"
        )}
        draggable={false}
        onLoad={() => setAfterLoaded(true)}
        onError={(e) => {
          console.error("After image failed to load:", afterImage);
          setAfterLoaded(true);
        }}
      />

      {/* Before Image (Clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt="Original"
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            !beforeLoaded && "opacity-0"
          )}
          draggable={false}
          onLoad={() => setBeforeLoaded(true)}
          onError={(e) => {
            console.error("Before image failed to load:", beforeImage);
            setBeforeLoaded(true);
          }}
        />
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      >
        {/* Slider Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-muted-foreground rounded-full" />
            <div className="w-0.5 h-4 bg-muted-foreground rounded-full" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 px-2 py-1 bg-black/60 text-white text-xs rounded">
        Before
      </div>
      <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 text-white text-xs rounded">
        After
      </div>
    </div>
  );
}
