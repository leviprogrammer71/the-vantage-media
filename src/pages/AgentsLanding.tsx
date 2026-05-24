import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import EditorialHero from "@/components/lux/EditorialHero";
import StatStrip from "@/components/lux/StatStrip";
import VideoReel from "@/components/lux/VideoReel";
import BeforeAfterSlider from "@/components/lux/BeforeAfterSlider";
import ROICalculator from "@/components/lux/ROICalculator";
import SectionHeading from "@/components/lux/SectionHeading";
import Marquee from "@/components/lux/Marquee";
import { useSmartCTA } from "@/hooks/useSmartCTA";

// All imagery is real Vantage customer output — no stock photography.
const ax = {
  hero: "/vantage/ranch-build/input.png",
  empty1: "/vantage/setup/before.webp",
  empty2: "/vantage/ranch-clean/before.webp",
  staged1: "/vantage/setup/after.jpeg",
  staged2: "/vantage/listing-bundle/1.webp",
  exterior: "/vantage/backyard-slow-reveal/input.jpg",
};

const AgentsLanding = () => {
  // Agents ship Done-For-You reels — the auto-stitched, ready-to-post format.
  const { destination, isLoggedIn } = useSmartCTA("agent");

  return (
    <>
      <Helmet>
        <title>For Listing Agents — The Vantage</title>
        <meta name="description" content="Open every listing with a film, not a flyer. The Vantage turns a single photo into a Reels-native cinematic listing video — for agents who actually want to win the market." />
        <link rel="canonical" href="https://thevantage.media/for-agents" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          <EditorialHero
            eyebrow="A DOSSIER FOR THE LISTING AGENT"
            edition="The Agent's Edition"
            title={
              <>
                Open every
                <br />
                listing with a
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>film. Not a flyer.</span>
              </>
            }
            subtitle="One photo. A 12-second cinematic film engineered for Reels and the algorithm. Sellers expect it. Buyers reward it. Comparable agents don't have it yet."
            primaryCta={{ label: isLoggedIn ? "ENTER THE STUDIO →" : "BEGIN FREE — 50 CREDITS →", to: destination }}
            secondaryCta={{ label: "SEE A LIVE LISTING REEL", to: "/gallery" }}
            rightImage={ax.hero}
            rightVideo="/vantage/build/result.mp4"
            byline="A LISTING FILM · 1132 ELM CT., AUSTIN"
          />

          {/* May 24, 2026 — replaced unverifiable brokerage claims with the
              platforms our output is sized for. Audit finding: claiming
              named brokerages without contracts is legal/credibility risk. */}
          <Marquee
            items={[
              "BUILT FOR  ·  Reels",
              "BUILT FOR  ·  TikTok",
              "BUILT FOR  ·  the MLS",
              "BUILT FOR  ·  Stories",
              "BUILT FOR  ·  Zillow video",
              "BUILT FOR  ·  Realtor.com",
              "BUILT FOR  ·  Compass · eXp · KW · CB agents",
              "BUILT FOR  ·  the night you list",
            ]}
          />

          {/* Why */}
          <section className="lux-section lg:py-32 lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow="THE NUMBERS THAT MATTER"
                  title="Faster than BoxBrownie."
                  italic="Cheaper than a videographer."
                  lede="One BoxBrownie staged room is $24 with a 48-hour wait. One videographer shoot is $300–$1,000 and takes a week. The Vantage is 3 minutes and $79 a month, unlimited."
                />
              </div>
              <div className="lg:col-span-7">
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { v: "3 min", l: "RENDER TIME", c: "vs 48hr BoxBrownie · vs 5-day videographer" },
                    { v: "$79", l: "FULL MONTH", c: "vs $300–$1,000 per shoot from a freelancer" },
                    { v: "1080p", l: "VERTICAL · 9:16", c: "Native Reels · TikTok · MLS · Zillow" },
                    { v: "60", l: "FREE CREDITS", c: "One full Done-For-You reel — no card" },
                  ].map((s) => (
                    <div key={s.l} className="p-8 lux-bg-cream" style={{ border: "1px solid var(--lux-hairline)" }}>
                      <div className="lux-display" style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)", lineHeight: 1 }}>{s.v}</div>
                      <div className="lux-eyebrow mt-4" style={{ color: "var(--lux-rust)" }}>{s.l}</div>
                      <div className="mt-3 text-sm" style={{ color: "var(--lux-ink)", fontStyle: "italic" }}>{s.c}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Before/after */}
          <section className="lux-section lux-bg-cream">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE METAMORPHOSIS"
                title="Drag the seam."
                italic="Watch your listing wake up."
                align="center"
                className="mb-16"
              />
              <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                <BeforeAfterSlider
                  before="/vantage/setup/before.webp"
                  after="/vantage/setup/after.jpeg"
                  afterVideo="/vantage/setup/video.mp4"
                  ratio="4/5"
                  caption="GREATROOM · DRESSED FROM EMPTY"
                />
                <BeforeAfterSlider
                  before="/vantage/ranch-clean/before.webp"
                  after="/vantage/ranch-clean/input.png"
                  afterVideo="/vantage/ranch-clean/video.mp4"
                  ratio="4/5"
                  caption="OUTDOOR RECLAIM · CLEANED & READY TO LIST"
                />
              </div>
            </div>
          </section>

          {/* Reel */}
          <section className="lux-section lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="lux-container">
              <VideoReel
                eyebrow="REAL CUSTOMER LISTINGS · APRIL 2026"
                title="What 12 seconds looks like."
                clips={[
                  { src: "/vantage/just-listed/video.mp4", label: "1132 Elm Court", byline: "JUST LISTED · $1.2M" },
                  { src: "/vantage/sketch/result.mp4", label: "84 Olive Drive — Sketch Reveal", byline: "LOS ANGELES · $2.4M" },
                  { src: "/vantage/ranch-build/result.mp4", label: "62 Cedar Crest — Build Story", byline: "BOSTON · $3.1M" },
                  { src: "/vantage/setup/video.mp4", label: "Open House Setup", byline: "DRESSED FROM EMPTY" },
                ]}
              />
            </div>
          </section>

          {/* ROI */}
          <section className="lux-section lg:py-32 lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow="THE MATH"
                  title="One extra closing."
                  italic="Pays for 12 months."
                  lede="Move the dials. See what one extra sale (just one) means for your yearly GCI. The spreadsheet makes the case."
                />
              </div>
              <div className="lg:col-span-7">
                <ROICalculator variant="agent" defaultListings={36} defaultRate={18000} />
              </div>
            </div>
          </section>

          <StatStrip
            variant="cream"
            stats={[
              { value: "3 min", label: "RENDER TIME · EVERY REEL" },
              { value: "$79", label: "PRO · UNLIMITED MONTHLY" },
              { value: "60 cr", label: "FREE AT SIGNUP · NO CARD" },
              { value: "30 day", label: "MONEY-BACK · PRO + STUDIO" },
            ]}
          />

          {/* Invitation */}
          <section className="lux-section lg:py-44 relative overflow-hidden lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: `url(${ax.exterior})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(14,14,12,0.85), rgba(14,14,12,0.95))" }} />
            <div className="relative lux-container text-center py-32 md:py-44">
              <h2 className="lux-display" style={{ fontSize: "clamp(2.8rem, 7vw, 6rem)", lineHeight: 0.92, color: "var(--lux-bone)" }}>
                Make your next listing
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>impossible to scroll past.</span>
              </h2>
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
                <Link to={destination} className="lux-btn lux-btn-bone">
                  {isLoggedIn ? "CREATE A LISTING FILM →" : "BEGIN FREE — 50 CREDITS →"}
                </Link>
                <Link to="/contact" className="lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-bone)" }}>
                  <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-bone)" }} />
                  TEAM & BROKERAGE PLANS
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
              <span className="lux-eyebrow hidden sm:inline" style={{ color: "var(--lux-champagne)" }}>60 free credits · No card required</span>
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

export default AgentsLanding;
