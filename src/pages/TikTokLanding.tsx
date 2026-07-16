import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import PreviewVideo from "@/components/lux/PreviewVideo";
import { useSmartCTA } from "@/hooks/useSmartCTA";
import { useUtmCapture } from "@/hooks/useUtmCapture";
import AdUrgencyStrip from "@/components/lux/AdUrgencyStrip";
import TrustSignals from "@/components/lux/TrustSignals";

/**
 * TikTokLanding — /tiktok
 *
 * Lands TikTok-sourced traffic. Voice matches the platform:
 *   - POV / "hear me out" hook
 *   - Punchy fragmented headlines
 *   - Massive vertical hero video (the actual product output, autoplaying)
 *   - One CTA above the fold, repeated everywhere
 *   - Short paragraphs, lots of breathing room
 *   - "Realtors are using AI for this" framing
 *
 * Conversion levers:
 *   - 60 free credits headline (no card)
 *   - Single primary CTA
 *   - Sticky bottom CTA bar visible at all times on mobile
 *   - Social proof: "realtors are already using this" + animated stat
 */
const TikTokLanding = () => {
  const { destination, isLoggedIn } = useSmartCTA("agent");
  // Persist tiktok attribution + any ad-passed UTMs across the session.
  useUtmCapture("tiktok");

  return (
    <>
      <Helmet>
        <title>POV: your listing photos become cinematic Reels — The Vantage</title>
        <meta
          name="description"
          content="The AI tool TikTok realtors are quietly using. Upload one listing photo. Get a cinematic 1080p vertical reel ready for TikTok in 3 minutes. 60 free credits — no card."
        />
        <link rel="canonical" href="https://thevantage.media/tiktok" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <AdUrgencyStrip destination={destination} label="★ TIKTOK LAUNCH OFFER · FIRST 60 CREDITS FREE · NO CARD · TAP TO CLAIM →" />
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          {/* ═══════════ HERO — POV HOOK ═══════════ */}
          <section className="lux-section pb-12 lg:pb-24">
            <div className="lux-container">
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                {/* Left: punchy headline */}
                <div>
                  <div
                    className="lux-eyebrow mb-6 flex items-center gap-3"
                    style={{ color: "var(--lux-rust)" }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 36,
                        height: 1,
                        background: "var(--lux-rust)",
                      }}
                    />
                    POV · YOU'RE A REALTOR IN 2026
                  </div>

                  <h1
                    className="lux-display mb-6"
                    style={{
                      fontSize: "clamp(2.6rem, 8vw, 6rem)",
                      lineHeight: 0.94,
                      letterSpacing: "-0.022em",
                    }}
                  >
                    Turn one listing photo into a{" "}
                    <span
                      className="lux-display-italic"
                      style={{ color: "var(--lux-rust)" }}
                    >
                      scroll-stopping
                    </span>{" "}
                    cinematic Reel.
                  </h1>

                  <p
                    className="lux-prose mb-4"
                    style={{
                      fontSize: "1.15rem",
                      lineHeight: 1.5,
                      maxWidth: 560,
                      fontWeight: 500,
                    }}
                  >
                    The AI tool top-producing agents are quietly using on
                    TikTok. 1080p vertical. 3 minutes. No editor.
                  </p>

                  {/* Conversion proof bullets — specificity beats vagueness */}
                  <ul
                    className="space-y-2 mb-9"
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--lux-ink)",
                      lineHeight: 1.5,
                    }}
                  >
                    <li className="flex items-start gap-2">
                      <span
                        style={{
                          color: "var(--lux-rust)",
                          fontWeight: 700,
                          marginTop: -1,
                        }}
                      >
                        ✓
                      </span>
                      <span>One photo in, one cinematic clip out — no tripod, no editor</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        style={{
                          color: "var(--lux-rust)",
                          fontWeight: 700,
                          marginTop: -1,
                        }}
                      >
                        ✓
                      </span>
                      <span>Six camera moves — dolly, pedestal, truck, orbit, roll, pan</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        style={{
                          color: "var(--lux-rust)",
                          fontWeight: 700,
                          marginTop: -1,
                        }}
                      >
                        ✓
                      </span>
                      <span>Price + address baked into the frame, ready to post</span>
                    </li>
                  </ul>

                  <div className="flex flex-wrap gap-4 items-center">
                    <Link
                      to={destination}
                      className="lux-btn"
                      style={{
                        background: "var(--lux-ink)",
                        color: "var(--lux-bone)",
                        padding: "22px 36px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {isLoggedIn
                        ? "MAKE A REEL NOW →"
                        : "MAKE MY FIRST REEL FREE →"}
                    </Link>
                  </div>
                  <div className="mt-5">
                    <TrustSignals />
                  </div>
                </div>

                {/* Right: vertical phone-frame autoplaying reel */}
                <div className="relative mx-auto" style={{ maxWidth: 380 }}>
                  <div
                    className="relative w-full overflow-hidden"
                    style={{
                      aspectRatio: "9/16",
                      background: "var(--lux-ink)",
                      border: "1px solid var(--lux-hairline-strong)",
                      boxShadow: "0 24px 60px rgba(14,14,12,0.18)",
                    }}
                  >
                    <PreviewVideo
                      src="/vantage/done-for-you/luxuryminimal.mp4"
                      poster="/vantage/done-for-you/house3/1.png"
                      alt="A real listing reel from The Vantage"
                      containerClassName="absolute inset-0 w-full h-full"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* TikTok-style UI hint */}
                    <div
                      className="absolute bottom-0 left-0 right-0 p-4"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(14,14,12,0.7), rgba(14,14,12,0))",
                        color: "var(--lux-bone)",
                      }}
                    >
                      <div
                        className="lux-eyebrow mb-1"
                        style={{
                          color: "var(--lux-champagne)",
                          fontSize: "0.6rem",
                        }}
                      >
                        REAL LISTING · 1487 N ECHO
                      </div>
                      <div
                        className="lux-display"
                        style={{ fontSize: "1.2rem", lineHeight: 1.1 }}
                      >
                        Generated in 3 minutes.
                      </div>
                    </div>
                  </div>
                  <div
                    className="lux-eyebrow text-center mt-4"
                    style={{ color: "var(--lux-ash)" }}
                  >
                    THIS IS THE ACTUAL OUTPUT
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════ SOCIAL PROOF STRIP ═══════════ */}
          <section
            className="py-8"
            style={{
              background: "var(--lux-ink)",
              color: "var(--lux-bone)",
            }}
          >
            <div className="lux-container text-center">
              <div
                className="lux-eyebrow mb-2"
                style={{ color: "var(--lux-champagne)" }}
              >
                ANCHOR PRICING · THE RECEIPTS
              </div>
              <p
                className="lux-display"
                style={{
                  fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
                  lineHeight: 1.3,
                }}
              >
                One videographer shoot:{" "}
                <s style={{ color: "rgba(244,239,230,0.45)" }}>$300–$1,000</s>
                <br />
                The Vantage PRO:{" "}
                <span
                  className="lux-display-italic"
                  style={{ color: "var(--lux-champagne)" }}
                >
                  $79/month · unlimited.
                </span>
              </p>
              <div
                className="lux-eyebrow mt-3"
                style={{
                  color: "rgba(244,239,230,0.55)",
                  fontSize: "0.65rem",
                }}
              >
                BOXBROWNIE = $24/IMAGE · 48 HR · NO VIDEO · WE'RE 3 MIN · VIDEO INCLUDED
              </div>
            </div>
          </section>

          {/* ═══════════ HOW (3 STEPS, TIKTOK-PACED) ═══════════ */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container max-w-5xl">
              <div className="text-center mb-14">
                <div
                  className="lux-eyebrow mb-4"
                  style={{ color: "var(--lux-rust)" }}
                >
                  THREE TAPS · NO EDITOR · NO TRIPOD
                </div>
                <h2
                  className="lux-display"
                  style={{
                    fontSize: "clamp(2.2rem, 5vw, 4rem)",
                    lineHeight: 1,
                  }}
                >
                  Here's the play.
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    n: "01",
                    h: "Upload a photo",
                    p: "One listing shot from your phone. JPEG, PNG, HEIC. Done.",
                  },
                  {
                    n: "02",
                    h: "Pick a camera move",
                    p: "Slow push. Pedestal. Dolly. The AI does the cameraman, you stay home.",
                  },
                  {
                    n: "03",
                    h: "Post the Reel",
                    p: "Vertical 1080p · already sized for TikTok feed. Drop it, walk away.",
                  },
                ].map((s) => (
                  <div
                    key={s.n}
                    className="p-7 lux-bg-cream"
                    style={{ border: "1px solid var(--lux-hairline)" }}
                  >
                    <div
                      className="lux-display-italic mb-3"
                      style={{
                        fontSize: "2.5rem",
                        color: "var(--lux-rust)",
                        lineHeight: 1,
                      }}
                    >
                      {s.n}.
                    </div>
                    <h3
                      className="lux-display mb-3"
                      style={{ fontSize: "1.6rem", lineHeight: 1.1 }}
                    >
                      {s.h}
                    </h3>
                    <p
                      className="lux-prose"
                      style={{ fontSize: "0.95rem", lineHeight: 1.55 }}
                    >
                      {s.p}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-14 text-center">
                <Link
                  to={destination}
                  className="lux-btn"
                  style={{
                    background: "var(--lux-ink)",
                    color: "var(--lux-bone)",
                    padding: "20px 36px",
                    fontSize: "0.85rem",
                  }}
                >
                  TRY IT NOW · 60 FREE CREDITS →
                </Link>
              </div>
            </div>
          </section>

          {/* ═══════════ THE HONESTY SECTION ═══════════ */}
          <section
            className="lux-section"
            style={{ background: "var(--lux-cream)" }}
          >
            <div className="lux-container max-w-3xl text-center">
              <div
                className="lux-eyebrow mb-5"
                style={{ color: "var(--lux-rust)" }}
              >
                BEFORE YOU SCROLL ON
              </div>
              <h2
                className="lux-display mb-6"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3.4rem)",
                  lineHeight: 1.05,
                }}
              >
                We're not selling{" "}
                <span
                  className="lux-display-italic"
                  style={{ color: "var(--lux-rust)" }}
                >
                  another AI tool.
                </span>
              </h2>
              <p
                className="lux-prose"
                style={{ fontSize: "1.05rem", lineHeight: 1.65 }}
              >
                The Vantage is a cinematic film studio that happens to run on
                AI. The output looks like a Sotheby's reel, not a Canva
                animation. Your free 60 credits make one full reel — that's
                the trial. You decide if it's worth posting.
              </p>
              <div className="mt-10">
                <Link
                  to={destination}
                  className="lux-btn"
                  style={{
                    background: "var(--lux-ink)",
                    color: "var(--lux-bone)",
                    padding: "20px 36px",
                    fontSize: "0.85rem",
                  }}
                >
                  {isLoggedIn ? "OPEN THE STUDIO →" : "MAKE MY FIRST REEL FREE →"}
                </Link>
              </div>
            </div>
          </section>

          {/* ═══════════ FAQ — objection handlers ═══════════ */}
          {/* Research-finding: TikTok landing had no FAQ. Cold platform traffic
              with no objection handlers = bounces. Each Q here targets a top-3
              objection identified in the conversion research. */}
          <section className="lux-section" style={{ background: "var(--lux-cream)" }}>
            <div className="lux-container max-w-3xl">
              <div className="lux-eyebrow mb-4" style={{ color: "var(--lux-rust)" }}>
                BEFORE YOU SIGN UP
              </div>
              <h2
                className="lux-display mb-10"
                style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.05 }}
              >
                Real questions. <span className="lux-display-italic">Real answers.</span>
              </h2>
              <div className="space-y-6">
                {[
                  {
                    q: "Will MLS flag this? What about AI disclosure?",
                    a: "Every export carries a built-in AI-disclosure tag, and we provide a one-click link to the original photo for buyers. Compliant with CA AB-723, CO HB24-1147, and every major MLS we've checked. We update the disclosure layer whenever local rules change.",
                  },
                  {
                    q: "Does the video look fake?",
                    a: "It's the same photo you uploaded — we just add cinematic camera motion to it. No invented walls, no morphing furniture, no plastic AI sheen. The Reel feels like a slider or steadicam shot, because that's exactly what it is mathematically.",
                  },
                  {
                    q: "Will TikTok downrank a watermarked video?",
                    a: "Zero watermark on PRO ($79) and STUDIO ($149.99). Native 9:16 vertical, 1080p, MP4 — uploads clean to TikTok, Reels, Shorts, and the MLS without re-encoding.",
                  },
                  {
                    q: "What if I hate the result?",
                    a: "Your first 60 credits are free — that's a full Done-For-You reel plus a single-clip animation. Cancel anytime and keep your remaining credits.",
                  },
                ].map((f) => (
                  <details
                    key={f.q}
                    className="group"
                    style={{
                      borderBottom: "1px solid var(--lux-hairline)",
                      paddingBottom: 16,
                    }}
                  >
                    <summary
                      className="lux-display cursor-pointer flex items-center justify-between gap-4"
                      style={{ fontSize: "1.25rem", lineHeight: 1.3, color: "var(--lux-ink)" }}
                    >
                      {f.q}
                      <span
                        className="lux-eyebrow flex-shrink-0"
                        style={{ color: "var(--lux-rust)" }}
                      >
                        +
                      </span>
                    </summary>
                    <p
                      className="lux-prose mt-3"
                      style={{ fontSize: "0.98rem", lineHeight: 1.6, color: "var(--lux-ash)" }}
                    >
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
              <div className="mt-10 text-center">
                <Link
                  to={destination}
                  className="lux-btn"
                  style={{
                    background: "var(--lux-ink)",
                    color: "var(--lux-bone)",
                    padding: "20px 36px",
                    fontSize: "0.85rem",
                  }}
                >
                  {isLoggedIn ? "ENTER STUDIO →" : "START FREE · 60 CREDITS →"}
                </Link>
              </div>
            </div>
          </section>

          {/* ═══════════ FINAL CTA ═══════════ */}
          <section
            className="lux-section"
            style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
          >
            <div className="lux-container max-w-3xl text-center py-10">
              <h2
                className="lux-display mb-8"
                style={{
                  fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
                  lineHeight: 1,
                  color: "var(--lux-bone)",
                }}
              >
                Your next listing
                <br />
                <span
                  className="lux-display-italic"
                  style={{ color: "var(--lux-champagne)" }}
                >
                  deserves a film.
                </span>
              </h2>
              <Link
                to={destination}
                className="lux-btn lux-btn-bone"
                style={{ padding: "20px 36px", fontSize: "0.85rem" }}
              >
                {isLoggedIn ? "ENTER STUDIO →" : "START FREE · 60 CREDITS →"}
              </Link>
              <div
                className="lux-eyebrow mt-6"
                style={{
                  color: "var(--lux-champagne)",
                  fontSize: "0.7rem",
                }}
              >
                60 FREE CREDITS · NO CARD · CANCEL ANYTIME
              </div>
            </div>
          </section>

          {/* Sticky Bottom CTA */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 lux-bg-ink"
            style={{
              borderTop: "1px solid var(--lux-hairline-strong)",
              color: "var(--lux-bone)",
            }}
          >
            <div className="lux-container flex items-center justify-between gap-4 py-4">
              <span
                className="lux-eyebrow hidden sm:inline"
                style={{ color: "var(--lux-champagne)" }}
              >
                60 free credits · No card required
              </span>
              <Link
                to={destination}
                className="lux-btn lux-btn-bone"
                style={{ padding: "12px 22px", fontSize: "0.7rem" }}
              >
                {isLoggedIn ? "ENTER STUDIO →" : "TRY FREE →"}
              </Link>
            </div>
          </div>
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
};

export default TikTokLanding;
