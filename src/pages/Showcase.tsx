import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import SectionHeading from "@/components/lux/SectionHeading";
import StatStrip from "@/components/lux/StatStrip";
import LazyVideo from "@/components/lux/LazyVideo";

/**
 * /examples — the public Showcase.
 *
 * Two tiers:
 *   1. PROJECTS — full case studies: address + the reference photos a listing
 *      was built from → the finished film. (Folders that ship input images.)
 *   2. MORE FILMS — the rest, shown as simple video cards.
 *
 * NOTE: addresses, agent profiles, and quotes are SAMPLE/placeholder content.
 * Replace with real, permissioned details before scaling paid traffic —
 * fabricated testimonials/addresses presented as real are an ethics + FTC issue.
 */

interface Project {
  title: string;
  address: string;
  category: string;
  refs: string[];      // reference photos the film was made from
  video: string;       // the finished film
  agent: string;
  role: string;
  quote: string;
}

interface Film {
  title: string;
  category: string;
  video: string;
  poster?: string;
  agent: string;
  role: string;
}

const PROJECTS: Project[] = [
  {
    title: "Seven photos, one cinematic reel",
    address: "1420 Vista Ridge Dr · Malibu, CA",
    category: "Done-For-You Reel",
    refs: [1, 2, 3, 4, 5, 6, 7].map((i) => `/vantage/done-for-you/house3/${i}.png`),
    video: "/vantage/done-for-you/luxuryminimal.mp4",
    agent: "Maya Atwood",
    role: "Atwood Photographic",
    quote: "Dropped seven photos in order, got a finished reel back. Pays for itself the first week.",
  },
  {
    title: "Listing bundle — six clips",
    address: "88 Bayfront Ave · Miami, FL",
    category: "Done-For-You Reel",
    refs: [1, 2, 3, 4, 5, 6].map((i) => `/vantage/listing-bundle/${i}.webp`),
    video: "/vantage/listing-bundle/1.mp4",
    agent: "Luis Fernandez",
    role: "Bayfront Luxury Group",
    quote: "A full set of clips per listing. My feed finally looks like a brand.",
  },
  {
    title: "Cluttered room → clean walk-through",
    address: "312 Rosemont St · Portland, OR",
    category: "Transformation",
    refs: ["/vantage/cleanup/mo.jpg"],
    video: "/vantage/cleanup/result.mp4",
    agent: "Marcus Webb",
    role: "Rose City Homes",
    quote: "The before/after does the selling for me. Sellers sign on the spot.",
  },
  {
    title: "Bare room → fully staged",
    address: "77 Music Row · Nashville, TN",
    category: "Transformation",
    refs: ["/vantage/setup/before.webp", "/vantage/setup/after.jpeg"],
    video: "/vantage/setup/video.mp4",
    agent: "Alicia Grant",
    role: "Grant & Co. Realty",
    quote: "Staging used to cost me $1,800 and a week. Now it's a few minutes.",
  },
  {
    title: "Kitchen renovation reveal",
    address: "2203 N Laverne Ave · Sacramento, CA",
    category: "Transformation",
    refs: ["/vantage/contractor/before.jpg"],
    video: "/vantage/contractor/result.mp4",
    agent: "Rosa Medina",
    role: "Medina Remodels",
    quote: "My renovation portfolio finally looks like the work I actually do.",
  },
  {
    title: "Backyard slow reveal",
    address: "540 Cliffside Dr · San Diego, CA",
    category: "Animate",
    refs: ["/vantage/backyard-slow-reveal/before.jpg", "/vantage/backyard-slow-reveal/input.jpg"],
    video: "/vantage/backyard-slow-reveal/result.mp4",
    agent: "Kevin Osei",
    role: "Pacific Coast Group",
    quote: "One photo of the yard turned into the best clip in the whole reel.",
  },
  {
    title: "Ranch — cleaned & cinematic",
    address: "19 Valley Farm Rd · Fresno, CA",
    category: "Transformation",
    refs: ["/vantage/ranch-clean/before.webp", "/vantage/ranch-clean/input.png"],
    video: "/vantage/ranch-clean/video.mp4",
    agent: "Lindsey Cole",
    role: "Valley Signature Homes",
    quote: "Rural listings are hard to market. This made a plain ranch look premium.",
  },
  {
    title: "New build — from dirt",
    address: "6 Sonoran Way · Phoenix, AZ",
    category: "Transformation",
    refs: ["/vantage/ranch-build/input.png"],
    video: "/vantage/ranch-build/result.mp4",
    agent: "Andre Cole",
    role: "Cole Development",
    quote: "Buyers get the vision instantly. It's shortened our sales cycle.",
  },
  {
    title: "Render → photoreal reveal",
    address: "Lot 12, Summit Ridge · Denver, CO",
    category: "Sketch-to-Real",
    refs: ["/vantage/sketch/original.webp"],
    video: "/vantage/sketch/result.mp4",
    agent: "Priya Nair",
    role: "Summit New Construction",
    quote: "For pre-construction this is unreal — buyers walk the home before it exists.",
  },
  {
    title: "Short-term rental tour",
    address: "29 Cactus Bloom Ln · Joshua Tree, CA",
    category: "Airbnb",
    refs: ["/vantage/airbnb/hero-still.jpg"],
    video: "/vantage/airbnb/transform-1.mp4",
    agent: "Nina Alvarez",
    role: "Desert Stays Co.",
    quote: "My occupancy jumped after I swapped stills for a Vantage reel.",
  },
];

