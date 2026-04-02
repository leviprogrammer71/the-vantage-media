import { Switch } from "@/components/ui/switch";
import { Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionToggleProps {
  useEnhanced: boolean;
  setUseEnhanced: (value: boolean) => void;
  hasEnhancedVersion: boolean;
  className?: string;
}

export function VersionToggle({
  useEnhanced,
  setUseEnhanced,
  hasEnhancedVersion,
  className,
}: VersionToggleProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-muted/30 p-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Use enhanced version</span>
        </div>
        <Switch
          checked={useEnhanced}
          onCheckedChange={setUseEnhanced}
          disabled={!hasEnhancedVersion}
        />
      </div>
      
      {!hasEnhancedVersion && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>No enhanced version available for this photo</span>
        </div>
      )}
    </div>
  );
}
