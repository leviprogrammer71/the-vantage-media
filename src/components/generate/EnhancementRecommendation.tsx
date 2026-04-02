import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancementRecommendationProps {
  onEnhanceFirst?: () => void;
  onGenerateAnyway: () => void;
  className?: string;
}

const HIDE_PERMANENTLY_KEY = "vantage_hide_video_enhancement_recommendation";
const SESSION_DISMISSED_KEY = "vantage_session_enhancement_dismissed";

export const EnhancementRecommendation = ({
  onEnhanceFirst,
  onGenerateAnyway,
  className,
}: EnhancementRecommendationProps) => {
  const [visible, setVisible] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if permanently hidden
    const hidePermanently = localStorage.getItem(HIDE_PERMANENTLY_KEY);
    if (hidePermanently === "true") {
      setVisible(false);
      return;
    }

    // Check if dismissed this session
    const sessionDismissed = sessionStorage.getItem(SESSION_DISMISSED_KEY);
    if (sessionDismissed === "true") {
      setVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem(HIDE_PERMANENTLY_KEY, "true");
    } else {
      // Only hide for this session
      sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
    }
    setVisible(false);
  };

  const handleEnhanceFirst = () => {
    if (onEnhanceFirst) {
      onEnhanceFirst();
    }
  };

  const handleGenerateAnyway = () => {
    handleDismiss();
    onGenerateAnyway();
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20",
        "animate-in slide-in-from-top-2 fade-in duration-300",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <div className="pr-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h4 className="font-medium text-sm">For best results</h4>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          We recommend enhancing your photo before creating a video. Enhanced images produce sharper, 
          more professional video results.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {onEnhanceFirst && (
            <Button
              size="sm"
              onClick={handleEnhanceFirst}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Enhance Photo First
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAnyway}
          >
            Generate Video Anyway
          </Button>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            className="h-3.5 w-3.5"
          />
          Don't show this again
        </label>
      </div>
    </div>
  );
};

export const shouldShowEnhancementRecommendation = (): boolean => {
  const hidePermanently = localStorage.getItem(HIDE_PERMANENTLY_KEY);
  if (hidePermanently === "true") return false;

  const sessionDismissed = sessionStorage.getItem(SESSION_DISMISSED_KEY);
  if (sessionDismissed === "true") return false;

  return true;
};
