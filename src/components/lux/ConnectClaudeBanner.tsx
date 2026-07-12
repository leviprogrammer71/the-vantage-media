/**
 * ConnectClaudeBanner — the "Claude meets The Vantage" hero for /connect.
 *
 * Rebuilt in code (not an uploaded image) so it always renders, scales crisply,
 * and stays editable. Rust field + editorial headline on the left, a luxury
 * home photo bleeding in on the right, and the Claude ✕ Vantage lockup below.
 */

const RUST = "rgb(140,63,46)"; // var(--lux-rust)

function ClaudeBurst({ size = 30, color = "var(--lux-bone)" }: { size?: number; color?: string }) {
  // Stylised radiant "spark" — 12 tapered spokes from a center point.
  const spokes = Array.from({ length: 12 });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {spokes.map((_, i) => {
        const angle = (i * 360) / 12;
        return (
          <rect
            key={i}
            x="47.5"
            y="8"
            width="5"
            height="34"
            rx="2.5"
            fill={color}
            transform={`rotate(${angle} 50 50)`}
          />
        );
      })}
    </svg>
  );
}

const FEATURES: { label: string; icon: JSX.Element }[] = [
  {
    label: "Generate ideas with Claude",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
      </svg>
    ),
  },
  {
    label: "Create stunning reels with The Vantage",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="m10 9 5 3-5 3V9Z" />
      </svg>
    ),
  },
  {
    label: "Publish and win more listings",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
      </svg>
    ),
  },
];

export default function ConnectClaudeBanner({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        background: "var(--lux-rust)",
        boxShadow: "0 24px 60px -30px rgba(140,63,46,0.55)",
        isolation: "isolate",
      }}
    >
      {/* House photo bleeding in from the right (desktop only). */}
      <div className="hidden md:block" style={{ position: "absolute", inset: 0, left: "auto", right: 0, width: "48%" }}>
        <img
          src="/hero-still.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Rust fade so the left seam blends into the field. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, ${RUST} 0%, rgba(140,63,46,0.75) 16%, rgba(140,63,46,0.15) 48%, rgba(140,63,46,0) 70%)`,
          }}
        />
        {/* Warm tint to unify the photo with the brand rust. */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(140,63,46,0.18)", mixBlendMode: "multiply" }} />
      </div>

      {/* Content */}
      <div
        className="relative px-7 py-10 sm:px-12 sm:py-14 md:pr-[46%]"
        style={{ color: "var(--lux-bone)", zIndex: 1 }}
      >
        <h1
          className="lux-display"
          style={{ fontSize: "clamp(2.4rem, 5.2vw, 4rem)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
        >
          Claude <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>meets</span>
          <br />
          The Vantage.
        </h1>

        <div style={{ width: 220, maxWidth: "60%", height: 1, background: "rgba(244,239,230,0.45)", margin: "22px 0 18px" }} />

        <div className="lux-eyebrow" style={{ color: "var(--lux-bone)", letterSpacing: "0.22em", lineHeight: 1.9, fontSize: "0.72rem" }}>
          AI INTELLIGENCE. CINEMATIC STORYTELLING.
          <br />
          <span style={{ color: "var(--lux-champagne)" }}>ONE SEAMLESS WORKFLOW.</span>
        </div>

        {/* Feature triad */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6 mt-9">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-3" style={{ flex: 1 }}>
              <span
                className="flex-shrink-0 grid place-items-center"
                style={{ width: 40, height: 40, borderRadius: 999, border: "1px solid rgba(244,239,230,0.4)", color: "var(--lux-bone)" }}
              >
                {f.icon}
              </span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.92rem", lineHeight: 1.3, color: "var(--lux-bone)" }}>
                {f.label}
              </span>
            </div>
          ))}
        </div>

        {/* Claude ✕ Vantage lockup */}
        <div className="flex items-center gap-4 mt-11">
          <span
            className="grid place-items-center"
            style={{ width: 64, height: 64, borderRadius: 16, background: "var(--lux-rust)", border: "1px solid rgba(244,239,230,0.35)", boxShadow: "0 8px 22px rgba(14,14,12,0.28)" }}
          >
            <ClaudeBurst size={30} />
          </span>

          <span aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 22, height: 1, borderTop: "2px dashed rgba(244,239,230,0.55)" }} />
            <span style={{ width: 22, height: 22, borderRadius: 999, background: "var(--lux-champagne)", display: "grid", placeItems: "center", color: "var(--lux-rust)", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>+</span>
            <span style={{ width: 22, height: 1, borderTop: "2px dashed rgba(244,239,230,0.55)" }} />
          </span>

          <span
            className="grid place-items-center lux-display"
            style={{ width: 64, height: 64, borderRadius: 16, background: "var(--lux-bone)", color: "var(--lux-ink)", boxShadow: "0 8px 22px rgba(14,14,12,0.28)", fontSize: 34, lineHeight: 1 }}
          >
            V
          </span>
        </div>
      </div>
    </div>
  );
}
