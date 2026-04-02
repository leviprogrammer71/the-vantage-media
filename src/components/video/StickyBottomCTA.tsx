import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StickyBottomCTAProps {
  creditCost: number;
  credits: number | null;
  hasImage: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function StickyBottomCTA({
  creditCost,
  credits,
  hasImage,
  isGenerating,
  onGenerate,
}: StickyBottomCTAProps) {
  const hasEnoughCredits = credits !== null && credits >= creditCost;

  return (
    <div
      className="fixed left-0 right-0 z-50 border-t border-[#1A1A1A] p-3 md:p-4"
      style={{
        bottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
        background: "#0A0A0A",
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
        {/* Left: Cost display */}
        <div className="flex items-center gap-2">
          <Coins className={cn(
            "h-5 w-5",
            hasEnoughCredits ? "text-[#E8C547]" : "text-destructive"
          )} />
          <div className="flex flex-col">
            <span
              className={cn(
                "font-bold text-sm md:text-lg leading-tight",
                hasEnoughCredits ? "text-[#E8C547]" : "text-destructive"
              )}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px" }}
            >
              {creditCost} credits{credits !== null ? ` (of your ${credits})` : ""}
            </span>
            {!hasEnoughCredits && (
              <span className="text-xs text-destructive">
                Need {creditCost - (credits ?? 0)} more
              </span>
            )}
          </div>
        </div>

        {/* Right: CTA Button */}
        {!hasImage ? (
          <Button disabled className="h-12 px-6 md:px-6 rounded-none" style={{ background: "#2A2A2A", color: "#555" }}>
            Select a photo
          </Button>
        ) : !hasEnoughCredits ? (
          <Button asChild className="h-12 px-6 rounded-none bg-primary text-primary-foreground">
            <Link to="/pricing">Get Credits</Link>
          </Button>
        ) : (
          <Button
            onClick={() => {
              onGenerate();
              // Haptic feedback on generate
              if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
            }}
            disabled={isGenerating}
            className="h-12 px-7 gap-2 rounded-none"
            style={{
              background: "#E8C547",
              color: "#0A0A0A",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "18px",
              letterSpacing: "1px",
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>GENERATE →</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
