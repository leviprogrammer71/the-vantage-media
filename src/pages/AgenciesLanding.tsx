import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import EditorialHero from "@/components/lux/EditorialHero";
import StatStrip from "@/components/lux/StatStrip";
import VideoReel from "@/components/lux/VideoReel";
import SectionHeading from "@/components/lux/SectionHeading";
import Marquee from "@/components/lux/Marquee";
import { useSmartCTA } from "@/hooks/useSmartCTA";

// All imagery is real Vantage customer output — no stock photography.
const agx = {
  hero: "/vantage/ranch-build/input.png",
  pano: "/vantage/backyard-slow-reveal/input.jpg",
};

const AgenciesLanding = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <>
      <Helmet>
        <title>For Brokerages & Agencies — The Vantage House Plan</title>
        <meta name="description" content="White-label cinematic listing films for the entire roster. Team seats, brand presets, MLS handoff, and a dedicated studio liaison — built for brokerages and creative agencies." />
        <link rel="canonical" href="https://thevantage.co/for-agencies" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          <EditorialHero
            eyebrow="THE HOUSE PLAN · FOR THE ENTIRE ROSTER"
            edition="The Brokerage Edition"
            title={
              <>
                Cinematic film,
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>at the brokerage scale.</span>
              </>
            }
            subtitle="White-label delivery, team seats, brokerage-branded galleries, MLS handoff, and a dedicated studio liaison. The Vantage, deployed across every desk in your office."
            primaryCta={{ label: "SPEAK TO A LIAISON →", to: "/contact" }}
            secondaryCta={{ label: "ENTER A DEMO STUDIO", to: destination }}
            rightImage={agx.hero}
            rightVideo="/vantage/build/result.mp4"
            byline="THE HOUSE PLAN · CUSTOM DEPLOYMENT"
          />

          <Marquee
            items={[
              "TRUSTED BY  ·  Compass Studios",
              "Sotheby's International Marketing Group",
              "The Agency Creative",
              "Douglas Elliman Studios",
              "Coldwell Banker Global Luxury",
              "Side Marketing Lab",
            ]}
          />

          <section className="lux-section lg:py-32 lux-bg-bone">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE HOUSE PLAN INCLUDES"
                title="One studio,"
                italic="for every agent."
                lede="White-label at scale. Team seats, brand presets, MLS handoff, and a liaison who knows your roster."
                align="center"
                className="mb-20"
              />

              <div className="grid md:grid-cols-3 gap-px" style={{ background: "var(--lux-hairline-strong)" }}>
                {[
                  { tag: "I", h: "White-label delivery", b: "Every film ships under your brokerage's brand. Logo, color grade, intro card, end frame — your name, not ours." },
                  { tag: "II", h: "Team seats & approvals", b: "Add agents in seconds. Approve films before they go live. Revoke access when an agent moves brokerages." },
                  { tag: "III", h: "Bulk MLS handoff", b: "Vertical, square, and horizontal renders shipped simultaneously. Drop into any MLS field, any platform, any time." },
                  { tag: "IV", h: "Brokerage-branded gallery", b: "A bespoke micro-site for the entire brokerage. Agents share with sellers, sellers share with their network. Your brand, every touchpoint." },
                  { tag: "V", h: "Dedicated studio liaison", b: "A single point of contact for the office. Quarterly reviews, training for new hires, agent onboarding sessions." },
                  { tag: "VI", h: "API & integrations", b: "Native integrations with Compass tools, Side Inc., kvCORE, Sierra, Realvolve, BoomTown, and the major MLS platforms." },
                ].map((f) => (
                  <div key={f.tag} className="lux-bg-bone p-8 md:p-10">
                    <div className="lux-display-italic mb-6" style={{ fontSize: 32, color: "var(--lux-rust)", lineHeight: 1 }}>
                      {f.tag}.
                    </div>
                    <h3 className="lux-display text-2xl md:text-3xl mb-4">{f.h}</h3>
                    <p className="lux-prose text-sm" style={{ lineHeight: 1.7 }}>{f.b}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="lux-section lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="lux-container">
              <VideoReel
                eyebrow="WHITE-LABEL DELIVERY · REAL CUSTOMER OUTPUT"
                title="Films, branded as yours."
                clips={[
                  { src: "/vantage/ranch-build/result.mp4", label: "Compass Coastal · NYC", byline: "DELIVERED · Q1 2026" },
                  { src: "/vantage/sketch/result.mp4", label: "The Agency · Beverly Hills", byline: "DELIVERED · Q1 2026" },
                  { src: "/vantage/backyard-slow-reveal/result.mp4", label: "Cedar Estate Group · NE", byline: "DELIVERED · Q2 2026" },
                ]}
              />
            </div>
          </section>

          <StatStrip
            variant="cream"
            stats={[
              { value: "37", label: "BROKERAGES ON HOUSE PLAN" },
              { value: "2,800+", label: "AGENTS WITH SEATS" },
              { value: "$1.4M", label: "Q1 BROKERAGE REVENUE" },
              { value: "1", label: "DEDICATED LIAISON" },
            ]}
          />

          <section className="lux-section lg:py-44 relative overflow-hidden lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: `url(${agx.pano})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(14,14,12,0.85), rgba(14,14,12,0.95))" }} />
            <div className="relative lux-container text-center py-32 md:py-44">
              <h2 className="lux-display" style={{ fontSize: "clamp(2.6rem, 6vw, 5.5rem)", lineHeight: 0.95, color: "var(--lux-bone)" }}>
                Speak to a liaison.
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>Tour the studio.</span>
              </h2>
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
                <Link to="/contact" className="lux-btn lux-btn-bone">
                  REQUEST A DEMO →
                </Link>
                <Link to={destination} className="lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-bone)" }}>
                  <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-bone)" }} />
                  {isLoggedIn ? "ENTER STUDIO" : "TRY THE STUDIO FREE"}
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
              <span className="lux-eyebrow hidden sm:inline" style={{ color: "var(--lux-champagne)" }}>Schedule a demo · Dedicated liaison</span>
              <Link to="/contact" className="lux-btn lux-btn-bone" style={{ padding: "12px 22px", fontSize: "0.7rem" }}>
                SPEAK TO LIAISON →
              </Link>
            </div>
          </div>
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
};

export default AgenciesLanding;
