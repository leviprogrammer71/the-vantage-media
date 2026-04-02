import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, X, ImageOff, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Enhancement {
  id: string;
  original_image_url: string;
  enhanced_image_url: string;
  preset_used: string;
  created_at: string;
  credits_used: number;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onLoadEnhancement: (enhancement: Enhancement) => void;
}

export function HistorySidebar({
  isOpen,
  onToggle,
  onLoadEnhancement,
}: HistorySidebarProps) {
  const { user } = useAuth();
  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEnhancements();
    }
  }, [user]);

  const fetchEnhancements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("enhancements")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setEnhancements(data || []);
    } catch (err) {
      console.error("Failed to fetch enhancements:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getPresetLabel = (preset: string) => {
    const labels: Record<string, string> = {
      "bright-clear": "Bright & Clear",
      "natural-light": "Natural Light",
      "high-contrast": "High Contrast",
      "overcast-sunny": "Overcast to Sunny",
      twilight: "Twilight",
    };
    return labels[preset] || preset;
  };

  return (
    <>
      {/* Toggle Tab */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden lg:flex",
          "flex-col items-center justify-center gap-2",
          "w-12 h-28 rounded-l-lg",
          "bg-slate-800 dark:bg-slate-700 text-white",
          "hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors",
          isOpen && "opacity-0 pointer-events-none"
        )}
      >
        <History className="h-5 w-5" />
        <span
          className="text-xs font-medium"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          Recent
        </span>
        {enhancements.length > 0 && (
          <span className="absolute -top-1 -left-1 w-5 h-5 bg-amber-500 rounded-full text-xs flex items-center justify-center">
            {enhancements.length}
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-16 bottom-0 z-40 hidden lg:block",
          "w-80 bg-background border-l border-border shadow-2xl",
          "transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold">Recent Enhancements</h3>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100%-120px)]">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : enhancements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageOff className="h-10 w-10 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No recent enhancements
                </p>
              </div>
            ) : (
              enhancements.map((enhancement) => (
                <button
                  key={enhancement.id}
                  onClick={() => onLoadEnhancement(enhancement)}
                  className="w-full p-2 border border-border rounded-lg hover:bg-muted/50 transition-colors flex gap-3 text-left"
                >
                  <img
                    src={enhancement.enhanced_image_url}
                    alt="Enhancement thumbnail"
                    className="w-20 h-20 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(enhancement.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getPresetLabel(enhancement.preset_used)}
                    </p>
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">
                      {enhancement.credits_used} credit
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => (window.location.href = "/gallery")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              View All
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
