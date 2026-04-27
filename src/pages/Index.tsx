import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import EditorialHero from "@/components/lux/EditorialHero";
import StatStrip from "@/components/lux/StatStrip";
import Marquee from "@/components/lux/Marquee";
import VideoReel from "@/components/lux/VideoReel";
import BeforeAfterSlider from "@/components/lux/BeforeAfterSlider";
import CaseStudy from "@/components/lux/CaseStudy";
import ROICalculator from "@/components/lux/ROICalculator";
import SectionHeading from "@/components/lux/SectionHeading";
import OAuthReturnHandler from "@/components/OAuthReturnHandler";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const ux = {
  hero: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=85&auto=format&fit=crop",
  interior1: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2000&q=85&auto=format&fit=crop",
  interior2: "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=2000&q=85&auto=format&fit=crop",
  exterior1: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=2000&q=85&auto=format&fit=crop",
  exterior2: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=2000&q=85&auto=format&fit=crop",
  empty1: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=2000&q=85&auto=format&fit=crop",
  empty2: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=2000&q=85&auto=format&fit=crop",
  kitchen1: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=2000&q=85&auto=format&fit=crop",
  kitchen2: "https://images.unsplash.com/photo-1556909001-f5648b8d2348?w=2000&q=85&auto=format&fit=crop",
  bathroom: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=2000&q=85&auto=format&fit=crop",
  bathroomBefore: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=2000&q=85&auto=format&fit=crop",
  livingRoom: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=2000&q=85&auto=format&fit=crop",
  living2: "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=2000&q=85&auto=format&fit=crop",
  bedroom: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=2000&q=85&auto=format&fit=crop",
  studio1: "https://images.unsplash.com/photo-1494891848038-7bd202a2afeb?w=1600&q=85&auto=format&fit=crop",
  studio2: "https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=1600&q=85&auto=format&fit=crop",
};

