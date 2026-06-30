import { useEffect, useState } from "react";
import { getSeatsRemaining, formatSeats, SEAT_TOTAL } from "@/lib/seats";

/**
 * SeatsStrip — scarcity banner: "X,XXX of 6,000 founding seats left before
 * The Vantage goes invite-only." Starts from the date-seeded base and ticks
 * down a little during the session (every 40–90s) so a watching visitor sees
 * it move — which is what makes it feel real rather than a static number.
 *
 * variant:
 *   • "bar"  — full-width thin strip (top of landing pages)
 *   • "inline" — compact pill for cards / the auth panel
 */
interface SeatsStripProps {
  variant?: "bar" | "inline";
  className?: string;
}

export default function SeatsStrip({ variant = "bar", className = "" }: SeatsStripProps) {
  const [seats, setSeats] = useState<number>(() => getSeatsRemaining());

  useEffect(() => {
    // Re-sync to the date-driven base, then occasionally tick down by 1 so the
    // counter visibly moves while the visitor is on the page. Never below base.
    const id = setInterval(() => {
      setSeats((prev) => {
        const base = getSeatsRemaining();
        const next = Math.random() < 0.5 ? prev - 1 : prev;
        return Math.max(base - 12, Math.min(prev, next), 1);
      });
    }, 55_000);
    // Keep the base honest on focus/return.
    const onFocus = () => setSeats((p) => Math.min(p, getSeatsRemaining()));
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, []);

  const label = (
    <>
      {"ONLY "}
      <span style={{ color: "var(--lux-champagne)", fontWeight: 700 }}>{formatSeats(seats)}</span>
      {" OF "}{formatSeats(SEAT_TOTAL)}{" SEATS LEFT — FREE ACCESS CLOSES WHEN THE PLATFORM FILLS"}
    </>
  );

  if (variant === "inline") {
    return (
      <div
        className={`lux-eyebrow inline-flex items-center gap-2 px-3 py-2 ${className}`}
        style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", fontSize: "0.62rem", letterSpacing: "0.14em" }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--lux-rust)", display: "inline-block" }} />
        {label}
      </div>
    );
  }

  return (
    <div
      className={`w-full text-center lux-eyebrow ${className}`}
      style={{
        background: "var(--lux-ink)",
        color: "var(--lux-bone)",
        padding: "10px 16px",
        fontSize: "0.62rem",
        letterSpacing: "0.16em",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--lux-rust)", display: "inline-block" }} />
        {label}
      </span>
    </div>
  );
}
