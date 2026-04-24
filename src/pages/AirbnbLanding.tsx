import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import EditorialHero from "@/components/lux/EditorialHero";
import StatStrip from "@/components/lux/StatStrip";
import VideoReel from "@/components/lux/VideoReel";
import BeforeAfterSlider from "@/components/lux/BeforeAfterSlider";
import SectionHeading from "@/components/lux/SectionHeading";
import Marquee from "@/components/lux/Marquee";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const bx = {
  hero: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=2400&q=85&auto=format&fit=crop",
  emptyA: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=2000&q=85&auto=format&fit=crop",
  stagedA: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=2000&q=85&auto=format&fit=crop",
  emptyB: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=2000&q=85&auto=format&fit=crop",
  stagedB: "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=2000&q=85&auto=format&fit=crop",
  pool: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2000&q=85&auto=format&fit=crop",
};

const AirbnbLanding = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <>
      <Helmet>
        <title>For Short-Term Hosts — The Vantage</title>
        <meta name="description" content="Outperform every other Airbnb in your zipcode. The Vantage turns one photo into a cinematic reel guests can't stop watching — and can't stop booking." />
        <link rel="canonical" href="https://thevantage.co/for-airbnb" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          <EditorialHero
            eyebrow="A DOSSIER FOR THE SHORT-TERM HOST"
            edition="The Host's Edition"
            title={
              <>
                Make every
                <br />
                listing feel
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>worth the trip.</span>
              </>
            }
            subtitle="One frame of your finished space. A 12-second cinematic reel that turns scrollers into bookers — for the platforms that actually drive direct revenue."
            primaryCta={{ label: isLoggedIn ? "CREATE A LISTING REEL →" : "BEGIN FREE — 50 CREDITS →", to: destination }}
            rightImage={bx.hero}
            byline="THE WALDEN POOL HOUSE · JOSHUA TREE"
          />

          <Marquee
            items={[
              "OPTIMIZED FOR  ·  Airbnb",
              "VRBO",
              "Booking.com",
              "Hipcamp",
              "Plum Guide",
              "Direct.bookings",
              "Hopper Homes",
            ]}
          />

          <section className="lux-section lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow="WHY IT WORKS"
                  title="The first three"
                  italic="seconds decide it."
                  lede="Guests skim 28 listings before they book one. The reel-format hero is the only thing that survives the swipe. Static photos get a glance. A cinematic film gets a tap."
                />
              </div>
              <div className="lg:col-span-7">
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { v: "+47%", l: "BOOKING CONVERSION" },
                    { v: "+$182", l: "ADR · LIFT" },
                    { v: "+38", l: "DAYS BOOKED / YR" },
                    { v: "−21%", l: "CANCELLATION RATE" },
                  ].map((s) => (
                    <div key={s.l} className="p-8 lux-bg-cream" style={{ border: "1px solid var(--lux-hairline)" }}>
                      <div className="lux-display" style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)", lineHeight: 1 }}>{s.v}</div>
                      <div className="lux-eyebrow mt-4" style={{ color: "var(--lux-rust)" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="lux-section lux-bg-cream">
            <div className="lux-container">
              <SectionHeading eyebrow="THE METAMORPHOSIS" title="Drag the seam." italic="Watch the hook form." align="center" className="mb-16" />
              <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                <BeforeAfterSlider before={bx.emptyA} after={bx.stagedA} ratio="4/5" caption="MASTER SUITE · 9-SECOND REEL" />
                <BeforeAfterSlider before={bx.emptyB} after={bx.stagedB} ratio="4/5" caption="GREATROOM · 12-SECOND REEL" />
              </div>
            </div>
          </section>

          <section className="lux-section lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="lux-container">
              <VideoReel
                eyebrow="LIVE LISTINGS · APRIL 2026"
                title="A booking, in 12 seconds."
                clips={[
                  { src: "/videos/transform-1.mp4", label: "The Walden Pool House", byline: "JOSHUA TREE · 96% OCC." },
                  { src: "/videos/transform-2.mp4", label: "Olive & 14th", byline: "TOPANGA · 89% OCC." },
                ]}
              />
            </div>
          </section>

          <StatStrip
            variant="cream"
            stats={[
              { value: "+47%", label: "BOOKING LIFT" },
              { value: "+$182", label: "ADR / NIGHT" },
              { value: "9 sec", label: "AVG. REEL LENGTH" },
              { value: "$0.85", label: "PER REEL · HOST TIER" },
            ]}
          />

          <section className="lux-section relative overflow-hidden lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: `url(${bx.pool})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(14,14,12,0.85), rgba(14,14,12,0.95))" }} />
            <div className="relative lux-container text-center py-32">
              <h2 className="lux-display" style={{ fontSize: "clamp(2.8rem, 7vw, 6rem)", lineHeight: 0.92, color: "var(--lux-bone)" }}>
                The next booking
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>is one reel away.</span>
              </h2>
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
                <Link to={destination} className="lux-btn lux-btn-bone">
                  {isLoggedIn ? "CREATE A LISTING REEL →" : "BEGIN FREE — 50 CREDITS →"}
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

export default AirbnbLanding;
