import { cn } from "@/lib/utils";
import { VIBES, type Vibe } from "@/lib/vibes";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VibePickerProps {
  value: Vibe;
  onChange: (vibe: Vibe) => void;
}

export function VibePicker({ value, onChange }: VibePickerProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {VIBES.map((vibe) => {
          const isSelected = value === vibe.id;

          return (
            <button
              key={vibe.id}
              onClick={() => onChange(vibe.id)}
              className={cn(
                "text-left p-4 rounded-none border transition-all",
                isSelected
                  ? "bg-ink border-ink text-bone"
                  : "bg-bone border-hairline hover:border-ink"
              )}
              style={isSelected ? {
                backgroundColor: "#0E0E0C",
                borderColor: "#0E0E0C",
                color: "#F4EFE6",
              } : {
                backgroundColor: "#F4EFE6",
                borderColor: "var(--lux-hairline)",
                color: "#0E0E0C",
              }}
            >
              {/* Vibe name in serif */}
              <h3 className="lux-display text-sm mb-1">
                {vibe.label}
              </h3>

              {/* Description in prose */}
              <p className="lux-prose text-xs mb-2" style={{
                color: isSelected ? "#A39E94" : "#6B6760",
              }}>
                {vibe.description}
              </p>

              {/* Info icon */}
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center h-3 w-3 rounded-full hover:bg-muted transition-colors"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Info className="h-2.5 w-2.5" style={{
                      color: isSelected ? "#C9A96E" : "#8C7A52",
                    }} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[180px] rounded-none border-primary/50 px-3 py-2"
                  style={{
                    backgroundColor: "#222222",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "11px",
                    lineHeight: "1.5",
                    color: "#e5e5e5",
                  }}
                >
                  {vibe.description}
                </TooltipContent>
              </Tooltip>
            </button>
          );
        })}
      </div>

      {/* Guideline text */}
      <div className="lux-eyebrow text-center" style={{ color: "var(--lux-ash)", fontSize: "0.75rem" }}>
        VIBE TUNES THE LIGHTING &amp; MOOD OF YOUR FILM
      </div>
    </div>
  );
}
