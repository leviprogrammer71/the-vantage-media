import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import EditorialHero from "@/components/lux/EditorialHero";
import PreviewVideo from "@/components/lux/PreviewVideo";
import Marquee from "@/components/lux/Marquee";
import SectionHeading from "@/components/lux/SectionHeading";
import { useSmartCTA } from "@/hooks/useSmartCTA";
import { useUtmCapture } from "@/hooks/useUtmCapture";
import AdUrgencyStrip from "@/components/lux/AdUrgencyStrip";
import TrustSignals from "@/components/lux/TrustSignals";

/**
 * MetaLanding — /meta
 *
 * Lands Meta (Instagram + Facebook) ad traffic. Voice matches platform:
 *   - Editorial, polished, aspirational
 *   - Image-first composition (full-bleed photography)
 *   - Trust signals: press marquee, customer reels, "as seen in"
 *   - Magazine-spread layout
 *   - Stronger byline on every section (Instagram is read like a magazine)
 *
 * Conversion levers:
 *   - 60 free credits headline
 *   - Press marquee for credibility
 *   - Real customer reel above the fold
 *   - Side-by-side phone mockups showing the output across formats
 *   - Multiple CTA repetition with different wording
 */
const MetaLanding = () => {
  const { destination, destinationFor, isLoggedIn } = useSmartCTA("agent");
  // Persist meta/instagram attribution + any ad-passed UTMs across the session.
  useUtmCapture("meta");

  return (
    <>
      <Helmet>
        <title>One photo. A cinematic listing reel. Three minutes. — The Vantage</title>
        <meta
          name="description"
          content="The cinematic listing reel built for Instagram and Facebook Reels. Upload one photo. Get a 1080p vertical film with your price and address baked in. 60 free credits, no card required."
        />
        <link rel="canonical" href="https://thevantage.media/meta" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <AdUrgencyStrip destination={destination} label="★ INSTAGRAM LAUNCH OFFER · FIRST 60 CREDITS FREE · NO CARD · TAP TO CLAIM →" />
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          <EditorialHero
            eyebrow="A NEW EDITION FOR LISTING AGENTS"
            edition="The Reels Edition"
            title={
              <>
                One photo.
                <br />
                A cinematic
                <br />
                <span
                  className="lux-display-italic"
                  style={{ color: "var(--lux-rust)" }}
                >
                  listing film.
                </span>
              </>
            }
            subtitle="The vertical 1080p Reel agents are using to win every market. Price and address baked in. Auto-sized for Instagram and Facebook Reels. Sixty credits free — your first reel costs nothing."
            primaryCta={{
              label: isLoggedIn ? "OPEN THE STUDIO →" : "BEGIN FREE — 60 CREDITS →",
              to: destination,
            }}
            secondaryCta={{ label: "SEE THE GALLERY", to: "/gallery" }}
            rightImage="/vantage/ranch-build/input.png"
            rightVideo="/vantage/done-for-you/luxuryminimal.mp4"
            byline="A LISTING FILM · 1487 N ECHO, FRESNO"
          />

          {/* "Built for" marquee — May 24, 2026, replaced unverifiable press
              claims (Inman / Architectural Digest etc.) with platform names
              where our output is actually sized to land. */}
          <Marquee
            items={[
              "BUILT FOR  ·  Reels",
              "BUILT FOR  ·  TikTok",
              "BUILT FOR  ·  the MLS",
              "BUILT FOR  ·  Stories",
              "BUILT FOR  ·  Shorts",
              "BUILT FOR  ·  Zillow video",
              "BUILT FOR  ·  Realtor.com",
              "BUILT FOR  ·  agents at Compass · eXp · KW · CB",
            ]}
          />

          {/* ═══════════ THE PROMISE — VISUAL SPREAD ═══════════ */}
          <section
            className="lux-section lux-bg-ink lux-grain"
            style={{ color: "var(--lux-bone)" }}
          >
            <div className="lux-container">
              <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                <div className="lg:col-span-6">
                  <SectionHeading
                    eyebrow="WHAT YOU'LL POST"
                    title="A film, not"
                    italic="a flyer."
                    lede="Every other agent in your market is still posting static carousels. The Vantage delivers a finished, scroll-stopping vertical reel — auto-sized for Reels, your story, the MLS preview, your client email. The reel sells the listing. You take the call."
                  />
                  <div className="mt-10">
                    <Link
                      to={destination}
                      className="lux-btn lux-btn-bone"
                      style={{ padding: "18px 32px", fontSize: "0.8rem" }}
                    >
                      {isLoggedIn ? "CREATE A REEL →" : "TRY ONE FREE →"}
                    </Link>
                  </div>
                </div>

                {/* Phone-mockup grid — shows where the reel goes */}
                <div className="lg:col-span-6">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "STORY", poster: "/vantage/done-for-you/house3/1.png" },
                      { label: "REELS", poster: "/vantage/done-for-you/house3/2.png" },
                      { label: "FEED", poster: "/vantage/done-for-you/house3/3.png" },
                      { label: "DMs", poster: "/vantage/done-for-you/house3/4.png" },
                      { label: "FB FEED", poster: "/vantage/done-for-you/house3/5.png" },
                      { label: "MLS", poster: "/vantage/done-for-you/house3/6.png" },
                    ].map((p, i) => (
                      <div
                        key={i}
                        className="relative overflow-hidden"
                        style={{
                          aspectRatio: "9/16",
                          background: "var(--lux-ink)",
                          border: "1px solid rgba(244,239,230,0.12)",
                        }}
                      >
                        <img
                          src={p.poster}
                          alt={`${p.label} placement`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(14,14,12,0.65) 0%, rgba(14,14,12,0) 50%)",
                          }}
                        />
                        <div
                          className="lux-eyebrow absolute bottom-2 left-2"
                          style={{
                            color: "var(--lux-champagne)",
                            fontSize: "0.55rem",
                            letterSpacing: "0.2em",
                          }}
                        >
                          {p.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════ THE STATS — TRUST FOR META BUYERS ═══════════ */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <div className="text-center mb-14">
                <div
                  className="lux-eyebrow mb-4"
                  style={{ color: "var(--lux-rust)" }}
                >
                  THE RECEIPTS
                </div>
                <h2
                  className="lux-display"
                  style={{
                    fontSize: "clamp(2.4rem, 5vw, 4rem)",
                    lineHeight: 1.05,
                  }}
                >
                  $79/month beats{" "}
                  <span
                    className="lux-display-italic"
                    style={{ color: "var(--lux-rust)" }}
                  >
                    a $300 videographer.
                  </span>
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { v: "3 min", l: "RENDER TIME", c: "vs 48hr BoxBrownie · vs 5-day videographer" },
                  { v: "$79", l: "FULL MONTH", c: "vs $300–$1,000 per shoot from a freelancer" },
                  { v: "1080p", l: "VERTICAL · 9:16", c: "Native Reels / TikTok / MLS" },
                  { v: "60", l: "FREE CREDITS", c: "One full reel — no card required" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="p-8 lux-bg-cream"
                    style={{ border: "1px solid var(--lux-hairline)" }}
                  >
                    <div
                      className="lux-display"
                      style={{
                        fontSize: "clamp(2.4rem, 4vw, 3.4rem)",
                        lineHeight: 1,
                      }}
                    >
                      {s.v}
                    </div>
                    <div
                      className="lux-eyebrow mt-4"
                      style={{ color: "var(--lux-rust)" }}
                    >
                      {s.l}
                    </div>
                    <div
                      className="mt-3 text-sm"
                      style={{
                        color: "var(--lux-ink)",
                        fontStyle: "italic",
                      }}
                    >
                      {s.c}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════ REAL CUSTOMER REEL ═══════════ */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                <div className="lg:col-span-6">
                  <SectionHeading
                    eyebrow="A REAL CUSTOMER'S REEL"
                    title="123 East Atwood."
                    italic="Eight photos. One reel."
                    lede="A working agent uploaded eight listing photos. We generated and stitched them into one 30-second cinematic film with the price and address baked in. Total time from upload to finished MP4: three minutes."
                  />
                </div>
                <div className="lg:col-span-6">
                  <div
                    className="relative w-full overflow-hidden mx-auto"
                    style={{
                      aspectRatio: "9 / 16",
                      maxWidth: 420,
                      background: "var(--lux-ink)",
                      border: "1px solid var(--lux-hairline-strong)",
                      boxShadow: "0 24px 60px rgba(14,14,12,0.18)",
                    }}
                  >
                    <PreviewVideo
                      src="/vantage/done-for-you/result.mp4"
                      poster="/vantage/done-for-you/house3/1.png"
                      alt="A real customer's Done-For-You listing reel"
                      containerClassName="absolute inset-0 w-full h-full"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════ FEATURED PATH — ONE PRIMARY CTA, FIVE EXTRAS ═══════════
              Decision paralysis kills conversion. Show Done-For-You as the
              one big primary path. Other films listed as a smaller secondary
              row so users see the breadth without being asked to choose. */}
          <section
            className="lux-section"
            style={{ background: "var(--lux-cream)" }}
          >
            <div className="lux-container">
              <div className="text-center mb-12">
                <div
                  className="lux-eyebrow mb-4"
                  style={{ color: "var(--lux-rust)" }}
                >
                  THE ONE TO START WITH
                </div>
                <h2
                  className="lux-display"
                  style={{
                    fontSize: "clamp(2.2rem, 5vw, 4rem)",
                    lineHeight: 1.05,
                  }}
                >
                  Done-For-You{" "}
                  <span
                    className="lux-display-italic"
                    style={{ color: "var(--lux-rust)" }}
                  >
                    Reel.
                  </span>
                </h2>
              </div>

              {/* Featured Done-For-You card */}
              <Link
                to={destinationFor("done_for_you_reel")}
                className="block mb-10"
              >
                <div
                  className="p-8 lg:p-12 transition-all"
                  style={{
                    background: "var(--lux-ink)",
                    color: "var(--lux-bone)",
                    border: "1px solid var(--lux-ink)",
                    boxShadow: "0 24px 60px rgba(14,14,12,0.22)",
                  }}
                >
                  <div className="grid lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-7">
                      <div
                        className="lux-eyebrow mb-4 inline-block px-3 py-1"
                        style={{
                          background: "var(--lux-rust)",
                          color: "var(--lux-bone)",
                          fontSize: "0.62rem",
                          letterSpacing: "0.18em",
                        }}
                      >
                        ★ MOST POPULAR
                      </div>
                      <h3
                        className="lux-display mb-4"
                        style={{
                          fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                          lineHeight: 1.1,
                          color: "var(--lux-bone)",
                        }}
                      >
                        Six photos → one 30-second cinematic reel.
                      </h3>
                      <p
                        className="lux-prose mb-6"
                        style={{
                          fontSize: "1rem",
                          lineHeight: 1.6,
                          color: "rgba(244,239,230,0.88)",
                        }}
                      >
                        Auto-stitched. Price and address baked into the frame.
                        Editorial, Snappy, Cinema, or Minimal style. The
                        order you upload is the order they play. Total time
                        from upload to finished MP4 — three minutes.
                      </p>
                      <span
                        className="lux-btn lux-btn-bone inline-block"
                        style={{ padding: "16px 28px", fontSize: "0.8rem" }}
                      >
                        {isLoggedIn
                          ? "MAKE A REEL NOW →"
                          : "MAKE MY FIRST REEL FREE →"}
                      </span>
                    </div>
                    <div className="lg:col-span-5">
                      <div
                        className="grid grid-cols-3 gap-1.5"
                        style={{ aspectRatio: "3/4" }}
                      >
                        {[
                          "/vantage/done-for-you/house3/1.png",
                          "/vantage/done-for-you/house3/2.png",
                          "/vantage/done-for-you/house3/3.png",
                          "/vantage/done-for-you/house3/4.png",
                          "/vantage/done-for-you/house3/5.png",
                          "/vantage/done-for-you/house3/6.png",
                        ].map((src, i) => (
                          <div
                            key={i}
                            className="relative overflow-hidden"
                            style={{
                              aspectRatio: "9/16",
                              border: "1px solid rgba(244,239,230,0.12)",
                            }}
                          >
                            <img
                              src={src}
                              alt={`Listing reel frame ${i + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div
                              className="absolute top-1.5 left-1.5 lux-display flex items-center justify-center"
                              style={{
                                width: 22,
                                height: 22,
                                background: "var(--lux-bone)",
                                color: "var(--lux-ink)",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                              }}
                            >
                              {i + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Secondary row — 5 other films, compact */}
              <div
                className="lux-eyebrow text-center mb-6"
                style={{ color: "var(--lux-ash)" }}
              >
                OR PICK ANOTHER FILM
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  {
                    id: "animate_single",
                    title: "Animate Single",
                    sub: "1 photo · 1 shot",
                  },
                  {
                    id: "virtual_staging",
                    title: "Virtual Staging",
                    sub: "Empty → furnished",
                  },
                  {
                    id: "sun_to_sun",
                    title: "Sun-Up to Sundown",
                    sub: "Day → dusk",
                  },
                  {
                    id: "sketch_to_real",
                    title: "Sketch to Reality",
                    sub: "Signature reveal",
                  },
                ].map((p) => (
                  <Link
                    key={p.id}
                    to={destinationFor(p.id as Parameters<typeof destinationFor>[0])}
                    className="block p-4 lux-bg-bone transition-colors text-center"
                    style={{
                      border: "1px solid var(--lux-hairline-strong)",
                    }}
                  >
                    <h4
                      className="lux-display mb-1"
                      style={{ fontSize: "0.95rem", lineHeight: 1.1 }}
                    >
                      {p.title}
                    </h4>
                    <div
                      className="lux-eyebrow"
                      style={{
                        color: "var(--lux-ash)",
                        fontSize: "0.55rem",
                        letterSpacing: "0.18em",
                      }}
                    >
                      {p.sub.toUpperCase()}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════ FAQ — objection handlers ═══════════ */}
          <section className="lux-section" style={{ background: "var(--lux-cream)" }}>
            <div className="lux-container max-w-3xl">
              <div className="lux-eyebrow mb-4" style={{ color: "var(--lux-rust)" }}>
                BEFORE YOU SIGN UP
              </div>
              <h2
                className="lux-display mb-10"
                style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.05 }}
              >
                What every agent <span className="lux-display-italic">asks first.</span>
              </h2>
              <div className="space-y-6">
                {[
                  {
                    q: "Will MLS flag this? What about AI disclosure?",
                    a: "Every export carries a built-in AI-disclosure tag, and we provide a one-click link to the original photo for buyers. Compliant with CA AB-723, CO HB24-1147, and every major MLS we've checked.",
                  },
                  {
                    q: "Does the video actually look real?",
                    a: "It's the same photo you uploaded — we add cinematic camera motion to it. No invented walls, no morphing furniture, no plastic AI sheen. The Reel feels like a slider or steadicam shot, because that's what it is mathematically.",
                  },
                  {
                    q: "Can I post it on Reels / Stories / Feed without re-encoding?",
                    a: "Yes. Every output is native 9:16 vertical, 1080p, MP4. Drops cleanly to Reels, Stories, Feed, and the MLS without any re-encoding.",
                  },
                  {
                    q: "What if my brokerage doesn't allow AI staging?",
                    a: "Camera Movement and Done-For-You Reels never modify the photo — they only add motion. AI staging is opt-in. If you want it, the disclosure tag handles compliance for you.",
                  },
                  {
                    q: "What if I don't love it?",
                    a: "Your first 60 credits are free — that's a full Done-For-You reel. Cancel anytime and keep your remaining credits.",
                  },
                ].map((f) => (
                  <details
                    key={f.q}
                    className="group"
                    style={{ borderBottom: "1px solid var(--lux-hairline)", paddingBottom: 16 }}
                  >
                    <summary
                      className="lux-display cursor-pointer flex items-center justify-between gap-4"
                      style={{ fontSize: "1.25rem", lineHeight: 1.3, color: "var(--lux-ink)" }}
                    >
                      {f.q}
                      <span className="lux-eyebrow flex-shrink-0" style={{ color: "var(--lux-rust)" }}>
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
              <div className="mt-10">
                <TrustSignals />
              </div>
            </div>
          </section>

          {/* ═══════════ FINAL CTA ═══════════ */}
          <section
            className="lux-section"
            style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
          >
            <div className="lux-container max-w-4xl text-center py-12">
              <div
                className="lux-eyebrow mb-6"
                style={{ color: "var(--lux-champagne)" }}
              >
                THE STUDIO IS OPEN
              </div>
              <h2
                className="lux-display"
                style={{
                  fontSize: "clamp(2.6rem, 6vw, 5rem)",
                  lineHeight: 1,
                  color: "var(--lux-bone)",
                }}
              >
                Make your next listing
                <br />
                <span
                  className="lux-display-italic"
                  style={{ color: "var(--lux-champagne)" }}
                >
                  impossible to scroll past.
                </span>
              </h2>
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
                <Link
                  to={destination}
                  className="lux-btn lux-btn-bone"
                  style={{ padding: "18px 32px", fontSize: "0.8rem" }}
                >
                  {isLoggedIn
                    ? "OPEN THE STUDIO →"
                    : "BEGIN FREE — 60 CREDITS →"}
                </Link>
                <Link
                  to="/pricing"
                  className="lux-eyebrow inline-flex items-center gap-3"
                  style={{ color: "var(--lux-bone)" }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 24,
                      height: 1,
                      background: "var(--lux-bone)",
                    }}
                  />
                  SEE PRICING
                </Link>
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
                {isLoggedIn ? "ENTER STUDIO →" : "BEGIN FREE →"}
              </Link>
            </div>
          </div>
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
};

export default MetaLanding;
