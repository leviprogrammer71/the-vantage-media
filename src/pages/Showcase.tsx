import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import SectionHeading from "@/components/lux/SectionHeading";
import StatStrip from "@/components/lux/StatStrip";
import LazyVideo from "@/components/lux/LazyVideo";

/**
 * /examples — the public Showcase. Every example we've produced, presented as
 * a "project" with the finished reel, the category, and the agent/host behind
 * it, plus a testimonials wall.
 *
 * NOTE: the profiles + quotes below are SAMPLE/placeholder marketing content.
 * Replace them with real, permissioned testimonials before scaling paid
 * traffic — presenting fabricated testimonials as real is both an ethics and
 * an FTC-endorsement-guidelines problem.
 */

interface Project {
  title: string;
  category: string;
  location: string;
  video: string;
  poster?: string;
  agent: string;
  role: string;
  quote: string;
}

const PROJECTS: Project[] = [
  {
    title: "Modern Hillside Estate",
    category: "Done-For-You Reel",
    location: "Malibu, CA",
    video: "/vantage/done-for-you/luxuryminimal.mp4",
    poster: "/vantage/done-for-you/house3/1.png",
    agent: "Maya Atwood",
    role: "Atwood Photographic",
    quote: "Pays for itself the first week. I delivered a reel before the sign hit the lawn.",
  },
  {
    title: "Downtown Loft — Just Listed",
    category: "Done-For-You Reel",
    location: "Austin, TX",
    video: "/vantage/done-for-you/snappy.mp4",
    poster: "/vantage/done-for-you/house3/3.png",
    agent: "Jordan Park",
    role: "Meridian Visual Co.",
    quote: "I added it as a $450 line item the next morning. Clients think I hired a crew.",
  },
  {
    title: "Empty Living Room → Staged",
    category: "Virtual Staging",
    location: "Scottsdale, AZ",
    video: "/vantage/virtual-staging/result.mp4",
    agent: "Sara Larsen",
    role: "House of Larsen",
    quote: "Staged an empty $1.2M listing in minutes. Buyers finally saw the potential.",
  },
  {
    title: "Golden-Hour Facade",
    category: "Sun-to-Sun",
    location: "Santa Barbara, CA",
    video: "/vantage/sun-cycle/result.mp4",
    agent: "Diego Ramos",
    role: "Coastline Realty",
    quote: "One midday exterior became a sunrise-to-dusk showcase. It stopped the scroll.",
  },
  {
    title: "Render → Photoreal Reveal",
    category: "Sketch-to-Real",
    location: "Denver, CO",
    video: "/vantage/sketch/result.mp4",
    poster: "/vantage/sketch/original.webp",
    agent: "Priya Nair",
    role: "Summit New Construction",
    quote: "For pre-construction this is unreal — buyers walk the home before it exists.",
  },
  {
    title: "Cluttered → Clean Walk-Through",
    category: "Transformation",
    location: "Portland, OR",
    video: "/vantage/cleanup/result.mp4",
    poster: "/vantage/cleanup/mo.jpg",
    agent: "Marcus Webb",
    role: "Rose City Homes",
    quote: "The before/after does the selling for me. Sellers sign on the spot.",
  },
  {
    title: "Bare Room → Fully Set",
    category: "Transformation",
    location: "Nashville, TN",
    video: "/vantage/setup/video.mp4",
    poster: "/vantage/setup/before.webp",
    agent: "Alicia Grant",
    role: "Grant & Co. Realty",
    quote: "Staging used to cost me $1,800 and a week. Now it's a few minutes.",
  },
  {
    title: "Ground-Up Build Timelapse",
    category: "Transformation",
    location: "Boise, ID",
    video: "/vantage/build/result.mp4",
    poster: "/vantage/ranch-build/input.png",
    agent: "Tom Fielder",
    role: "Fielder Custom Builders",
    quote: "We show buyers the whole build in 10 seconds. Deposits went up.",
  },
  {
    title: "Kitchen Renovation Reveal",
    category: "Transformation",
    location: "Sacramento, CA",
    video: "/vantage/contractor/result.mp4",
    poster: "/vantage/contractor/before.jpg",
    agent: "Rosa Medina",
    role: "Medina Remodels",
    quote: "My renovation portfolio finally looks like the work I actually do.",
  },
  {
    title: "Backyard Slow Reveal",
    category: "Animate",
    location: "San Diego, CA",
    video: "/vantage/backyard-slow-reveal/result.mp4",
    poster: "/vantage/backyard-slow-reveal/before.jpg",
    agent: "Kevin Osei",
    role: "Pacific Coast Group",
    quote: "One photo of the yard turned into the best clip in the whole reel.",
  },
  {
    title: "Ranch — Cleaned & Cinematic",
    category: "Transformation",
    location: "Fresno, CA",
    video: "/vantage/ranch-clean/video.mp4",
    poster: "/vantage/ranch-clean/before.webp",
    agent: "Lindsey Cole",
    role: "Valley Signature Homes",
    quote: "Rural listings are hard to market. This made a plain ranch look premium.",
  },
  {
    title: "New Build — From Dirt",
    category: "Transformation",
    location: "Phoenix, AZ",
    video: "/vantage/ranch-build/result.mp4",
    poster: "/vantage/ranch-build/input.png",
    agent: "Andre Cole",
    role: "Cole Development",
    quote: "Buyers get the vision instantly. It's shortened our sales cycle.",
  },
  {
    title: "Short-Term Rental Tour",
    category: "Airbnb",
    location: "Joshua Tree, CA",
    video: "/vantage/airbnb/transform-1.mp4",
    poster: "/vantage/airbnb/hero-still.jpg",
    agent: "Nina Alvarez",
    role: "Desert Stays Co.",
    quote: "My occupancy jumped after I swapped stills for a Vantage reel.",
  },
  {
    title: "Just Listed — Badge Overlay",
    category: "Done-For-You Reel",
    location: "Charlotte, NC",
    video: "/vantage/just-listed/video.mp4",
    poster: "/vantage/done-for-you/house3/2.png",
    agent: "Brett Holloway",
    role: "Queen City Realty",
    quote: "Price and address baked right in. Post it the night I sign — done.",
  },
  {
    title: "Single Photo → Motion",
    category: "Animate",
    location: "Seattle, WA",
    video: "/vantage/animate-single/push_in.mp4",
    poster: "/vantage/done-for-you/house3/5.png",
    agent: "Hana Kim",
    role: "Emerald Realty",
    quote: "A flat kitchen photo became a scroll-stopping push-in. Two clicks.",
  },
  {
    title: "Listing Bundle — Six Clips",
    category: "Done-For-You Reel",
    location: "Miami, FL",
    video: "/vantage/listing-bundle/1.mp4",
    poster: "/vantage/listing-bundle/1.webp",
    agent: "Luis Fernandez",
    role: "Bayfront Luxury Group",
    quote: "A full set of clips per listing. My feed finally looks like a brand.",
  },
];

