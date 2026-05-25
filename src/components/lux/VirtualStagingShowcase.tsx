import { Link } from "react-router-dom";

/**
 * VirtualStagingShowcase — landing-page section that demonstrates the
 * Virtual Staging category using the user-supplied virtualdtaging.mp4
 * customer-output clip. The video cycles through several furnishing
 * styles in a locked-off camera shot, so we present it as the proof
 * of the multi-style "cycle" feature.
 */
interface Props {
  ctaHref?: string;
  ctaLabel?: string;
  /** Section heading override. */
  heading?: string;
  headingItalic?: string;
  eyebrow?: string;
}

export default function VirtualStagingShowcase({
  ctaHref = "/video?mode=listing&category=virtual_staging",
  ctaLabel = "STAGE A ROOM — FROM 15 CREDITS →",
  heading = "Empty room.",
  headingItalic = "Eleven styles. One shot.",
  eyebrow = "VIRTUAL STAGING · MULTI-STYLE CYCLE",
}: Props) {
  return (
    <section className="lux-section lux-bg-bone">
      <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* LEFT — copy */}
        <div className="lg:col-span-5">
          <div
            className="lux-eyebrow mb-4"
            style={{ color: "var(--lux-rust)" }}
          >
            {eyebrow}
          </div>
          <h2
            className="lux-display"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.6rem)", lineHeight: 1.02 }}
          >
            {heading}
            <br />
            <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>
              {headingItalic}
            </span>
          </h2>
          <p className="lux-prose mt-6" style={{ color: "var(--lux-ash)" }}>
            Upload one empty room. The camera locks off, the framing stays the
            same, and the room dresses itself — Luxury Minimalist, Bohemian,
            Mediterranean, Modern, and more. Pick one style, cycle three, or
            begin-and-return to the original.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              to={ctaHref}
              className="lux-btn"
              style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "16px 24px" }}
            >
              {ctaLabel}
            </Link>
            <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>
              10s film · Camera locked · 15 credits
            </span>
          </div>
        </div>

        {/* RIGHT — the customer-output video */}
        <div className="lg:col-span-7">
          <div
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: "16 / 9",
              background: "#0E0E0C",
              border: "1px solid var(--lux-hairline-strong)",
            }}
          >
            <video
              src="/vantage/virtual-staging/result.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div
            className="lux-eyebrow mt-4"
            style={{ color: "var(--lux-brass)", fontSize: "0.7rem" }}
          >
            REAL CUSTOMER OUTPUT · 10s · MULTI-STYLE CYCLE
          </div>
        </div>
      </div>
    </section>
  );
}