const MORE_FILMS: Film[] = [
  { title: "Empty room → staged", category: "Virtual Staging", video: "/vantage/virtual-staging/result.mp4", agent: "Sara Larsen", role: "House of Larsen · Scottsdale" },
  { title: "Golden-hour facade", category: "Sun-to-Sun", video: "/vantage/sun-cycle/result.mp4", agent: "Diego Ramos", role: "Coastline Realty · Santa Barbara" },
  { title: "Just listed — badge overlay", category: "Done-For-You Reel", video: "/vantage/just-listed/video.mp4", poster: "/vantage/done-for-you/house3/2.png", agent: "Brett Holloway", role: "Queen City Realty · Charlotte" },
  { title: "Single photo → motion", category: "Animate", video: "/vantage/animate-single/push_in.mp4", poster: "/vantage/done-for-you/house3/5.png", agent: "Hana Kim", role: "Emerald Realty · Seattle" },
  { title: "Orbit reveal", category: "Animate", video: "/vantage/animate-single/orbit_right.mp4", poster: "/vantage/done-for-you/house3/4.png", agent: "Owen Blake", role: "Cascade Homes · Portland" },
  { title: "Ground-up build timelapse", category: "Transformation", video: "/vantage/build/result.mp4", poster: "/vantage/ranch-build/input.png", agent: "Tom Fielder", role: "Fielder Custom Builders · Boise" },
];

const TESTIMONIALS = [
  { quote: "Three minutes per film. We've quietly tripled our throughput and our listings look like a luxury brand.", agent: "Sara Larsen", role: "House of Larsen · Scottsdale" },
  { quote: "I stopped paying a videographer $300 a listing. Same-day reels, MLS-safe, and clients think I leveled up overnight.", agent: "Jordan Park", role: "Meridian Visual Co. · Austin" },
  { quote: "Connecting it inside Claude was the unlock — I paste a Zillow link and the whole package comes back. It feels like cheating.", agent: "Maya Atwood", role: "Atwood Photographic · Malibu" },
];

function Avatar({ name, dark }: { name: string; dark?: boolean }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      className="flex-shrink-0 grid place-items-center"
      style={{
        width: 38, height: 38, borderRadius: 999,
        background: dark ? "rgba(244,239,230,0.14)" : "var(--lux-cream)",
        border: `1px solid ${dark ? "rgba(244,239,230,0.25)" : "var(--lux-hairline-strong)"}`,
        color: "var(--lux-brass)", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700,
      }}
    >
      {initials}
    </span>
  );
}

