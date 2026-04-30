import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import EditorialHero from "@/components/lux/EditorialHero";
import StatStrip from "@/components/lux/StatStrip";
import VideoReel from "@/components/lux/VideoReel";
import BeforeAfterSlider from "@/components/lux/BeforeAfterSlider";
import ROICalculator from "@/components/lux/ROICalculator";
import CaseStudy from "@/components/lux/CaseStudy";
import Marquee from "@/components/lux/Marquee";
import SectionHeading from "@/components/lux/SectionHeading";
import { useSmartCTA } from "@/hooks/useSmartCTA";

// All imagery is real Vantage customer output — no stock photography.
const px = {
  hero: "/vantage/ranch-build/input.png",
  intHero: "/vantage/sketch/original.webp",
  empty1: "/vantage/setup/before.webp",
  empty2: "/vantage/ranch-clean/before.webp",
  empty3: "/vantage/backyard-slow-reveal/before.jpg",
  staged1: "/vantage/setup/after.jpeg",
  staged2: "/vantage/listing-bundle/1.webp",
  staged3: "/vantage/listing-bundle/2.webp",
  exterior: "/vantage/backyard-slow-reveal/input.jpg",
  studio: "/vantage/ranch-clean/input.png",
  bedroom: "/vantage/listing-bundle/3.webp",
};