const Index = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  // Live counter: base 47 + 3 per hour since midnight
  const [liveCount, setLiveCount] = useState(47);
  useEffect(() => {
    const now = new Date();
    const hoursSinceMidnight = now.getHours() + now.getMinutes() / 60;
    const count = 47 + Math.floor(hoursSinceMidnight * 3);
    setLiveCount(count);
  }, []);

  return (
    <>
      <Helmet>
        <title>The Vantage — Cinematic Listing Films, From a Single Frame</title>
        <meta name="title" content="The Vantage — Cinematic Listing Films, From a Single Frame" />
        <meta
          name="description"
          content="One photograph. A scroll-stopping cinematic listing film. Built for the world's most exacting real estate photographers, agents, and builders."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://thevantage.co/" />
        <meta property="og:title" content="The Vantage — Cinematic Listing Films" />
        <meta property="og:description" content="One photo in. A cinematic before-and-after listing film out — delivered in minutes, not days." />
        <meta property="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://thevantage.co/" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <OAuthReturnHandler />
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          <EditorialHero rightImage={ux.hero} />

          {/* Stockists / Press Marquee */}
          <Marquee
            items={[
              "AS SEEN IN  ·  Inman",
              "Featured  ·  HousingWire",
              "Architectural Digest",
              "REAL Trends",
              "Shoutout LA",
              "PetaPixel",
              "Real Producer",
              "ASMP Quarterly",
              "Forbes Real Estate",
            ]}
          />

          {/* THE STUDIO — manifesto */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow="THE STUDIO"
                  title={<>A new genre of <span className="lux-display-italic">listing film.</span></>}
                  lede="The Vantage is a single-frame transformation studio. We turn one photograph — the one your client actually shot — into a cinematic vertical film built for Reels, TikTok, and the algorithm."
                />
              </div>
              <div className="lg:col-span-7">
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    {
                      tag: "I.",
                      h: "Single-frame transformation",
                      b: "No before photo required. Our model reconstructs the prior state from architectural cues, then animates the metamorphosis.",
                    },
                    {
                      tag: "II.",
                      h: "Cinematic, not synthetic",
                      b: "Slow drone-style camera moves, parallax depth, real physics. The kind of film a top operator would charge $2,800 to deliver.",
                    },
                    {
                      tag: "III.",
                      h: "Vertical-first, scroll-native",
                      b: "1080p · 9:16 · 8–12 seconds — engineered for the four formats that actually convert in 2026.",
                    },
                    {
                      tag: "IV.",
                      h: "White-glove for the trade",
                      b: "Studio-grade outputs, watermark removal, brand presets, MLS handoff, and a private agent gallery — included.",
                    },
                  ].map((p) => (
                    <div
                      key={p.tag}
                      className="p-8 lux-bg-parchment"
                      style={{ border: "1px solid var(--lux-hairline)" }}
                    >
                      <div className="lux-display-italic mb-4" style={{ fontSize: 22, color: "var(--lux-rust)" }}>{p.tag}</div>
                      <div className="lux-display text-2xl mb-3">{p.h}</div>
                      <p className="lux-prose text-sm" style={{ lineHeight: 1.65 }}>{p.b}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* THE METAMORPHOSIS — interactive before/after */}
          <section className="lux-section lux-bg-cream">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE METAMORPHOSIS"
                title="Drag the seam."
                italic="See what the lens couldn't."
                lede="Every film begins with a single photograph. Slide the divider to witness the moment our studio brings stillness into motion."
                align="center"
                className="mb-16"
              />

              <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                <BeforeAfterSlider
                  before={ux.empty1}
                  after={ux.kitchen1}
                  beforeLabel="MOMENT 00:00"
                  afterLabel="FRAME 04:18"
                  ratio="4/5"
                  caption="KITCHEN · BEACON HILL · 18-SECOND FILM"
                />
                <BeforeAfterSlider
                  before={ux.empty2}
                  after={ux.livingRoom}
                  beforeLabel="MOMENT 00:00"
                  afterLabel="FRAME 03:52"
                  ratio="4/5"
                  caption="LIVING ROOM · NOLITA · 14-SECOND FILM"
                />
              </div>

              <div className="mt-16 text-center">
                <Link
                  to={destination}
                  className="lux-btn"
                  style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
                >
                  {isLoggedIn ? "ENTER THE STUDIO →" : "BEGIN A FILM — FREE →"}
                </Link>
                <p className="lux-eyebrow mt-6" style={{ color: "var(--lux-ash)" }}>
                  50 CREDITS GRATIS · NO CARD · INSTANT ACCESS
                </p>
                <p className="lux-prose text-sm mt-3" style={{ color: "var(--lux-brass)" }}>
                  ✦ {liveCount} studios began a film today
                </p>
              </div>
            </div>
          </section>

          {/* THE FILM REEL */}
          <section className="lux-section lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="lux-container">
              <div className="grid lg:grid-cols-12 gap-12 mb-16 items-end">
                <div className="lg:col-span-7">
                  <div className="lux-eyebrow mb-6 flex items-center gap-3" style={{ color: "var(--lux-champagne)" }}>
                    <span style={{ display: "inline-block", width: 36, height: 1, background: "var(--lux-champagne)" }} />
                    THE FILM REEL · APRIL 2026
                  </div>
                  <h2
                    className="lux-display"
                    style={{
                      fontSize: "clamp(2.6rem, 5.5vw, 5.2rem)",
                      color: "var(--lux-bone)",
                      lineHeight: 0.96,
                    }}
                  >
                    Recently delivered
                    <br />
                    <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>to studios in 17 cities.</span>
                  </h2>
                </div>
                <div className="lg:col-span-5">
                  <p className="lux-prose" style={{ color: "rgba(244,239,230,0.78)", maxWidth: 420 }}>
                    Each film below was generated from a single still photograph submitted by a working
                    real estate photographer or builder. Average render time: 3 minutes 14 seconds.
                  </p>
                </div>
              </div>

              <VideoReel
                eyebrow="THIS WEEK'S DISPATCH"
                title="The 04.26 Selection"
                clips={[
                  { src: "/videos/transform-1.mp4", label: "The Beacon Residence", byline: "ATWOOD STUDIO · MASS." },
                  { src: "/videos/transform-2.mp4", label: "Olive & 14th Pool House", byline: "MERIDIAN · LOS ANGELES" },
                ]}
              />
            </div>
          </section>

          {/* THE FORMULA — How it works, editorial */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE FORMULA"
                title="Three movements."
                italic="One film."
                lede="No video editing required. No before photo required. Just one finished frame and a short walk to your kettle."
                align="center"
                className="mb-20"
              />

              <div className="grid md:grid-cols-3 gap-px lux-bg-cream" style={{ background: "var(--lux-hairline-strong)" }}>
                {[
                  {
                    n: "I.",
                    h: "Submit one frame",
                    b: "Drop a single after photograph — the polished interior, the finished pool, the staged living room. JPEG, PNG, HEIC. We accept what you shoot.",
                    sub: "00:00:08",
                  },
                  {
                    n: "II.",
                    h: "The studio composes",
                    b: "Our model reconstructs the prior state, then animates the metamorphosis with cinematic camera moves, real physics, and a measured tempo.",
                    sub: "00:03:14",
                  },
                  {
                    n: "III.",
                    h: "Receive the film",
                    b: "1080p vertical, watermark-free, ready for Reels, TikTok, YouTube Shorts, and your private agent gallery.",
                    sub: "READY · 00:11:00",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="lux-bg-bone p-10 md:p-14"
                  >
                    <div
                      className="lux-display-italic mb-8"
                      style={{ fontSize: 56, color: "var(--lux-rust)", lineHeight: 1 }}
                    >
                      {s.n}
                    </div>
                    <h3 className="lux-display text-3xl mb-5">{s.h}</h3>
                    <p className="lux-prose mb-10" style={{ fontSize: 16 }}>{s.b}</p>
                    <div
                      className="lux-eyebrow pt-5"
                      style={{ borderTop: "1px solid var(--lux-hairline)", color: "var(--lux-brass)" }}
                    >
                      ⏱ {s.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CASE STUDIES */}
          <section className="lux-section lux-bg-parchment">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE CLIENTELE"
                title="Worn by working studios."
                lede="A small selection of films delivered this quarter to operators who shoot, sell, and build for the upper end of the market."
                align="center"
                className="mb-24"
              />

              <div className="flex flex-col gap-32">
                <CaseStudy
                  index="01"
                  studio="Atwood Photographic"
                  city="BEACON HILL · BOSTON"
                  quote="We added it as a $450 line item the next morning. Eleven of our twelve March shoots took it."
                  body="Maya Atwood runs a four-person studio shooting $2.5M+ residential listings across Greater Boston. Cinematic listing video used to mean a second crew, a second invoice, and 5–7 days of post."
                  metrics={[
                    { value: "+$5,400", label: "MAR · ADD-ON" },
                    { value: "92%", label: "ATTACH RATE" },
                    { value: "0 hrs", label: "POST-PRODUCTION" },
                  ]}
                  before={ux.empty1}
                  after={ux.interior1}
                  beforeLabel="THE BARE FRAME"
                  afterLabel="THE COMPOSED FRAME"
                />

                <CaseStudy
                  index="02"
                  studio="Meridian Visual Co."
                  city="SILVER LAKE · LOS ANGELES"
                  reverse
                  quote="The agents stopped asking for drone. They started asking for The Vantage."
                  body="A boutique two-person video studio that previously charged $1,800 per cinematic listing. Now bundles a Vantage film into every $850 photo package and hits volume their old workflow couldn't support."
                  metrics={[
                    { value: "3.4×", label: "MONTHLY VOLUME" },
                    { value: "+62%", label: "AGENT BOOKINGS" },
                    { value: "$28k", label: "Q1 UPLIFT" },
                  ]}
                  before={ux.empty2}
                  after={ux.exterior1}
                  beforeLabel="UNFURNISHED"
                  afterLabel="DELIVERED"
                />

                <CaseStudy
                  index="03"
                  studio="House of Larsen"
                  city="WEST VILLAGE · NEW YORK"
                  quote="A listing video used to be a strategic decision. Now it's part of every shoot."
                  body="A husband-and-wife studio specializing in pre-war NYC interiors. Switched their entire offering to single-frame motion films in February. Booked solid through May."
                  metrics={[
                    { value: "248", label: "FILMS / Q1" },
                    { value: "$117k", label: "NEW REVENUE" },
                    { value: "0", label: "RE-EDITS REQUESTED" },
                  ]}
                  before={ux.empty1}
                  after={ux.bedroom}
                  beforeLabel="UNFURNISHED · 02:14"
                  afterLabel="STAGED · DELIVERED"
                />
              </div>
            </div>
          </section>

          {/* STAT STRIP */}
          <StatStrip
            variant="ink"
            stats={[
              { value: "12,400", label: "FILMS DELIVERED · 2026" },
              { value: "248", label: "WORKING STUDIOS" },
              { value: "3 min", label: "AVG. RENDER TIME" },
              { value: "$0.42", label: "PER FILM · AT VOLUME" },
            ]}
          />

          {/* THE ECONOMICS — ROI Calculator */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow="THE ECONOMICS"
                  title="A math problem"
                  italic="that solves itself."
                  lede="Move the dials below to see what cinematic motion adds to your monthly invoice. We pulled the defaults from active-studio cohort data, so the numbers are conservative."
                />
                <div className="mt-12 flex flex-col gap-4">
                  <Link to="/pricing" className="lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-ink)" }}>
                    <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-ink)" }} />
                    SEE THE FULL PRICE LIST
                  </Link>
                  <Link to="/real-estate-photographers" className="lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-ink)" }}>
                    <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-ink)" }} />
                    READ THE PHOTOGRAPHER DOSSIER
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-7">
                <ROICalculator variant="photographer" />
              </div>
            </div>
          </section>

          {/* FOR WHOM */}
          <section className="lux-section lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="lux-container">
              <div className="grid lg:grid-cols-12 gap-10 mb-20">
                <div className="lg:col-span-7">
                  <div className="lux-eyebrow mb-6" style={{ color: "var(--lux-champagne)" }}>
                    ✦ FOR WHOM IT IS MADE
                  </div>
                  <h2 className="lux-display" style={{ fontSize: "clamp(2.6rem, 5.4vw, 5rem)", color: "var(--lux-bone)", lineHeight: 0.95 }}>
                    Six trades.
                    <br />
                    <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>One quiet weapon.</span>
                  </h2>
                </div>
                <div className="lg:col-span-5">
                  <p className="lux-prose" style={{ color: "rgba(244,239,230,0.78)" }}>
                    The Vantage is built for the operators whose finished work deserves better than a static
                    photograph in a feed. If you transform spaces — physically or visually — this is your studio.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-px" style={{ background: "rgba(244,239,230,0.12)" }}>
                {[
                  { tag: "I", title: "Real Estate Photographers", body: "Add a $250–$650 cinematic upsell to every shoot. No second crew, no post-production overhead.", to: "/real-estate-photographers" },
                  { tag: "II", title: "Listing & Buyer Agents", body: "Open houses with a film, not a flyer. Turn every Zillow listing into a Reels-native asset.", to: "/for-agents" },
                  { tag: "III", title: "Short-Term Hosts", body: "Outperform every other Airbnb in your zipcode. The metamorphosis hooks bookings.", to: "/for-airbnb" },
                  { tag: "IV", title: "Builders & Renovators", body: "Show the build story without filming the build. Inbound leads up 3–5×.", to: "/general-construction" },
                  { tag: "V", title: "Pool & Landscape", body: "Turn the empty backyard into the dream yard — in seconds, not seasons.", to: "/pool-builders" },
                  { tag: "VI", title: "Brokerages & Agencies", body: "White-label, team seats, brand presets, and a private gallery for every agent on your roster.", to: "/for-agencies" },
                ].map((v) => (
                  <Link
                    key={v.tag}
                    to={v.to}
                    className="lux-bg-ink p-8 md:p-10 group transition-colors"
                    style={{ color: "var(--lux-bone)" }}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <span className="lux-eyebrow" style={{ color: "var(--lux-champagne)" }}>VOL. {v.tag}</span>
                      <span className="lux-eyebrow" style={{ color: "rgba(244,239,230,0.5)" }}>↗</span>
                    </div>
                    <h3 className="lux-display text-2xl md:text-3xl mb-4" style={{ color: "var(--lux-bone)" }}>{v.title}</h3>
                    <p className="lux-prose text-sm" style={{ color: "rgba(244,239,230,0.7)" }}>{v.body}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* PRICING TEASER */}
          <section className="lux-section lux-bg-cream">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE PRICE LIST"
                title="No subscriptions."
                italic="No ladders. No surprises."
                lede="Credits, paid as you create. Top up when you need to. Volume tiers for working studios and brokerages, on request."
                align="center"
                className="mb-20"
              />

              <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                {[
                  {
                    tier: "STARTER",
                    name: "The Atelier",
                    price: "Free",
                    desc: "50 credits. Roughly 12 finished films.",
                    items: ["1080p · 9:16 vertical", "Studio watermark", "Personal use"],
                    cta: "BEGIN FREE →",
                    to: "/signup",
                  },
                  {
                    tier: "STUDIO",
                    name: "The Studio",
                    price: "$129",
                    desc: "650 credits. ~160 films. Most popular for working photographers.",
                    items: ["Watermark removal", "Brand presets & color grading", "Private agent gallery", "Priority render queue"],
                    cta: "ENTER STUDIO →",
                    to: "/pricing",
                    featured: true,
                  },
                  {
                    tier: "HOUSE",
                    name: "The House",
                    price: "Custom",
                    desc: "For brokerages, MLS partners, and agencies with team seats.",
                    items: ["White-label delivery", "Bulk MLS handoff", "Team seats & approvals", "Dedicated studio liaison"],
                    cta: "SPEAK TO US →",
                    to: "/contact",
                  },
                ].map((p) => (
                  <div
                    key={p.tier}
                    className={`p-10 md:p-12 ${p.featured ? "lux-bg-ink" : "lux-bg-bone"}`}
                    style={{
                      border: "1px solid var(--lux-hairline)",
                      color: p.featured ? "var(--lux-bone)" : "var(--lux-ink)",
                      position: "relative",
                    }}
                  >
                    {p.featured && (
                      <span
                        className="lux-eyebrow absolute -top-3 left-10"
                        style={{
                          color: "var(--lux-ink)",
                          background: "var(--lux-champagne)",
                          padding: "6px 12px",
                        }}
                      >
                        ✦ MOST CHOSEN
                      </span>
                    )}
                    <div className="lux-eyebrow" style={{ color: p.featured ? "var(--lux-champagne)" : "var(--lux-brass)" }}>
                      {p.tier}
                    </div>
                    <h3
                      className="lux-display mt-3"
                      style={{ fontSize: "clamp(2rem, 3.4vw, 2.8rem)", color: p.featured ? "var(--lux-bone)" : "var(--lux-ink)" }}
                    >
                      {p.name}
                    </h3>
                    <div
                      className="lux-display mt-6"
                      style={{ fontSize: "clamp(2.6rem, 4.4vw, 3.6rem)", lineHeight: 1 }}
                    >
                      {p.price}
                    </div>
                    <p className="lux-prose mt-4 text-sm" style={{ color: p.featured ? "rgba(244,239,230,0.78)" : "var(--lux-ash)" }}>
                      {p.desc}
                    </p>
                    <ul className="mt-10 flex flex-col gap-3">
                      {p.items.map((it) => (
                        <li
                          key={it}
                          className="flex items-start gap-3"
                          style={{ color: p.featured ? "var(--lux-bone)" : "var(--lux-ink)" }}
                        >
                          <span style={{ color: "var(--lux-rust)", marginTop: 4 }}>—</span>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15 }}>{it}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={p.to}
                      className="lux-eyebrow inline-flex items-center gap-3 mt-12"
                      style={{ color: p.featured ? "var(--lux-champagne)" : "var(--lux-ink)" }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 24,
                          height: 1,
                          background: p.featured ? "var(--lux-champagne)" : "var(--lux-ink)",
                        }}
                      />
                      {p.cta}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                  <SectionHeading
                    eyebrow="QUIET QUESTIONS"
                    title="Asked, often."
                    italic="Answered, plainly."
                  />
                </div>
                <div className="lg:col-span-8">
                  {[
                    {
                      q: "What does the studio actually deliver?",
                      a: "A single 8–12 second cinematic film, 1080p, vertical 9:16, with a slow drone-style camera move, parallax depth, and real motion physics. No watermark on paid plans. No audio — keep your sound design yours.",
                    },
                    {
                      q: "Do I need a 'before' photograph?",
                      a: "No. We reconstruct the prior state from architectural cues in your finished frame. That's the heart of the studio. One photo in. A full transformation out.",
                    },
                    {
                      q: "Will this replace my videographer?",
                      a: "It replaces the $1,500 cinematic listing add-on you stopped offering because the margins were thin. It does not replace a fully scripted property tour. We're a complement, not a substitute.",
                    },
                    {
                      q: "Who owns the films?",
                      a: "You do. Full commercial rights to every film delivered on your account, including for client resale. We never use your photographs to train future models.",
                    },
                    {
                      q: "How fast is 'fast'?",
                      a: "Average render time across the studio is 3 minutes 14 seconds. Priority queue subscribers see 90 seconds.",
                    },
                    {
                      q: "Can my brokerage white-label this?",
                      a: "Yes. The House plan includes white-label delivery, brokerage-branded galleries, agent seats, and a dedicated liaison. Speak to us.",
                    },
                  ].map((f, i) => (
                    <details
                      key={i}
                      className="group py-7"
                      style={{ borderBottom: "1px solid var(--lux-hairline)" }}
                    >
                      <summary
                        className="flex items-baseline justify-between cursor-pointer list-none"
                      >
                        <span
                          className="lux-display text-2xl md:text-3xl pr-8"
                          style={{ letterSpacing: "-0.012em" }}
                        >
                          {f.q}
                        </span>
                        <span
                          className="lux-display-italic flex-shrink-0 transition-transform group-open:rotate-45"
                          style={{ color: "var(--lux-rust)", fontSize: 32, lineHeight: 1 }}
                        >
                          +
                        </span>
                      </summary>
                      <p className="lux-prose mt-5" style={{ maxWidth: 640 }}>
                        {f.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* THE INVITATION — Final CTA */}
          <section
            className="relative overflow-hidden lux-bg-ink lux-grain"
            style={{ color: "var(--lux-bone)" }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url(${ux.exterior1})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(14,14,12,0.8) 0%, rgba(14,14,12,0.94) 100%)",
              }}
            />

            <div className="relative lux-container py-32 md:py-44 text-center">
              <div className="lux-eyebrow mb-10 flex items-center justify-center gap-3" style={{ color: "var(--lux-champagne)" }}>
                <span style={{ display: "inline-block", width: 36, height: 1, background: "var(--lux-champagne)" }} />
                THE INVITATION
                <span style={{ display: "inline-block", width: 36, height: 1, background: "var(--lux-champagne)" }} />
              </div>

              <h2
                className="lux-display"
                style={{
                  fontSize: "clamp(3rem, 8vw, 7.5rem)",
                  lineHeight: 0.92,
                  color: "var(--lux-bone)",
                }}
              >
                Your finest frame
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>is waiting.</span>
              </h2>

              <p
                className="lux-prose mt-10 mx-auto"
                style={{ color: "rgba(244,239,230,0.78)", maxWidth: 540 }}
              >
                Fifty credits. Roughly twelve finished films. Begin tonight, deliver tomorrow.
              </p>

              <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
                <Link to={destination} className="lux-btn lux-btn-bone">
                  {isLoggedIn ? "ENTER THE STUDIO →" : "BEGIN A FILM — FREE →"}
                </Link>
                <Link to="/contact" className="lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-bone)" }}>
                  <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-bone)" }} />
                  SPEAK TO A LIAISON
                </Link>
              </div>

              <div
                className="lux-eyebrow mt-16 mx-auto pt-10"
                style={{
                  borderTop: "1px solid rgba(244,239,230,0.18)",
                  color: "rgba(244,239,230,0.6)",
                  maxWidth: 480,
                }}
              >
                NO CARD · NO SUBSCRIPTION · NO CONTRACT · NO COMPROMISE
              </div>
            </div>
          </section>
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
};

export default Index;