const TESTIMONIALS = [
  {
    quote: "Three minutes per film. We've quietly tripled our throughput and our listings look like a luxury brand.",
    agent: "Sara Larsen",
    role: "House of Larsen · Scottsdale",
  },
  {
    quote: "I stopped paying a videographer $300 a listing. Same-day reels, MLS-safe, and clients think I leveled up overnight.",
    agent: "Jordan Park",
    role: "Meridian Visual Co. · Austin",
  },
  {
    quote: "Connecting it inside Claude was the unlock — I paste a Zillow link and the whole package comes back. It feels like cheating.",
    agent: "Maya Atwood",
    role: "Atwood Photographic · Malibu",
  },
];

const CATEGORIES = ["All", "Done-For-You Reel", "Virtual Staging", "Transformation", "Sun-to-Sun", "Sketch-to-Real", "Animate", "Airbnb"];

function Avatar({ name, dark }: { name: string; dark?: boolean }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      className="flex-shrink-0 grid place-items-center"
      style={{
        width: 40, height: 40, borderRadius: 999,
        background: dark ? "rgba(244,239,230,0.14)" : "var(--lux-cream)",
        border: `1px solid ${dark ? "rgba(244,239,230,0.25)" : "var(--lux-hairline-strong)"}`,
        color: "var(--lux-brass)", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </span>
  );
}

export default function Showcase() {
  const [filter, setFilter] = useState("All");
  const shown = filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter);

  return (
    <>
      <Helmet>
        <title>Showcase · Real Estate Reels Made With The Vantage</title>
        <meta
          name="description"
          content="See real listing reels, virtual staging, transformations, and sun-to-sun exteriors created with The Vantage — the agentic listing tool. Browse projects by category."
        />
        <link rel="canonical" href="https://thevantage.media/examples" />
        <meta property="og:title" content="The Vantage Showcase · Real Listing Reels" />
        <meta property="og:description" content="Browse real projects: listing reels, virtual staging, transformations, and more — made with The Vantage." />
        <meta property="og:url" content="https://thevantage.media/examples" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          {/* HERO */}
          <section className="lux-section lux-bg-bone" style={{ paddingBottom: 0 }}>
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE SHOWCASE · MADE WITH THE VANTAGE"
                title="Real listings."
                italic="Real reels."
                lede="Every film below was produced with The Vantage — from a Zillow link or a handful of photos. Browse the projects agents, photographers, and hosts have shipped."
                align="center"
                className="mb-10"
              />
            </div>
            <StatStrip
              variant="ink"
              stats={[
                { value: "16", label: "SAMPLE PROJECTS" },
                { value: "7", label: "FILM TYPES" },
                { value: "3 min", label: "AVG TURNAROUND" },
                { value: "1080p", label: "MIN OUTPUT" },
              ]}
            />
          </section>

          {/* FILTER + GRID */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              {/* Category filter */}
              <div className="flex flex-wrap justify-center gap-2.5 mb-12">
                {CATEGORIES.map((c) => {
                  const active = filter === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setFilter(c)}
                      className="lux-eyebrow"
                      style={{
                        padding: "9px 16px",
                        borderRadius: 999,
                        fontSize: "0.62rem",
                        letterSpacing: "0.14em",
                        fontWeight: 600,
                        cursor: "pointer",
                        background: active ? "var(--lux-ink)" : "transparent",
                        color: active ? "var(--lux-bone)" : "var(--lux-ink)",
                        border: `1px solid ${active ? "var(--lux-ink)" : "var(--lux-hairline-strong)"}`,
                        transition: "all 0.2s",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              {/* Project grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {shown.map((p) => (
                  <div
                    key={p.title + p.video}
                    className="group overflow-hidden flex flex-col lux-bg-cream"
                    style={{ border: "1px solid var(--lux-hairline-strong)", borderRadius: 4 }}
                  >
                    <div className="relative w-full overflow-hidden lux-bg-ink" style={{ aspectRatio: "9 / 12" }}>
                      <LazyVideo
                        src={p.video}
                        poster={p.poster}
                        className="absolute inset-0 w-full h-full"
                      />
                      <span
                        className="lux-eyebrow absolute top-3 left-3 px-2.5 py-1.5"
                        style={{
                          background: "var(--lux-bone)", color: "var(--lux-rust)",
                          fontSize: "0.52rem", letterSpacing: "0.18em", fontWeight: 700, zIndex: 2,
                        }}
                      >
                        {p.category}
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="lux-display" style={{ fontSize: "1.25rem", lineHeight: 1.15, color: "var(--lux-ink)" }}>
                        {p.title}
                      </h3>
                      <div className="lux-eyebrow mt-1 mb-4" style={{ color: "var(--lux-ash)", fontSize: "0.58rem", letterSpacing: "0.16em" }}>
                        {p.location}
                      </div>
                      <div className="mt-auto pt-4 flex items-start gap-3" style={{ borderTop: "1px solid var(--lux-hairline)" }}>
                        <Avatar name={p.agent} />
                        <div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", fontWeight: 600, color: "var(--lux-ink)" }}>
                            {p.agent}
                          </div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "var(--lux-ash)" }}>
                            {p.role}
                          </div>
                          <p className="lux-prose mt-2" style={{ fontSize: "0.82rem", lineHeight: 1.45, color: "var(--lux-ink)", opacity: 0.85, fontStyle: "italic" }}>
                            &ldquo;{p.quote}&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* TESTIMONIALS WALL */}
          <section className="lux-section lux-bg-ink lux-grain">
            <div className="lux-container">
              <SectionHeading
                eyebrow="WHAT AGENTS SAY"
                title="Loved by the people"
                italic="who post the same night they sign."
                align="center"
                className="mb-16"
              />
              <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} className="p-8 flex flex-col" style={{ background: "rgba(244,239,230,0.05)", border: "1px solid rgba(244,239,230,0.14)", borderRadius: 4 }}>
                    <div style={{ color: "var(--lux-champagne)", letterSpacing: 2, marginBottom: 14 }}>★★★★★</div>
                    <p className="lux-prose flex-1" style={{ color: "var(--lux-bone)", fontSize: "1rem", lineHeight: 1.6, fontStyle: "italic" }}>
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <Avatar name={t.agent} dark />
                      <div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "var(--lux-bone)" }}>{t.agent}</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "rgba(244,239,230,0.6)" }}>{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container text-center">
              <h2 className="lux-display" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", lineHeight: 0.98 }}>
                Your listing is next.
              </h2>
              <p className="lux-prose mt-6 mx-auto" style={{ maxWidth: 460 }}>
                60 free credits — about one full reel. No card. Make your first film in minutes.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
                <Link to="/signup" className="lux-btn" style={{ background: "var(--lux-rust)", color: "var(--lux-bone)" }}>
                  START FREE — 60 CREDITS →
                </Link>
                <Link to="/connect" className="lux-eyebrow inline-flex items-center gap-2" style={{ color: "var(--lux-ink)" }}>
                  ⚡ CONNECT TO CLAUDE →
                </Link>
              </div>
            </div>
          </section>
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
}