const RealEstatePhotographers = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <>
      <Helmet>
        <title>For Real Estate Photographers — The Vantage Studio</title>
        <meta name="title" content="For Real Estate Photographers — The Vantage Studio" />
        <meta
          name="description"
          content="The cinematic upsell for working real estate photographers. One photo in. A scroll-stopping listing film out. The Rendy alternative built for the trade."
        />
        <link rel="canonical" href="https://thevantage.co/real-estate-photographers" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          {/* HERO — tailored to photographers */}
          <EditorialHero
            eyebrow="A DOSSIER FOR THE WORKING PHOTOGRAPHER"
            edition="The Photographer's Edition"
            title={
              <>
                Add a $450
                <br />
                cinematic film
                <br />
                to <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>every shoot.</span>
              </>
            }
            subtitle="Without the second crew, the second invoice, or the seven days of post-production. The Vantage is the cinematic upsell built for working real estate photographers — and it travels in your camera bag."
            primaryCta={{ label: isLoggedIn ? "ENTER THE STUDIO →" : "BEGIN FREE — 50 CREDITS →", to: destination }}
            secondaryCta={{ label: "READ THE FILM REEL", to: "#reel" }}
            rightImage={px.hero}
            rightVideo="/vantage/build/result.mp4"
            byline="A FILM FROM A SINGLE STILL · ATWOOD STUDIO"
          />

          {/* WHO USES IT — Marquee of named studios */}
          <Marquee
            items={[
              "ATWOOD PHOTOGRAPHIC · BOSTON",
              "MERIDIAN VISUAL CO. · LOS ANGELES",
              "HOUSE OF LARSEN · NEW YORK",
              "STILLWATER STUDIO · NASHVILLE",
              "NORTH SHORE FILM · CHICAGO",
              "THE OBSCURA STUDIO · MIAMI",
              "PIER 38 IMAGING · SAN FRANCISCO",
              "WESTBROOK & CO. · AUSTIN",
            ]}
          />

          {/* THE PROBLEM */}
          <section className="lux-section lg:py-32 lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
              <div className="lg:col-span-5">
                <div className="lux-eyebrow mb-6" style={{ color: "var(--lux-rust)" }}>
                  ✦ THE OPEN SECRET
                </div>
                <h2 className="lux-display" style={{ fontSize: "clamp(2.6rem, 5.6vw, 5rem)", lineHeight: 0.95 }}>
                  You stopped offering
                  <br />
                  cinematic video
                  <br />
                  <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>when the margins died.</span>
                </h2>
              </div>
              <div className="lg:col-span-7">
                <p className="lux-prose" style={{ fontSize: 19, lineHeight: 1.65, color: "var(--lux-ink)" }}>
                  A proper cinematic listing film used to require a second shooter, a gimbal operator,
                  five hours of additional time on site, and seven to ten days of post — for an upsell
                  that maxed out at $1,800 and generated thirty hours of edit time.
                </p>
                <p className="lux-prose mt-6" style={{ fontSize: 19, lineHeight: 1.65 }}>
                  So you sold photos. You watched agents post static carousels. You watched the listings
                  with motion outperform yours by 4×, and you watched the agency studios pick up
                  the cinematic premium you couldn't afford to deliver.
                </p>
                <p
                  className="mt-10"
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontStyle: "italic",
                    fontSize: 32,
                    lineHeight: 1.25,
                    color: "var(--lux-ink)",
                    borderLeft: "1px solid var(--lux-rust)",
                    paddingLeft: 24,
                  }}
                >
                  We rebuilt the business. One frame. Three minutes. $0.42 per film at volume.
                  Add it to every shoot at $450 and watch billings climb 35%—
                  without changing a single thing on set.
                </p>
              </div>
            </div>
          </section>

          {/* INTERACTIVE — drag to reveal */}
          <section className="lux-section lux-bg-cream" id="metamorphosis">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE PROOF"
                title="Drag the seam."
                italic="One photograph in. One film out."
                lede="Each pair below was generated from a single after-frame submitted by a working studio. No before photo. No second visit. No second invoice."
                align="center"
                className="mb-16"
              />

              <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                {/* SETUP — empty room → fully styled, video reveals the dressing */}
                <BeforeAfterSlider
                  before="/vantage/setup/before.webp"
                  after="/vantage/setup/after.jpeg"
                  afterVideo="/vantage/setup/video.mp4"
                  beforeLabel="ORIGINAL FRAME"
                  afterLabel="DELIVERED FILM"
                  ratio="4/5"
                  caption="VIRTUAL STAGING · DRESSED FROM EMPTY"
                />

                {/* RANCH CLEAN — neglected exterior → cleaned & ready */}
                <BeforeAfterSlider
                  before="/vantage/ranch-clean/before.webp"
                  after="/vantage/ranch-clean/input.png"
                  afterVideo="/vantage/ranch-clean/video.mp4"
                  beforeLabel="ORIGINAL FRAME"
                  afterLabel="DELIVERED FILM"
                  ratio="4/5"
                  caption="CLEANUP TRANSFORMATION · LISTING-READY"
                />

                {/* BACKYARD SLOW REVEAL — bare ground → built backyard */}
                <BeforeAfterSlider
                  before="/vantage/backyard-slow-reveal/before.jpg"
                  after="/vantage/backyard-slow-reveal/input.jpg"
                  afterVideo="/vantage/backyard-slow-reveal/result.mp4"
                  beforeLabel="ORIGINAL FRAME"
                  afterLabel="DELIVERED FILM"
                  ratio="4/5"
                  caption="BACKYARD BUILD · 14-SECOND CINEMATIC FILM"
                />

                {/* SKETCH REVEAL — autoplay video tile (no before/after pair, the film IS the proof) */}
                <div
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: "4 / 5",
                    background: "var(--lux-ink)",
                    border: "1px solid var(--lux-hairline)",
                  }}
                >
                  <video
                    src="/vantage/sketch/result.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster="/vantage/sketch/original.webp"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute top-3 left-3 px-3 py-1.5 lux-eyebrow"
                    style={{
                      background: "rgba(14,14,12,0.7)",
                      color: "var(--lux-bone)",
                      fontSize: "0.6rem",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    PLAYING — FILM ONLY
                  </div>
                  <div
                    className="absolute bottom-3 left-3 right-3 lux-eyebrow"
                    style={{
                      color: "var(--lux-bone)",
                      fontSize: "0.65rem",
                      textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                    }}
                  >
                    SKETCH TO REALITY · HAND-DRAWN REVEAL
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* THE FILM REEL */}
          <section className="lux-section lux-bg-ink lux-grain" id="reel" style={{ color: "var(--lux-bone)" }}>
            <div className="lux-container">
              <VideoReel
                eyebrow="THE PHOTOGRAPHERS' DISPATCH · REAL CUSTOMER OUTPUT"
                title="Three films delivered this week."
                clips={[
                  { src: "/vantage/ranch-build/result.mp4", label: "The Beacon Residence", byline: "ATWOOD STUDIO · BOSTON" },
                  { src: "/vantage/sketch/result.mp4", label: "Olive & 14th — Sketch Reveal", byline: "MERIDIAN · LOS ANGELES" },
                  { src: "/vantage/backyard-slow-reveal/result.mp4", label: "Cedar Crest Estate", byline: "VANTAGE STUDIO · NORTHEAST" },
                  { src: "/vantage/just-listed/video.mp4", label: "Open House — Just Listed", byline: "MASS. · BADGE OVERLAY" },
                ]}
              />
            </div>
          </section>

          {/* WHAT'S IN THE BOX — Photographer-specific features */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE PHOTOGRAPHER'S SUITE"
                title="Studio-grade tools."
                italic="Built for the trade."
                lede="Every feature here exists because a working photographer asked for it. We say no to nothing essential and yes to nothing decorative."
                align="center"
                className="mb-20"
              />

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px lg:gap-6" style={{ background: "var(--lux-hairline-strong)" }}>
                {[
                  { tag: "01", h: "Brand presets", b: "Lock your studio color, watermark, intro card. One tap per film. Standardize in seconds." },
                  { tag: "02", h: "Private agent gallery", b: "A white-label gallery for each agent. They review, download, share. You never lose the client." },
                  { tag: "03", h: "MLS multi-format", b: "One render becomes vertical / square / horizontal. Drop into any MLS field without re-rendering." },
                  { tag: "04", h: "Batch renders", b: "Drop 24 frames before bed. Wake to 24 finished films, auto-named, organized by client." },
                  { tag: "05", h: "Your JPEG, unchanged", b: "Drag from Lightroom / Capture One. No re-editing, no re-proofing. We take what you ship." },
                  { tag: "06", h: "Watermark removal", b: "On every paid plan. Your work, your name, your watermark — or none at all." },
                  { tag: "07", h: "Invoice & licensing", b: "Each film ships with a usage license PDF, ready to attach to your client invoice or proposal." },
                  { tag: "08", h: "Priority queue", b: "Studio plan: 90 seconds. House plan: 45 seconds. Standard: 3 min 14 sec." },
                  { tag: "09", h: "API & automation", b: "Native: Pixifi, Iris, ShootProof, HoneyBook. Zapier for everything else." },
                ].map((f) => (
                  <div
                    key={f.tag}
                    className="lux-bg-bone p-8 md:p-10 lg:p-10 transition-colors hover:bg-cream"
                  >
                    <div className="flex items-baseline gap-4 mb-6">
                      <span className="lux-eyebrow" style={{ color: "var(--lux-rust)" }}>№ {f.tag}</span>
                      <span style={{ flex: 1, height: 1, background: "var(--lux-hairline)" }} />
                    </div>
                    <h3 className="lux-display text-2xl md:text-3xl mb-4">{f.h}</h3>
                    <p className="lux-prose text-sm" style={{ lineHeight: 1.7, color: "var(--lux-ink)" }}>{f.b}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* THE ECONOMICS */}
          <section className="lux-section lg:py-32 lux-bg-parchment">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow="THE ECONOMICS"
                  title="A line item"
                  italic="that pays rent."
                  lede="Move the dials. The defaults are pulled from cohort data of 248 working studios using The Vantage as of Q1 2026 — so the numbers are conservative, not aspirational."
                />
              </div>
              <div className="lg:col-span-7">
                <ROICalculator variant="photographer" defaultListings={22} defaultRate={450} />
              </div>
            </div>
          </section>

          {/* CASE STUDIES */}
          <section className="lux-section lg:py-32 lux-bg-bone">
            <div className="lux-container">
              <SectionHeading
                eyebrow="CASE STUDIES"
                title="Three studios."
                italic="Three quarters of compounding."
                align="center"
                className="mb-24"
              />

              <div className="flex flex-col gap-32">
                <CaseStudy
                  index="01"
                  studio="Atwood Photographic"
                  city="BEACON HILL · BOSTON"
                  quote="It paid for our second shooter's salary in eleven weeks."
                  body="Maya Atwood added The Vantage as a $450 cinematic upsell on her existing $1,200 photo package. By week eleven, the upsell revenue had hired her first associate photographer."
                  metrics={[
                    { value: "92%", label: "ATTACH RATE" },
                    { value: "+$5.4k", label: "MAR · UPLIFT" },
                    { value: "0", label: "RE-EDITS" },
                  ]}
                  before={px.empty1}
                  after={px.staged1}
                />
                <CaseStudy
                  index="02"
                  studio="Meridian Visual Co."
                  city="SILVER LAKE · LOS ANGELES"
                  reverse
                  quote="Our agents stopped asking for drone. They started asking for The Vantage."
                  body="A boutique two-person video studio that previously charged $1,800 per cinematic listing. Now bundles a Vantage film into every $850 photo package and hits volume their old workflow couldn't support."
                  metrics={[
                    { value: "3.4×", label: "MONTHLY VOLUME" },
                    { value: "+62%", label: "AGENT BOOKINGS" },
                    { value: "$28k", label: "Q1 UPLIFT" },
                  ]}
                  before="/vantage/ranch-clean/before.webp"
                  after="/vantage/ranch-clean/input.png"
                />
                <CaseStudy
                  index="03"
                  studio="Larsen Gardens"
                  city="HUDSON VALLEY · NEW YORK"
                  quote="The before-and-after used to take a drone, a second day on site, and an editor. Now it's the after photo and a coffee."
                  body="A landscape design-build studio specializing in country residences. Switched every project's marketing reel to single-frame Vantage output in February. Booked solid through May."
                  metrics={[
                    { value: "248", label: "FILMS / Q1" },
                    { value: "$117k", label: "NEW REVENUE" },
                    { value: "+34%", label: "BOOKING RATE" },
                  ]}
                  before="/vantage/backyard-slow-reveal/before.jpg"
                  after="/vantage/backyard-slow-reveal/input.jpg"
                />
              </div>
            </div>
          </section>

          <StatStrip
            variant="cream"
            stats={[
              { value: "248", label: "STUDIOS · ACTIVE" },
              { value: "12,400", label: "FILMS · YTD" },
              { value: "$2.1M", label: "STUDIO REVENUE ADDED" },
              { value: "94%", label: "REPEAT-USE RATE" },
            ]}
          />

          {/* COMPARISON — vs Rendy & friends */}
          <section className="lux-section lg:py-32 lux-bg-bone">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE COMPARISON"
                title="What sets us apart."
                lede="A short, honest comparison against the closest tools in our category. We respect the field — we built our edge on what they can't do."
                align="center"
                className="mb-16"
              />

              <div className="overflow-x-auto" style={{ border: "1px solid var(--lux-hairline)" }}>
                <table className="w-full" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--lux-cream)" }}>
                      <th className="text-left p-5 lux-eyebrow" style={{ color: "var(--lux-ash)", borderBottom: "1px solid var(--lux-hairline)" }}>
                        WHAT YOU GET
                      </th>
                      <th className="text-left p-5 lux-display" style={{ fontSize: 22, borderBottom: "1px solid var(--lux-hairline)" }}>
                        The Vantage
                      </th>
                      <th className="text-left p-5 lux-eyebrow" style={{ color: "var(--lux-ash)", borderBottom: "1px solid var(--lux-hairline)" }}>
                        Rendy
                      </th>
                      <th className="text-left p-5 lux-eyebrow" style={{ color: "var(--lux-ash)", borderBottom: "1px solid var(--lux-hairline)" }}>
                        BoxBrownie
                      </th>
                      <th className="text-left p-5 lux-eyebrow" style={{ color: "var(--lux-ash)", borderBottom: "1px solid var(--lux-hairline)" }}>
                        Manual edit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Single-photo transformation", "✓ Native", "Multi-photo only", "Manual", "Days of work"],
                      ["Avg. delivery time", "3 min 14 s", "8–12 min", "24–48 hrs", "5–10 days"],
                      ["Vertical 9:16 native", "✓", "✓", "Limited", "Re-edit required"],
                      ["Brand presets & color grade", "✓ Studio plan", "Limited", "✓", "Custom"],
                      ["Private agent gallery", "✓ Included", "Add-on", "—", "Ad-hoc"],
                      ["MLS multi-format export", "✓ One render", "Manual", "Manual", "Manual"],
                      ["Watermark removal", "✓ Studio plan", "Higher tier", "✓", "n/a"],
                      ["Per-film cost (at volume)", "$0.42", "$1.80–$3.20", "$8–$28", "$120–$400"],
                      ["White-label for brokerages", "✓ House plan", "Add-on", "—", "Custom"],
                    ].map((row, i) => (
                      <tr
                        key={i}
                        style={{
                          background: i % 2 === 0 ? "var(--lux-bone)" : "var(--lux-parchment)",
                        }}
                      >
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={j === 0 ? "lux-eyebrow" : "lux-prose"}
                            style={{
                              padding: "20px",
                              borderBottom: "1px solid var(--lux-hairline)",
                              color: j === 1 ? "var(--lux-ink)" : j === 0 ? "var(--lux-rust)" : "var(--lux-ink)",
                              fontWeight: j === 1 ? 500 : 400,
                              fontSize: j === 0 ? 11 : 14,
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="lux-eyebrow mt-8 text-center" style={{ color: "var(--lux-ash)" }}>
                COMPARISON UPDATED APRIL 2026 · BASED ON PUBLIC PRICING & DOCUMENTATION
              </p>
            </div>
          </section>

          {/* INVITATION */}
          <section
            className="relative overflow-hidden lux-bg-ink lux-grain"
            style={{ color: "var(--lux-bone)" }}
          >
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: `url(${px.studio})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(14,14,12,0.85), rgba(14,14,12,0.95))",
              }}
            />

            <div className="relative lux-container py-32 md:py-44 text-center">
              <div className="lux-eyebrow mb-10 flex items-center justify-center gap-3" style={{ color: "var(--lux-champagne)" }}>
                <span style={{ display: "inline-block", width: 36, height: 1, background: "var(--lux-champagne)" }} />
                FOR THE PHOTOGRAPHER
                <span style={{ display: "inline-block", width: 36, height: 1, background: "var(--lux-champagne)" }} />
              </div>

              <h2 className="lux-display" style={{ fontSize: "clamp(3rem, 8vw, 7rem)", lineHeight: 0.92, color: "var(--lux-bone)" }}>
                Add it to next
                <br />
                week's <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>shoot list.</span>
              </h2>

              <p className="lux-prose mt-10 mx-auto" style={{ color: "rgba(244,239,230,0.78)", maxWidth: 540 }}>
                Fifty credits free. Roughly twelve finished films. Enough to test it on three real shoots
                before your client invoice goes out.
              </p>

              <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
                <Link to={destination} className="lux-btn lux-btn-bone">
                  {isLoggedIn ? "ENTER THE STUDIO →" : "BEGIN FREE — 50 CREDITS →"}
                </Link>
                <Link to="/contact" className="lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-bone)" }}>
                  <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-bone)" }} />
                  SPEAK TO A LIAISON
                </Link>
              </div>
            </div>
          </section>

          {/* Sticky Bottom CTA */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 lux-bg-ink"
            style={{ borderTop: "1px solid var(--lux-hairline-strong)", color: "var(--lux-bone)" }}
          >
            <div className="lux-container flex items-center justify-between gap-4 py-4">
              <span className="lux-eyebrow hidden sm:inline" style={{ color: "var(--lux-champagne)" }}>50 free credits · No card required</span>
              <Link to={destination} className="lux-btn lux-btn-bone" style={{ padding: "12px 22px", fontSize: "0.7rem" }}>
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

export default RealEstatePhotographers;
