import { useState } from "react";
import { cn } from "@/lib/utils";
import { SHOT_TYPES, type ShotType } from "@/lib/shot-types";
import { Coins } from "lucide-react";

interface ShotTypePickerProps {
  value: ShotType;
  onChange: (shotType: ShotType) => void;
}

export function ShotTypePicker({ value, onChange }: ShotTypePickerProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHOT_TYPES.map((shot, index) => {
          const isSelected = value === shot.id;
          const romanNumeral = ["I", "II", "III", "IV", "V", "VI"][index];

          return (
            <button
              key={shot.id}
              onClick={() => onChange(shot.id)}
              className={cn(
                "text-left p-6 rounded-none border transition-all",
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
              {/* Number in serif italic */}
              <div className="lux-display-italic text-xl mb-2">
                {romanNumeral}.
              </div>

              {/* Shot label in serif */}
              <h3 className="lux-display text-lg mb-1">
                {shot.label}
              </h3>

              {/* Tagline in eyebrow */}
              <div className="lux-eyebrow mb-2" style={{
                color: isSelected ? "#C9A96E" : "#8C7A52",
              }}>
                {shot.tagline}
              </div>

              {/* Description in prose */}
              <p className="lux-prose text-sm mb-3" style={{
                color: isSelected ? "#A39E94" : "#6B6760",
              }}>
                {shot.description}
              </p>

              {/* Credits indicator + premium badge */}
              <div className="flex items-center justify-between pt-2 border-t" style={{
                borderColor: isSelected ? "rgba(201, 169, 110, 0.2)" : "var(--lux-hairline)",
              }}>
                <div className="flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{shot.creditCost}</span>
                </div>
                {shot.isPremium && (
                  <span className="lux-eyebrow text-[9px]" style={{
                    color: isSelected ? "#C9A96E" : "#8C7A52",
                  }}>
                    PREMIUM
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
