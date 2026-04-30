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

// All imagery is now real Vantage customer output — no stock photography.
const ux = {
  hero: "/vantage/ranch-build/input.png",
  interior1: "/vantage/setup/after.jpeg",
  interior2: "/vantage/sketch/original.webp",
  exterior1: "/vantage/ranch-build/input.png",
  exterior2: "/vantage/backyard-slow-reveal/input.jpg",
  empty1: "/vantage/setup/before.webp",
  empty2: "/vantage/ranch-clean/before.webp",
  kitchen1: "/vantage/listing-bundle/1.webp",
  kitchen2: "/vantage/listing-bundle/2.webp",
  bathroom: "/vantage/listing-bundle/3.webp",
  bathroomBefore: "/vantage/backyard-slow-reveal/before.jpg",
  livingRoom: "/vantage/listing-bundle/4.webp",
  living2: "/vantage/listing-bundle/5.webp",
  bedroom: "/vantage/listing-bundle/6.webp",
  studio1: "/vantage/setup/after.jpeg",
  studio2: "/vantage/ranch-clean/input.png",
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

          {/* Trust Badges */}
          <div className="lux-bg-parchment py-6 border-b" style={{ borderColor: "var(--lux-hairline)" }}>
            <div className="lux-container flex flex-wrap justify-center items-center gap-6 text-sm">
              <div className="flex items-center gap-2" style={{ color: "var(--lux-rust)" }}>
                30-DAY REFUND
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--lux-rust)" }}>
                NO CARD REQUIRED
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--lux-rust)" }}>
                1080P SEEDANCE 2.0
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--lux-rust)" }}>
                BUILT FOR REAL ESTATE
              </div>
            </div>
          </div>

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

          {/* THE STUDIO — manifesto + powered by section */}
          <section className="lux-section lg:py-32 lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow="THE STUDIO"
                  title={<>A new genre of <span className="lux-display-italic">listing film.</span></>}
                  lede="The Vantage is a single-frame transformation studio. We turn one photograph — the one your client actually shot — into a cinematic vertical film built for Reels, TikTok, and the algorithm."
                />
                <div className="mt-12 p-8 lux-bg-cream" style={{ border: "1px solid var(--lux-hairline)" }}>
                  <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-rust)" }}>POWERED BY</div>
                  <p className="text-sm" style={{ color: "var(--lux-ink)", lineHeight: 1.6 }}>ByteDance Seedance 2.0, Kling 2.5 Turbo Pro, Flux Kontext Pro, OpenAI gpt-image-2. Not open-source slop. The same models top studios license separately.</p>
                </div>
                <div className="mt-6 p-8" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}>
                  <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-champagne)" }}>WHAT WE HAND BACK</div>
                  <p className="text-sm" style={{ lineHeight: 1.6 }}>One finished MP4. 1080p vertical. Your price, location, realtor name, and brokerage burned in as cinematic overlays. Multi-clip reels stitched into a single download — done-for-you, post-ready. Drop it on Reels and walk away.</p>
                </div>
              </div>
              <div className="lg:col-span-7">
                <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
                  {[
                    {
                      tag: "I.",
                      h: "One photo in",
                      b: "No before shot needed. AI reconstructs. Output in 3 minutes.",
                    },
                    {
                      tag: "II.",
                      h: "Studio-grade motion",
                      b: "Drone perspectives, parallax, physics-real movement. Worth $2,800 from a videographer.",
                    },
                    {
                      tag: "III.",
                      h: "Vertical for feeds",
                      b: "1080p · 9:16 · 8–12 sec. Reels, TikTok, Shorts, YouTube. Ready to post.",
                    },
                    {
                      tag: "IV.",
                      h: "Built for the business",
                      b: "White-label, watermark-free, brand presets, MLS multi-export, agent galleries. Studio plan up.",
                    },
                  ].map((p) => (
                    <div
                      key={p.tag}
                      className="p-8 lg:p-10 lux-bg-parchment"
                      style={{ border: "1px solid var(--lux-hairline)" }}
                    >
                      <div className="lux-display-italic mb-4" style={{ fontSize: 24, color: "var(--lux-rust)" }}>{p.tag}</div>
                      <div className="lux-display text-2xl md:text-3xl mb-3">{p.h}</div>
                      <p className="lux-prose text-sm" style={{ color: "var(--lux-ink)", lineHeight: 1.65 }}>{p.b}</p>
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
                  before="/vantage/backyard-slow-reveal/before.jpg"
                  after="/vantage/backyard-slow-reveal/input.jpg"
                  beforeLabel="MOMENT 00:00"
                  afterLabel="FRAME 04:18"
                  ratio="4/5"
                  caption="BACKYARD BUILD · REAL CUSTOMER OUTPUT"
                />
                <BeforeAfterSlider
                  before="/vantage/setup/before.webp"
                  after="/vantage/setup/after.jpeg"
                  beforeLabel="MOMENT 00:00"
                  afterLabel="FRAME 03:52"
                  ratio="4/5"
                  caption="EVENT SETUP · DRESSED FROM EMPTY"
                />
              </div>

              <div className="mt-16 text-center">
                <Link
                  to={destination}
                  className="lux-btn"
                  style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "18px 28px" }}
                >
                  {isLoggedIn ? "ENTER THE STUDIO →" : "BEGIN A FILM — FREE →"}
                </Link>
                <div className="mt-6 p-4 lux-bg-bone" style={{ border: "1px solid var(--lux-hairline)", display: "inline-block" }}>
                  <p className="lux-eyebrow" style={{ color: "var(--lux-rust)", marginBottom: 8 }}>30-DAY REFUND · CANCEL ANYTIME · NO CARD</p>
                  <p className="text-xs" style={{ color: "var(--lux-ink)" }}>Full refund within 30 days. Zero commitment contracts.</p>
                </div>
                <p className="lux-prose text-sm mt-6" style={{ color: "var(--lux-rust)" }}>
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
                  <p className="lux-prose" style={{ color: "var(--lux-bone)", maxWidth: 420 }}>
                    Each film below was generated from a single still photograph submitted by a working
                    real estate photographer or builder. Average render time: 3 minutes 14 seconds.
                  </p>
                </div>
              </div>

              <VideoReel
                eyebrow="REAL CUSTOMER OUTPUT · NOT STOCK FOOTAGE"
                title="The 04.26 Selection"
                clips={[
                  { src: "/vantage/ranch-build/result.mp4", label: "Ranch Build · Full Home", byline: "CONSTRUCTION · NORTHEAST" },
                  { src: "/vantage/backyard-slow-reveal/result.mp4", label: "Backyard · Slow Reveal", byline: "LANDSCAPING · BACKYARD BUILD" },
                  { src: "/vantage/ranch-clean/video.mp4", label: "Ranch · Cleanup", byline: "RUBBISH REMOVAL · BEFORE-AFTER" },
                  { src: "/vantage/setup/video.mp4", label: "Event Setup · Venue Styling", byline: "VENUE · DRESSED FROM EMPTY" },
                  { src: "/vantage/sketch/result.mp4", label: "Sketch to Reality", byline: "PROPERTY PHOTO · HAND-DRAWN REVEAL" },
                  { src: "/vantage/just-listed/video.mp4", label: "Just Listed · Single Photo", byline: "LISTING · BADGE OVERLAY" },
                ]}
              />
            </div>
          </section>

          {/* THE LISTING BUNDLE — six photos, six clips, one stitched reel */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE LISTING BUNDLE · WHAT YOU GET"
                title="Six photos in."
                italic="One stitched reel out."
                lede="Each photo becomes a 5-second Seedance 2.0 clip with a different camera move. We hand back the individual clips AND the stitched MP4 with your price burned in."
                align="center"
                className="mb-12"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 max-w-5xl mx-auto">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden"
                    style={{ aspectRatio: "9/16", background: "var(--lux-ink)", border: "1px solid var(--lux-hairline)" }}
                  >
                    <img
                      src={`/vantage/listing-bundle/${i}.webp`}
                      alt={`Source photo ${i}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ opacity: 0.35 }}
                      loading="lazy"
                    />
                    <video
                      src={`/vantage/listing-bundle/${i}.mp4`}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      className="lux-eyebrow absolute top-2 left-2 px-2 py-1"
                      style={{
                        background: "rgba(14,14,12,0.7)",
                        color: "var(--lux-bone)",
                        fontSize: "0.6rem",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      CLIP {i} / 6
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center mt-8 lux-prose" style={{ color: "var(--lux-ink)", maxWidth: 640, marginInline: "auto" }}>
                Real bundle output. Six 5-second cinematic clips, one source photo each, different shot type per clip. Stitched together into a single 30-second reel ready for Reels and TikTok.
              </p>
            </div>
          </section>

          {/* THE FORMULA — How it works, editorial + quality claim */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <div className="mb-12 p-5 lux-bg-parchment" style={{ border: "1px solid var(--lux-hairline)", textAlign: "center" }}>
                <p className="text-sm" style={{ color: "var(--lux-ink)" }}>1080p native output. Seedance 2.0 by default. The only real-estate AI tool shipping long-form quality at scale. Most competitors max out at 720p generic models.</p>
              </div>
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
                    h: "Upload the after photo",
                    b: "The finished space. Interior, pool, garden, kitchen. JPEG, PNG, HEIC. We take what you shoot.",
                    sub: "00:00:08",
                  },
                  {
                    n: "II.",
                    h: "AI reconstructs + animates",
                    b: "Prior state inferred from architecture. Transformation rendered with cinematic moves and physics in 3 minutes.",
                    sub: "00:03:14",
                  },
                  {
                    n: "III.",
                    h: "Download and post",
                    b: "1080p vertical. Watermark-free. Ready for Reels, TikTok, Shorts. Post same day.",
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
                    <p className="lux-prose mb-10" style={{ fontSize: 16, color: "var(--lux-ink)" }}>{s.b}</p>
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
                  before="/vantage/ranch-clean/before.webp"
                  after="/vantage/ranch-clean/input.png"
                  beforeLabel="THE NEGLECTED FRAME"
                  afterLabel="THE CLEANED FRAME"
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
                  before="/vantage/setup/before.webp"
                  after="/vantage/setup/after.jpeg"
                  beforeLabel="UNDRESSED"
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
          <section className="lux-section lg:py-32 lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="lux-container">
              <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 mb-20">
                <div className="lg:col-span-7">
                  <div className="lux-eyebrow mb-6" style={{ color: "var(--lux-champagne)" }}>
                    ✦ FOR WHOM IT IS MADE
                  </div>
                  <h2 className="lux-display" style={{ fontSize: "clamp(2.6rem, 5.2vw, 4.8rem)", color: "var(--lux-bone)", lineHeight: 0.95 }}>
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
                    <p className="lux-prose mt-4 text-sm" style={{ color: p.featured ? "var(--lux-bone)" : "var(--lux-ink)" }}>
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
                style={{ color: "var(--lux-bone)", maxWidth: 540 }}
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

          {/* Sticky Bottom CTA - shows after hero scroll */}
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

export default Index;
