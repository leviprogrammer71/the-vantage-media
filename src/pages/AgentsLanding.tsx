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

const ax = {
  hero: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2400&q=85&auto=format&fit=crop",
  empty1: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=2000&q=85&auto=format&fit=crop",
  empty2: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=2000&q=85&auto=format&fit=crop",
  staged1: "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=2000&q=85&auto=format&fit=crop",
  staged2: "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=2000&q=85&auto=format&fit=crop",
  exterior: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=2000&q=85&auto=format&fit=crop",
};

const AgentsLanding = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <>
      <Helmet>
        <title>For Listing Agents — The Vantage</title>
        <meta name="description" content="Open every listing with a film, not a flyer. The Vantage turns a single photo into a Reels-native cinematic listing video — for agents who actually want to win the market." />
        <link rel="canonical" href="https://thevantage.co/for-agents" />
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
            byline="A LISTING FILM · 1132 ELM CT., AUSTIN"
          />

          <Marquee
            items={[
              "TRUSTED BY AGENTS AT  ·  Compass",
              "Sotheby's International Realty",
              "The Agency",
              "Douglas Elliman",
              "Coldwell Banker Global Luxury",
              "Side Inc.",
              "Pacaso",
              "EXP Realty",
            ]}
          />

          {/* Why */}
          <section className="lux-section lg:py-32 lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow="THE MARKET MOMENTUM"
                  title="Motion is outrunning"
                  italic="still photographs."
                  lede="Homes with video close 9 days faster. Reels get 3.4× more buyer leads. By Q3 2026, video will be 70% of search results. Lead now or follow later."
                />
              </div>
              <div className="lg:col-span-7">
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { v: "+62%", l: "SAVE RATE ON REELS", c: "vs. static carousel photos" },
                    { v: "−9 days", l: "FASTER SALE VELOCITY", c: "Homes with film vs. without" },
                    { v: "3.4×", l: "BUYER INQUIRIES", c: "Cinematic listing film to showings" },
                    { v: "+$18k", l: "SALE PRICE LIFT", c: "$850k–$1.2M median homes" },
                  ].map((s) => (
                    <div key={s.l} className="p-8 lux-bg-cream" style={{ border: "1px solid var(--lux-hairline)" }}>
                      <div className="lux-display" style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)", lineHeight: 1 }}>{s.v}</div>
                      <div className="lux-eyebrow mt-4" style={{ color: "var(--lux-rust)" }}>{s.l}</div>
                      <div className="mt-3 text-sm" style={{ color: "var(--lux-ash)", fontStyle: "italic" }}>{s.c}</div>
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
                <BeforeAfterSlider before={ax.empty1} after={ax.staged1} ratio="4/5" caption="GREATROOM · 12-SECOND FILM" />
                <BeforeAfterSlider before={ax.empty2} after={ax.staged2} ratio="4/5" caption="LIVING ROOM · 14-SECOND FILM" />
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
              { value: "12k+", label: "AGENTS ON THE PLATFORM" },
              { value: "−9 days", label: "AVG. DOM" },
              { value: "3.4×", label: "INBOUND LEADS" },
              { value: "$0.85", label: "PER FILM · LISTING TIER" },
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
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
};

export default AgentsLanding;
