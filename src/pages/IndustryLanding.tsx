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
import { useCtaNavigation } from "@/hooks/useCtaNavigation";

type Slug =
  | "landscaping"
  | "pool-builders"
  | "kitchen-renovation"
  | "bathroom-renovation"
  | "outdoor-living"
  | "general-construction";

interface Content {
  trade: string;
  edition: string;
  heroTitleA: string;
  heroTitleB: string;
  heroItalic: string;
  heroSub: string;
  metaTitle: string;
  metaDesc: string;
  beforeA: string;
  afterA: string;
  beforeB: string;
  afterB: string;
  caption1: string;
  caption2: string;
  faq: { q: string; a: string }[];
  byline: string;
  heroImage: string;
}

const empty1 = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=2000&q=85&auto=format&fit=crop";
const empty2 = "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=2000&q=85&auto=format&fit=crop";
const empty3 = "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=2000&q=85&auto=format&fit=crop";

const CONTENT: Record<Slug, Content> = {
  "landscaping": {
    trade: "Landscaping",
    edition: "The Landscape Edition",
    heroTitleA: "Bare ground",
    heroTitleB: "to dream yard,",
    heroItalic: "in twelve seconds.",
    heroSub: "One photograph of your finished garden. A cinematic before-and-after film engineered for Reels and TikTok. No before photo required — the studio reconstructs it.",
    metaTitle: "Cinematic Films for Landscapers — The Vantage",
    metaDesc: "Turn your finished garden photos into scroll-stopping transformation films. Built for Australian and US landscapers. 50 free credits, no card.",
    beforeA: "https://images.unsplash.com/photo-1416664806563-bb6be3a02184?w=2000&q=85&auto=format&fit=crop",
    afterA: "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=2000&q=85&auto=format&fit=crop",
    beforeB: empty3,
    afterB: "https://images.unsplash.com/photo-1572297870735-d9b1d3eedf38?w=2000&q=85&auto=format&fit=crop",
    caption1: "FRONT YARD · 12-SECOND FILM",
    caption2: "BACKYARD POOL DECK · 14-SECOND FILM",
    byline: "A LANDSCAPE FILM · LARSEN GARDENS",
    heroImage: "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=2400&q=85&auto=format&fit=crop",
    faq: [
      { q: "Do I need a before photo of the garden?", a: "No. Submit your finished after frame — the studio reconstructs an overgrown-or-bare prior state that matches your exact site." },
      { q: "Does it work for hardscape jobs?", a: "Yes. Driveways, retaining walls, paving, turf, and planting beds all transform beautifully." },
      { q: "How fast do I receive the film?", a: "Average render time is 3 minutes 14 seconds. Studio plan subscribers see 90 seconds." },
    ],
  },
  "pool-builders": {
    trade: "Pool Building",
    edition: "The Pool Builder's Edition",
    heroTitleA: "An empty lot",
    heroTitleB: "to a backyard oasis,",
    heroItalic: "in a single frame.",
    heroSub: "One photograph of your finished pool becomes a cinematic reveal worth a $30k+ pipeline. No drone. No second crew. No videographer.",
    metaTitle: "Cinematic Films for Pool Builders — The Vantage",
    metaDesc: "Show the full magnitude of every pool build. One after photo becomes a 1080p transformation film in minutes. 50 free credits to start.",
    beforeA: empty3,
    afterA: "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=2000&q=85&auto=format&fit=crop",
    beforeB: empty1,
    afterB: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2000&q=85&auto=format&fit=crop",
    caption1: "INFINITY POOL · 12-SECOND FILM",
    caption2: "PLUNGE POOL & SPA · 14-SECOND FILM",
    byline: "A POOL FILM · MERIDIAN AQUATICS",
    heroImage: "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=2400&q=85&auto=format&fit=crop",
    faq: [
      { q: "Does it show the excavation?", a: "Yes. The studio reconstructs a bare-earth prior state and animates the build sequence between the two frames." },
      { q: "Indoor or infinity pools?", a: "Works for any finished pool with a clear photograph — infinity, plunge, lap, spa, and indoor." },
    ],
  },
  "kitchen-renovation": {
    trade: "Kitchen Renovation",
    edition: "The Renovator's Edition",
    heroTitleA: "Dated to delivered,",
    heroTitleB: "on camera —",
    heroItalic: "from one finished frame.",
    heroSub: "The studio reconstructs the dated prior state of your kitchen renovation from a single completed photograph. Every job becomes a Reels-native film.",
    metaTitle: "Cinematic Films for Kitchen Renovators — The Vantage",
    metaDesc: "Turn your finished kitchen photos into cinematic renovation reveals. No before photo needed. 50 free credits, no subscription.",
    beforeA: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=2000&q=85&auto=format&fit=crop",
    afterA: "https://images.unsplash.com/photo-1556909114-f6e9adcb302e?w=2000&q=85&auto=format&fit=crop",
    beforeB: empty2,
    afterB: "https://images.unsplash.com/photo-1556909001-f5648b8d2348?w=2000&q=85&auto=format&fit=crop",
    caption1: "PRE-WAR KITCHEN · 12-SECOND FILM",
    caption2: "GALLEY RENOVATION · 14-SECOND FILM",
    byline: "A RENOVATION FILM · WESTBROOK & CO.",
    heroImage: "https://images.unsplash.com/photo-1556909001-f5648b8d2348?w=2400&q=85&auto=format&fit=crop",
    faq: [
      { q: "Do I need a photo of the old kitchen?", a: "No. The studio reconstructs a plausible dated kitchen from your finished frame." },
      { q: "Will it match the actual cabinetry and layout?", a: "The after photograph anchors the camera angle and footprint. The reconstructed prior state matches the same space, in a deteriorated form." },
    ],
  },
  "bathroom-renovation": {
    trade: "Bathroom Renovation",
    edition: "The Tile & Stone Edition",
    heroTitleA: "The renovation",
    heroTitleB: "no one filmed —",
    heroItalic: "rendered in motion.",
    heroSub: "Show off your tiling, your stonework, your finishings. The studio turns one finished bathroom photograph into a film that closes booking inquiries.",
    metaTitle: "Cinematic Films for Bathroom Renovators — The Vantage",
    metaDesc: "Transform finished bathroom photos into viral renovation films. Built for renovators and tilers. 50 free credits.",
    beforeA: empty1,
    afterA: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=2000&q=85&auto=format&fit=crop",
    beforeB: empty2,
    afterB: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=2000&q=85&auto=format&fit=crop",
    caption1: "WET ROOM · 12-SECOND FILM",
    caption2: "PRIMARY ENSUITE · 14-SECOND FILM",
    byline: "A TILER'S FILM · STILLWATER STUDIO",
    heroImage: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=2400&q=85&auto=format&fit=crop",
    faq: [
      { q: "Wet rooms and ensuites?", a: "Yes — any finished bathroom with a clear, well-lit photograph works." },
      { q: "Tile-only jobs?", a: "Works beautifully. Regrouting, re-tiling, and waterproofing reveals all supported." },
    ],
  },
  "outdoor-living": {
    trade: "Outdoor Living",
    edition: "The Outdoor Edition",
    heroTitleA: "Decks, pergolas,",
    heroTitleB: "outdoor kitchens —",
    heroItalic: "rendered in motion.",
    heroSub: "One photograph of your finished build becomes a cinematic transformation film, ready for Reels, TikTok, and the algorithm.",
    metaTitle: "Cinematic Films for Outdoor Living Builds — The Vantage",
    metaDesc: "Decks, pergolas, outdoor kitchens, alfresco areas. One after photo, one cinematic film. 50 free credits, no subscription.",
    beforeA: empty3,
    afterA: "https://images.unsplash.com/photo-1572297870735-d9b1d3eedf38?w=2000&q=85&auto=format&fit=crop",
    beforeB: empty1,
    afterB: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2000&q=85&auto=format&fit=crop",
    caption1: "ALFRESCO PERGOLA · 12-SECOND FILM",
    caption2: "OUTDOOR KITCHEN · 14-SECOND FILM",
    byline: "AN OUTDOOR FILM · NORTH SHORE",
    heroImage: "https://images.unsplash.com/photo-1572297870735-d9b1d3eedf38?w=2400&q=85&auto=format&fit=crop",
    faq: [
      { q: "Alfresco and patio builds?", a: "Yes. Decks, pergolas, outdoor kitchens, cabanas, and fire pits — all supported." },
      { q: "Can I post straight to TikTok?", a: "Yes. All outputs are 1080×1920 vertical MP4, ready for TikTok, Reels, and Shorts." },
    ],
  },
  "general-construction": {
    trade: "General Construction",
    edition: "The Builder's Edition",
    heroTitleA: "The build story,",
    heroTitleB: "without filming",
    heroItalic: "the build.",
    heroSub: "For general contractors, builders, and developers. One after photograph per job becomes a Reels-ready film. No videographer required.",
    metaTitle: "Cinematic Films for Builders — The Vantage",
    metaDesc: "For general contractors, builders, and developers. One after photo per job becomes a social-ready transformation film. 50 free credits.",
    beforeA: empty3,
    afterA: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=2000&q=85&auto=format&fit=crop",
    beforeB: empty1,
    afterB: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=2000&q=85&auto=format&fit=crop",
    caption1: "EXTERIOR REBUILD · 14-SECOND FILM",
    caption2: "GREATROOM RENOVATION · 12-SECOND FILM",
    byline: "A BUILDER'S FILM · ATWOOD CONSTRUCTION",
    heroImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=2400&q=85&auto=format&fit=crop",
    faq: [
      { q: "Full home builds?", a: "Yes. New builds, knockdown-rebuilds, and full renovations are all supported." },
      { q: "Multiple trades?", a: "Yes. Submit any finished work — landscaping, builds, renovations, fitouts." },
    ],
  },
};

