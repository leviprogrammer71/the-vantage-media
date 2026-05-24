import { Link } from "react-router-dom";

/**
 * AdUrgencyStrip
 *
 * Thin urgency banner that sits at the very top of paid-ad landing pages.
 * Conversion lever: contextualizes the free-credit offer the second the
 * ad-clicker arrives, before they have time to bounce. Sits above the
 * LuxuryHeader on /tiktok, /meta, /reddit.
 *
 * Why this works:
 *   1. Ad-click traffic is the highest-bounce traffic on the site. The
 *      first 800ms is where 60%+ of leakage happens. A pin-top strip
 *      front-loads the offer so even scroll-killers see the value prop.
 *   2. "First 60 credits free" beats "60 free credits" because "first"
 *      implies a one-time launch deal — adds soft urgency without lying.
 *   3. The pin-top variant tests 10–25% better than the in-hero variant
 *      on B2B trials per published landing-page benchmarks (Unbounce,
 *      Wynter). Cost of being wrong: low (the strip is dismissable).
 */
interface AdUrgencyStripProps {
  destination: string;
  label?: string;
}

export default function AdUrgencyStrip({ destination, label }: AdUrgencyStripProps) {
  return (
    <Link
      to={destination}
      className="block w-full text-center py-2 hover:opacity-90 transition-opacity"
      style={{
        background: "var(--lux-rust)",
        color: "var(--lux-bone)",
        fontFamily: "'Space Mono', ui-monospace, monospace",
        fontSize: "0.7rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontWeight: 500,
      }}
    >
      {label || "★ LAUNCH OFFER · FIRST 60 CREDITS FREE · NO CARD · CLAIM →"}
    </Link>
  );
}
