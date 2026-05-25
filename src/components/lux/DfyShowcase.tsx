import { Link } from "react-router-dom";

/**
 * DfyShowcase — landing-page section that shows the Done-For-You story
 * end to end: upload these 7 photos in this order → get back this reel.
 *
 * Replaces the old "one-stop-shop" homepage block, which marketed seven
 * features instead of demonstrating ONE result. This component is the
 * proof shot — the seller's photos beside the finished Vantage reel they
 * produced. User-supplied house3 imagery + a 1a edit-style demo.
 *
 * Defaults to the luxury-minimal edit (the user-elected hero) but accepts
 * any of the four DFY edit styles via `editStyle`.
 */
interface DfyShowcaseProps {
  /** Which 1a edit-style video to play. Defaults to luxuryminimal. */
  editStyle?: "snappy" | "fastcuts" | "creative" | "luxuryminimal";
  /** Optional override for the eyebrow label. */
  eyebrow?: string;
  /** Optional override for the section heading. */
  heading?: string;
  /** Italic clause appended after the heading. */
  headingItalic?: string;
  /** Where the primary CTA links to. */
  ctaHref?: string;
  /** Primary CTA label. */
  ctaLabel?: string;
}

const HOUSE3_PHOTOS = [
  "/vantage/done-for-you/house3/1.png",
  "/vantage/done-for-you/house3/2.png",
  "/vantage/done-for-you/house3/3.png",
  "/vantage/done-for-you/house3/4.png",
  "/vantage/done-for-you/house3/5.png",
  "/vantage/done-for-you/house3/6.png",
  "/vantage/done-for-you/house3/7.png",
];

const STYLE_LABEL: Record<NonNullable<DfyShowcaseProps["editStyle"]>, string> = {
  luxuryminimal: "LUXURY MINIMAL EDIT",
  snappy: "SNAPPY EDIT",
  fastcuts: "FAST CUTS EDIT",
  creative: "CREATIVE EDIT",
};

export default function DfyShowcase({
  editStyle = "luxuryminimal",
  eyebrow = "THE DONE-FOR-YOU REEL · 7 PHOTOS → 1 FILM",
  heading = "Drop your 7 listing photos in order.",
  headingItalic = "Hand back a finished reel.",
  ctaHref = "/video?mode=listing&category=done_for_you_reel",
  ctaLabel = "MAKE MINE FREE — 60 CREDITS →",
}: DfyShowcaseProps) {
  return (
    <section className="lux-section lux-bg-cream">
      <div className="lux-container">
        {/* Eyebrow + heading */}
        <div className="mb-12 max-w-3xl">
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
          <p
            className="lux-prose mt-6"
            style={{ color: "var(--lux-ash)", maxWidth: 600 }}
          >
            The order you upload is the order they appear. Pick an edit style —
            Snappy, Fast Cuts, Creative, or Luxury Minimal — and Seedance 2.0
            renders the whole reel in one pass with native audio.
          </p>
        </div>

        {/* Photos in → Reel out */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT — the 7 photos in upload order */}
          <div className="lg:col-span-7">
            <div
              className="lux-eyebrow mb-4 flex items-center gap-3"
              style={{ color: "var(--lux-brass)" }}
            >
              <span style={{ display: "inline-block", width: 28, height: 1, background: "var(--lux-brass)" }} />
              UPLOAD · 7 PHOTOS · IN THIS ORDER
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {HOUSE3_PHOTOS.map((src, i) => (
                <div
                  key={src}
                  className="relative"
                  style={{ aspectRatio: "1 / 1", border: "1px solid var(--lux-hairline)" }}
                >
                  <img
                    src={src}
                    alt={`Listing photo ${i + 1}`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute top-1.5 left-1.5 lux-display flex items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      background: "var(--lux-ink)",
                      color: "var(--lux-bone)",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                    }}
                  >
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ARROW (md+) */}
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
            <div
              className="lux-display-italic"
              style={{ fontSize: 48, color: "var(--lux-rust)", lineHeight: 1 }}
            >
              →
            </div>
          </div>

          {/* RIGHT — the resulting reel */}
          <div className="lg:col-span-4">
            <div
              className="lux-eyebrow mb-4 flex items-center gap-3"
              style={{ color: "var(--lux-brass)" }}
            >
              <span style={{ display: "inline-block", width: 28, height: 1, background: "var(--lux-brass)" }} />
              {STYLE_LABEL[editStyle]} · 15s
            </div>
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: "9 / 16",
                background: "#0E0E0C",
                border: "1px solid var(--lux-hairline-strong)",
              }}
            >
              <video
                src={`/vantage/done-for-you/${editStyle}.mp4`}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="mt-4 text-sm" style={{ color: "var(--lux-ash)" }}>
              Real customer output. Rendered in 3 minutes.
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 flex flex-wrap items-center gap-6">
          <Link
            to={ctaHref}
            className="lux-btn"
            style={{
              background: "var(--lux-ink)",
              color: "var(--lux-bone)",
              padding: "18px 28px",
            }}
          >
            {ctaLabel}
          </Link>
          <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>
            60 free credits · No card required
          </span>
        </div>
      </div>
    </section>
  );
}