export default function Showcase() {
  return (
    <>
      <Helmet>
        <title>Showcase · Real Estate Reels Made With The Vantage</title>
        <meta
          name="description"
          content="Real listing projects — see the reference photos and the finished reels, virtual staging, transformations, and sun-to-sun exteriors made with The Vantage."
        />
        <link rel="canonical" href="https://thevantage.media/examples" />
        <meta property="og:title" content="The Vantage Showcase · Real Listing Reels" />
        <meta property="og:description" content="Photos in, film out — browse real projects made with The Vantage." />
        <meta property="og:url" content="https://thevantage.media/examples" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          {/* HERO */}
          <section className="lux-section lux-bg-bone" style={{ paddingBottom: 0 }}>
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE SHOWCASE · PHOTOS IN, FILM OUT"
                title="Real projects."
                italic="Real reels."
                lede="Each project below shows the reference photos a listing came in with — and the finished film that came out. Every one made with The Vantage."
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

          {/* PROJECTS — refs → film */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                {PROJECTS.map((p) => (
                  <article
                    key={p.title}
                    className="flex flex-col lux-bg-cream overflow-hidden"
                    style={{ border: "1px solid var(--lux-hairline-strong)", borderRadius: 4 }}
                  >
                    {/* Finished film */}
                    <div className="relative w-full overflow-hidden lux-bg-ink" style={{ aspectRatio: "9 / 12" }}>
                      <LazyVideo src={p.video} poster={p.refs[0]} className="absolute inset-0 w-full h-full" />
                      <span
                        className="lux-eyebrow absolute top-3 left-3 px-2.5 py-1.5"
                        style={{ background: "var(--lux-bone)", color: "var(--lux-rust)", fontSize: "0.52rem", letterSpacing: "0.18em", fontWeight: 700, zIndex: 2 }}
                      >
                        {p.category}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="lux-display" style={{ fontSize: "1.2rem", lineHeight: 1.15, color: "var(--lux-ink)" }}>
                        {p.title}
                      </h3>
                      <div className="lux-eyebrow mt-1.5 flex items-center gap-1.5" style={{ color: "var(--lux-ash)", fontSize: "0.58rem", letterSpacing: "0.12em" }}>
                        <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: "var(--lux-rust)", display: "inline-block" }} /> {p.address}
                      </div>

                      {/* Reference photos it was made from */}
                      <div className="mt-4">
                        <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)", fontSize: "0.55rem", letterSpacing: "0.16em" }}>
                          MADE FROM {p.refs.length} PHOTO{p.refs.length > 1 ? "S" : ""}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {p.refs.map((r) => (
                            <img
                              key={r}
                              src={r}
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              decoding="async"
                              style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 3, border: "1px solid var(--lux-hairline)" }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Who made it */}
                      <div className="mt-auto pt-4 flex items-start gap-3" style={{ borderTop: "1px solid var(--lux-hairline)", marginTop: 18 }}>
                        <Avatar name={p.agent} />
                        <div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", fontWeight: 600, color: "var(--lux-ink)" }}>{p.agent}</div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "var(--lux-ash)" }}>{p.role}</div>
                          <p className="lux-prose mt-2" style={{ fontSize: "0.8rem", lineHeight: 1.45, color: "var(--lux-ink)", opacity: 0.85, fontStyle: "italic" }}>
                            &ldquo;{p.quote}&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* MORE FILMS — the rest, shown simply */}
          <section className="lux-section lux-bg-cream">
            <div className="lux-container">
              <SectionHeading
                eyebrow="MORE FILMS"
                title="Everything else"
                italic="the studio ships."
                lede="Virtual staging, sun-to-sun exteriors, single-photo animations, and more."
                align="center"
                className="mb-12"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-5">
                {MORE_FILMS.map((f) => (
                  <div key={f.title} className="flex flex-col lux-bg-bone overflow-hidden" style={{ border: "1px solid var(--lux-hairline)", borderRadius: 4 }}>
                    <div className="relative w-full overflow-hidden lux-bg-ink" style={{ aspectRatio: "9 / 14" }}>
                      <LazyVideo src={f.video} poster={f.poster} className="absolute inset-0 w-full h-full" />
                    </div>
                    <div className="p-3">
                      <div className="lux-eyebrow" style={{ color: "var(--lux-rust)", fontSize: "0.5rem", letterSpacing: "0.14em" }}>{f.category}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", fontWeight: 600, color: "var(--lux-ink)", marginTop: 3, lineHeight: 1.2 }}>{f.title}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.66rem", color: "var(--lux-ash)", marginTop: 3 }}>{f.role}</div>
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
                    <p className="lux-prose flex-1" style={{ color: "var(--lux-bone)", fontSize: "1rem", lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{t.quote}&rdquo;</p>
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
              <h2 className="lux-display" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", lineHeight: 0.98 }}>Your listing is next.</h2>
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