interface Props { slug: Slug; }

const IndustryLanding = ({ slug }: Props) => {
  const c = CONTENT[slug];
  const { destinationFor, isLoggedIn } = useCtaNavigation();
  const cta = destinationFor("create");
  const canonical = `https://thevantage.co/${slug}`;

  return (
    <>
      <Helmet>
        <title>{c.metaTitle}</title>
        <meta name="description" content={c.metaDesc} />
        <meta property="og:title" content={c.metaTitle} />
        <meta property="og:description" content={c.metaDesc} />
        <meta property="og:url" content={canonical} />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          <EditorialHero
            eyebrow={`A DOSSIER FOR ${c.trade.toUpperCase()}`}
            edition={c.edition}
            title={
              <>
                {c.heroTitleA}
                <br />
                {c.heroTitleB}
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>{c.heroItalic}</span>
              </>
            }
            subtitle={c.heroSub}
            primaryCta={{ label: isLoggedIn ? "ENTER THE STUDIO →" : "BEGIN FREE — 50 CREDITS →", to: cta }}
            secondaryCta={{ label: "VIEW THE REEL", to: "/gallery" }}
            rightImage={c.heroImage}
            byline={c.byline}
          />

          <Marquee
            items={[
              `TRUSTED BY ${c.trade.toUpperCase()} STUDIOS IN  ·  Boston`,
              "Los Angeles",
              "New York",
              "Austin",
              "Chicago",
              "Sydney",
              "Melbourne",
              "London",
            ]}
          />

          <section className="lux-section lux-bg-cream">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE METAMORPHOSIS"
                title="Drag the seam."
                italic={`See ${c.trade.toLowerCase()} in motion.`}
                align="center"
                className="mb-16"
              />
              <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                <BeforeAfterSlider before={c.beforeA} after={c.afterA} ratio="4/5" caption={c.caption1} />
                <BeforeAfterSlider before={c.beforeB} after={c.afterB} ratio="4/5" caption={c.caption2} />
              </div>
            </div>
          </section>

          <section className="lux-section lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="lux-container">
              <VideoReel
                eyebrow={`THE ${c.trade.toUpperCase()} REEL · REAL CUSTOMER OUTPUT`}
                title={`Recently delivered to ${c.trade.toLowerCase()} studios.`}
                clips={[
                  { src: "/videos/transform-1.mp4", label: "The Beacon Project", byline: "ATWOOD · MASS." },
                  { src: "/videos/transform-2.mp4", label: "Olive & 14th", byline: "MERIDIAN · LOS ANGELES" },
                  { src: "/videos/transform-3.mp4", label: "Cedar Crest Build", byline: "VANTAGE · NORTHEAST" },
                ]}
              />
            </div>
          </section>

          <section className="lux-section lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
                <SectionHeading
                  eyebrow="QUIET QUESTIONS"
                  title={`Asked by ${c.trade.toLowerCase()}s.`}
                  italic="Answered, plainly."
                />
              </div>
              <div className="lg:col-span-8">
                {c.faq.map((f, i) => (
                  <details key={i} className="group py-7" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
                    <summary className="flex items-baseline justify-between cursor-pointer list-none">
                      <span className="lux-display text-2xl md:text-3xl pr-8" style={{ letterSpacing: "-0.012em" }}>{f.q}</span>
                      <span className="lux-display-italic flex-shrink-0 transition-transform group-open:rotate-45" style={{ color: "var(--lux-rust)", fontSize: 32, lineHeight: 1 }}>+</span>
                    </summary>
                    <p className="lux-prose mt-5" style={{ maxWidth: 640 }}>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <StatStrip
            variant="cream"
            stats={[
              { value: "3 min", label: "AVG. RENDER" },
              { value: "1080p", label: "VERTICAL · 9:16" },
              { value: "50", label: "FREE CREDITS" },
              { value: "$0", label: "TO BEGIN" },
            ]}
          />

          <section className="lux-section relative overflow-hidden lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: `url(${c.heroImage})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(14,14,12,0.85), rgba(14,14,12,0.95))" }} />
            <div className="relative lux-container text-center py-32">
              <h2 className="lux-display" style={{ fontSize: "clamp(2.6rem, 6vw, 5.5rem)", lineHeight: 0.95, color: "var(--lux-bone)" }}>
                Begin with one
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-champagne)" }}>finished frame.</span>
              </h2>
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
                <Link to={cta} className="lux-btn lux-btn-bone">
                  {isLoggedIn ? "ENTER THE STUDIO →" : "BEGIN FREE — 50 CREDITS →"}
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

export default IndustryLanding;
