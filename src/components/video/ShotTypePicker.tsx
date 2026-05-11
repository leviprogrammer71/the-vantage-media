import { cn } from "@/lib/utils";
import {
  SHOT_TYPES,
  SHOT_CATEGORY_LABELS,
  shotsByCategory,
  type ShotType,
  type ShotCategory,
} from "@/lib/shot-types";
import { Coins } from "lucide-react";

interface ShotTypePickerProps {
  value: ShotType;
  onChange: (shotType: ShotType) => void;
}

// Show categories in this order. Research finding: "Forward & Back" is the
// most-requested family — surface it first.
const CATEGORY_ORDER: ShotCategory[] = [
  "linear",
  "lateral",
  "vertical",
  "rotational",
  "architectural",
];

export function ShotTypePicker({ value, onChange }: ShotTypePickerProps) {
  const groups = shotsByCategory();

  return (
    <div className="space-y-10">
      {CATEGORY_ORDER.map((category) => {
        const shotsInGroup = groups[category];
        if (!shotsInGroup.length) return null;

        return (
          <section key={category}>
            <header
              className="lux-eyebrow mb-4 flex items-center gap-3"
              style={{ color: "var(--lux-brass)" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 28,
                  height: 1,
                  background: "var(--lux-brass)",
                }}
              />
              {SHOT_CATEGORY_LABELS[category]}
              <span style={{ color: "var(--lux-ink)", opacity: 0.35, fontSize: 11 }}>
                · {shotsInGroup.length} {shotsInGroup.length === 1 ? "move" : "moves"}
              </span>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shotsInGroup.map((shot) => {
                const isSelected = value === shot.id;
                return (
                  <button
                    key={shot.id}
                    onClick={() => onChange(shot.id)}
                    className={cn(
                      "text-left p-5 rounded-none border transition-all flex flex-col",
                      isSelected
                        ? "bg-ink border-ink text-bone"
                        : "bg-bone border-hairline hover:border-ink"
                    )}
                    style={
                      isSelected
                        ? {
                            backgroundColor: "#0E0E0C",
                            borderColor: "#0E0E0C",
                            color: "#F4EFE6",
                          }
                        : {
                            backgroundColor: "#F4EFE6",
                            borderColor: "var(--lux-hairline)",
                            color: "#0E0E0C",
                          }
                    }
                  >
                    {/* Shot label in serif */}
                    <h3 className="lux-display text-lg mb-1 leading-tight">
                      {shot.label}
                    </h3>

                    {/* Tagline */}
                    <div
                      className="lux-eyebrow mb-3"
                      style={{
                        color: isSelected ? "#C9A96E" : "#8C7A52",
                        fontSize: 10,
                        letterSpacing: "0.16em",
                      }}
                    >
                      {shot.tagline}
                    </div>

                    {/* Description */}
                    <p
                      className="lux-prose text-sm mb-4 flex-1"
                      style={{
                        color: isSelected ? "#A39E94" : "#6B6760",
                        lineHeight: 1.45,
                      }}
                    >
                      {shot.description}
                    </p>

                    {/* Credits + premium badge */}
                    <div
                      className="flex items-center justify-between pt-3 border-t"
                      style={{
                        borderColor: isSelected
                          ? "rgba(201, 169, 110, 0.2)"
                          : "var(--lux-hairline)",
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{shot.creditCost}</span>
                      </div>
                      {shot.isPremium && (
                        <span
                          className="lux-eyebrow"
                          style={{
                            color: isSelected ? "#C9A96E" : "#8C7A52",
                            fontSize: 9,
                            letterSpacing: "0.18em",
                          }}
                        >
                          PREMIUM
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
