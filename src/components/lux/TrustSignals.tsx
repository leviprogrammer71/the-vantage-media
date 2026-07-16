/**
 * TrustSignals
 *
 * Compact horizontal strip of trust badges placed near every primary CTA.
 * Research finding (Luxury Presence, Ylopo): agents convert ~2x better when
 * MLS-compliance and AI-disclosure proof sits within 200px of the button.
 *
 * Use immediately above or below the hero CTA on TikTok / Meta / Reddit
 * landings and in the in-app upgrade prompts.
 */

import { Shield, Lock, Sparkles, Check } from "lucide-react";

interface TrustSignalsProps {
  /** Tight = horizontal pill row. Stacked = vertical for narrow sidebars. */
  variant?: "tight" | "stacked";
  /** Override the default color theme. */
  color?: string;
}

const items = [
  { icon: Shield, label: "MLS-safe · AI disclosure tag included" },
  { icon: Sparkles, label: "60 free credits · no card required" },
  { icon: Check, label: "Cancel anytime — keep your remaining credits" },
  { icon: Lock, label: "Your photos never leave Vantage" },
];

export default function TrustSignals({ variant = "tight", color }: TrustSignalsProps) {
  const fg = color || "var(--lux-ash)";
  if (variant === "stacked") {
    return (
      <ul className="space-y-2 text-xs" style={{ color: fg }}>
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--lux-brass)" }} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul
      className="flex flex-wrap gap-x-5 gap-y-2 text-xs items-center"
      style={{ color: fg, fontFamily: "'Space Mono', ui-monospace, monospace", letterSpacing: "0.04em" }}
    >
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--lux-brass)" }} />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
